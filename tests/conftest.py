from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from differ_api.app import create_app


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        check=True,
        text=True,
    )
    return result.stdout.strip()


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


@pytest.fixture()
def sample_git_repo(tmp_path: Path) -> dict[str, str]:
    repo = tmp_path / "sample-repo"
    repo.mkdir()

    git(repo, "init", "-b", "main")
    git(repo, "config", "user.name", "Test User")
    git(repo, "config", "user.email", "test@example.com")
    git(repo, "config", "commit.gpgsign", "false")

    write(
        repo / "packages/pkg-a/service.py",
        "def greet():\n    return 'hello from main'\n",
    )
    write(repo / "packages/pkg-b/data.txt", "seed-data\n")
    write(repo / "apps/web/app.js", "console.log('main');\n")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Initial monorepo layout")

    write(
        repo / "packages/pkg-a/service.py",
        "def greet():\n    return 'hello from main'\n\n\ndef version():\n    return '1.0.0'\n",
    )
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Add package version")
    main_tip = git(repo, "rev-parse", "HEAD")

    git(repo, "checkout", "-b", "feature/diff-comments")
    write(
        repo / "packages/pkg-a/service.py",
        "def greet():\n    return 'hello from feature'\n\n\ndef version():\n    return '1.1.0'\n",
    )
    write(repo / "apps/web/app.js", "console.log('feature');\n")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Feature updates package and app")
    feature_first = git(repo, "rev-parse", "HEAD")

    write(
        repo / "packages/pkg-a/notes.md",
        "# Notes\n\nFeature branch context.\n",
    )
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Add feature notes")
    feature_tip = git(repo, "rev-parse", "HEAD")

    git(repo, "checkout", "main")
    git(repo, "checkout", "-b", "other/invalid-anchor")
    write(repo / "packages/pkg-b/data.txt", "seed-data\nother-branch-change\n")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Other branch change")
    other_tip = git(repo, "rev-parse", "HEAD")
    git(repo, "checkout", "main")

    return {
        "path": str(repo),
        "main_tip": main_tip,
        "feature_first": feature_first,
        "feature_tip": feature_tip,
        "other_tip": other_tip,
    }


@pytest.fixture()
def api_client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "test.db"
    app = create_app(database_url=f"sqlite:///{db_path}")
    with TestClient(app) as client:
        yield client
