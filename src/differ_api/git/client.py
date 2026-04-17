from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path
import re

from differ_api.services.errors import ValidationError

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$")


class GitClient:
    def validate_repo(self, path: str) -> str:
        repo_path = Path(path).expanduser().resolve()
        if not repo_path.exists() or not repo_path.is_dir():
            raise ValidationError("Path does not exist")
        result = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0 or result.stdout.strip() != "true":
            raise ValidationError("Path is not a git repository")
        return str(repo_path)

    def ensure_ref_exists(self, repo_path: str, ref: str) -> None:
        self._run(Path(repo_path), "rev-parse", "--verify", ref)

    def resolve_revision(
        self,
        repo_path: str,
        *,
        ref: str | None = None,
        commit: str | None = None,
    ) -> str:
        repo = Path(repo_path)
        if not ref and not commit:
            raise ValidationError("Either a ref or commit must be provided")

        resolved_commit: str
        if commit:
            resolved_commit = self._run(repo, "rev-parse", commit)
            self._run(repo, "cat-file", "-e", f"{resolved_commit}^{{commit}}")
            if ref and not self.is_commit_reachable(repo_path, resolved_commit, ref):
                raise ValidationError("Commit is not reachable from the provided ref")
            return resolved_commit

        return self._run(repo, "rev-parse", ref or "")

    def is_commit_reachable(self, repo_path: str, commit: str, ref: str) -> bool:
        repo = Path(repo_path)
        result = subprocess.run(
            ["git", "merge-base", "--is-ancestor", commit, ref],
            cwd=repo,
            capture_output=True,
            text=True,
        )
        return result.returncode == 0

    def get_commit_summary(self, repo_path: str, commit: str, ref: str | None) -> dict:
        output = self._run(
            Path(repo_path),
            "show",
            "-s",
            "--format=%H%x1f%an%x1f%ae%x1f%at%x1f%s",
            commit,
        )
        commit_sha, author_name, author_email, authored_at, subject = output.split("\x1f")
        return {
            "ref": ref,
            "commit": commit_sha,
            "author_name": author_name,
            "author_email": author_email,
            "authored_at": datetime.fromtimestamp(int(authored_at), tz=timezone.utc),
            "subject": subject,
        }

    def diff(
        self,
        repo_path: str,
        *,
        base_commit: str,
        head_commit: str,
        path_filters: list[str],
    ) -> dict:
        repo = Path(repo_path)
        command = [
            "diff",
            "--patch",
            "--find-renames",
            "--unified=3",
            "--no-color",
            base_commit,
            head_commit,
        ]
        if path_filters:
            command.extend(["--", *path_filters])

        patch = self._run(repo, *command, allow_empty=True)
        files = self._parse_patch(patch)
        additions = sum(file["additions"] for file in files)
        deletions = sum(file["deletions"] for file in files)
        return {
            "stats": {
                "files_changed": len(files),
                "additions": additions,
                "deletions": deletions,
            },
            "files": files,
        }

    def _parse_patch(self, patch: str) -> list[dict]:
        if not patch.strip():
            return []

        files: list[dict] = []
        current_file: dict | None = None
        current_hunk: dict | None = None
        old_line_no = 0
        new_line_no = 0

        for raw_line in patch.splitlines():
            if raw_line.startswith("diff --git "):
                if current_hunk is not None and current_file is not None:
                    current_file["hunks"].append(current_hunk)
                    current_hunk = None
                if current_file is not None:
                    files.append(current_file)
                parts = raw_line.split()
                old_path = parts[2][2:]
                new_path = parts[3][2:]
                current_file = {
                    "old_path": old_path,
                    "new_path": new_path,
                    "change_type": "modified",
                    "additions": 0,
                    "deletions": 0,
                    "hunks": [],
                }
                continue

            if current_file is None:
                continue

            if raw_line.startswith("new file mode "):
                current_file["change_type"] = "added"
                continue

            if raw_line.startswith("deleted file mode "):
                current_file["change_type"] = "deleted"
                continue

            if raw_line.startswith("rename from "):
                current_file["change_type"] = "renamed"
                current_file["old_path"] = raw_line.removeprefix("rename from ")
                continue

            if raw_line.startswith("rename to "):
                current_file["new_path"] = raw_line.removeprefix("rename to ")
                continue

            if raw_line.startswith("@@"):
                if current_hunk is not None:
                    current_file["hunks"].append(current_hunk)
                match = HUNK_RE.match(raw_line)
                if not match:
                    raise ValidationError("Unable to parse git hunk output")
                old_start, old_lines, new_start, new_lines, header = match.groups()
                current_hunk = {
                    "old_start": int(old_start),
                    "old_lines": int(old_lines or "1"),
                    "new_start": int(new_start),
                    "new_lines": int(new_lines or "1"),
                    "header": header.strip(),
                    "lines": [],
                }
                old_line_no = int(old_start)
                new_line_no = int(new_start)
                continue

            if raw_line.startswith("\\ No newline at end of file"):
                continue

            if current_hunk is None:
                continue

            if raw_line.startswith("+"):
                current_hunk["lines"].append(
                    {
                        "kind": "add",
                        "content": raw_line[1:],
                        "old_line": None,
                        "new_line": new_line_no,
                    }
                )
                current_file["additions"] += 1
                new_line_no += 1
                continue

            if raw_line.startswith("-"):
                current_hunk["lines"].append(
                    {
                        "kind": "delete",
                        "content": raw_line[1:],
                        "old_line": old_line_no,
                        "new_line": None,
                    }
                )
                current_file["deletions"] += 1
                old_line_no += 1
                continue

            if raw_line.startswith(" "):
                current_hunk["lines"].append(
                    {
                        "kind": "context",
                        "content": raw_line[1:],
                        "old_line": old_line_no,
                        "new_line": new_line_no,
                    }
                )
                old_line_no += 1
                new_line_no += 1

        if current_hunk is not None and current_file is not None:
            current_file["hunks"].append(current_hunk)
        if current_file is not None:
            files.append(current_file)
        return files

    def _run(self, repo_path: Path, *args: str, allow_empty: bool = False) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise ValidationError(result.stderr.strip() or "Git command failed")
        output = result.stdout.strip("\n")
        if not output and not allow_empty:
            return ""
        return output
