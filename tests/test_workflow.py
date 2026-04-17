from __future__ import annotations

from pathlib import Path


def test_full_api_workflow_and_agents_doc(api_client, sample_git_repo) -> None:
    repo_response = api_client.post("/repos", json={"path": sample_git_repo["path"]})
    assert repo_response.status_code == 201
    repo_id = repo_response.json()["id"]

    session_response = api_client.post(
        "/sessions",
        json={
            "repo_id": repo_id,
            "head_ref": "feature/diff-comments",
            "path_filters": ["packages/pkg-a", "apps/web"],
        },
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]

    compare_response = api_client.post(
        f"/sessions/{session_id}/compare",
        json={"head_commit": sample_git_repo["feature_first"]},
    )
    assert compare_response.status_code == 200
    compare_body = compare_response.json()
    assert compare_body["base"]["commit"] == sample_git_repo["main_tip"]
    assert compare_body["head"]["commit"] == sample_git_repo["feature_first"]

    comment_response = api_client.post(
        f"/sessions/{session_id}/comments",
        json={
            "head_commit_sha": compare_body["head"]["commit"],
            "base_commit_sha": compare_body["base"]["commit"],
            "file_path": "apps/web/app.js",
            "line_side": "new",
            "line_number": 1,
            "body": "Frontend should surface this console output change inline.",
        },
    )
    assert comment_response.status_code == 201

    comments_response = api_client.get(
        f"/sessions/{session_id}/comments",
        params={"head_commit_sha": compare_body["head"]["commit"]},
    )
    assert comments_response.status_code == 200
    assert comments_response.json()["items"][0]["file_path"] == "apps/web/app.js"

    agents_doc = Path("AGENTS.md").read_text(encoding="utf-8")
    assert "POST /sessions/{session_id}/compare" in agents_doc
    assert "head_commit_sha" in agents_doc
    assert "Archived sessions are read-only" in agents_doc
