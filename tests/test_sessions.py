from __future__ import annotations


def register_repo(api_client, path: str) -> str:
    response = api_client.post("/repos", json={"path": path})
    assert response.status_code == 201
    return response.json()["id"]


def test_create_get_list_and_archive_session(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])

    create_response = api_client.post(
        "/sessions",
        json={
            "repo_id": repo_id,
            "head_ref": "feature/diff-comments",
            "path_filters": ["packages/pkg-a"],
        },
    )
    assert create_response.status_code == 201
    session = create_response.json()
    assert session["base_ref"] == "main"
    assert session["head_ref"] == "feature/diff-comments"
    assert session["path_filters"] == ["packages/pkg-a"]
    assert session["status"] == "active"

    get_response = api_client.get(f"/sessions/{session['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == session["id"]

    list_response = api_client.get("/sessions")
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    archive_response = api_client.post(f"/sessions/{session['id']}/archive")
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"


def test_archived_session_rejects_new_comments(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_response = api_client.post(
        "/sessions",
        json={"repo_id": repo_id, "head_ref": "feature/diff-comments"},
    )
    session_id = session_response.json()["id"]

    compare_response = api_client.post(f"/sessions/{session_id}/compare", json={})
    head_commit_sha = compare_response.json()["head"]["commit"]

    api_client.post(f"/sessions/{session_id}/archive")

    comment_response = api_client.post(
        f"/sessions/{session_id}/comments",
        json={
            "head_commit_sha": head_commit_sha,
            "file_path": "packages/pkg-a/service.py",
            "line_side": "new",
            "line_number": 2,
            "body": "This should be rejected after archive.",
        },
    )
    assert comment_response.status_code == 409
    assert comment_response.json()["detail"] == "Archived sessions are read-only"
