from __future__ import annotations


def register_repo(api_client, path: str) -> str:
    response = api_client.post("/repos", json={"path": path})
    return response.json()["id"]


def create_session(api_client, repo_id: str) -> str:
    response = api_client.post(
        "/sessions",
        json={"repo_id": repo_id, "head_ref": "feature/diff-comments"},
    )
    return response.json()["id"]


def resolve_head_commit(api_client, session_id: str) -> str:
    response = api_client.post(f"/sessions/{session_id}/compare", json={})
    return response.json()["head"]["commit"]


def test_comment_lifecycle_and_compare_echo(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_id = create_session(api_client, repo_id)
    head_commit_sha = resolve_head_commit(api_client, session_id)

    create_response = api_client.post(
        f"/sessions/{session_id}/comments",
        json={
            "head_commit_sha": head_commit_sha,
            "file_path": "packages/pkg-a/service.py",
            "line_side": "new",
            "line_number": 2,
            "body": "Consider whether this greeting should be configurable.",
        },
    )
    assert create_response.status_code == 201
    comment = create_response.json()
    assert comment["status"] == "open"

    list_response = api_client.get(
        f"/sessions/{session_id}/comments",
        params={"head_commit_sha": head_commit_sha},
    )
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    update_response = api_client.patch(
        f"/comments/{comment['id']}",
        json={"body": "Consider making this greeting configurable."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["body"] == "Consider making this greeting configurable."

    resolve_response = api_client.post(f"/comments/{comment['id']}/resolve")
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "resolved"

    reopen_response = api_client.post(f"/comments/{comment['id']}/reopen")
    assert reopen_response.status_code == 200
    assert reopen_response.json()["status"] == "open"

    compare_response = api_client.post(f"/sessions/{session_id}/compare", json={})
    assert compare_response.status_code == 200
    compare_body = compare_response.json()
    assert len(compare_body["comments"]) == 1
    assert compare_body["comments"][0]["id"] == comment["id"]
