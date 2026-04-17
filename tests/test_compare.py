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


def test_compare_branch_tips(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_id = create_session(api_client, repo_id)

    response = api_client.post(f"/sessions/{session_id}/compare", json={})
    assert response.status_code == 200

    body = response.json()
    assert body["base"]["ref"] == "main"
    assert body["head"]["ref"] == "feature/diff-comments"
    assert body["head"]["commit"] == sample_git_repo["feature_tip"]
    assert body["stats"]["files_changed"] == 3
    assert {file["new_path"] for file in body["files"]} == {
        "apps/web/app.js",
        "packages/pkg-a/notes.md",
        "packages/pkg-a/service.py",
    }


def test_compare_branch_to_commit_and_commit_to_commit(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_id = create_session(api_client, repo_id)

    branch_to_commit = api_client.post(
        f"/sessions/{session_id}/compare",
        json={"head_commit": sample_git_repo["feature_first"]},
    )
    assert branch_to_commit.status_code == 200
    branch_body = branch_to_commit.json()
    assert branch_body["head"]["commit"] == sample_git_repo["feature_first"]
    assert branch_body["stats"]["files_changed"] == 2

    commit_to_commit = api_client.post(
        f"/sessions/{session_id}/compare",
        json={
            "base_commit": sample_git_repo["main_tip"],
            "head_commit": sample_git_repo["feature_first"],
        },
    )
    assert commit_to_commit.status_code == 200
    commit_body = commit_to_commit.json()
    assert commit_body["base"]["commit"] == sample_git_repo["main_tip"]
    assert commit_body["head"]["commit"] == sample_git_repo["feature_first"]


def test_compare_rejects_commit_not_reachable_from_ref(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_id = create_session(api_client, repo_id)

    response = api_client.post(
        f"/sessions/{session_id}/compare",
        json={
            "head_ref": "feature/diff-comments",
            "head_commit": sample_git_repo["other_tip"],
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Commit is not reachable from the provided ref"


def test_compare_supports_path_filters(api_client, sample_git_repo) -> None:
    repo_id = register_repo(api_client, sample_git_repo["path"])
    session_id = create_session(api_client, repo_id)

    response = api_client.post(
        f"/sessions/{session_id}/compare",
        json={"path_filters": ["packages/pkg-a"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stats"]["files_changed"] == 2
    assert {file["new_path"] for file in body["files"]} == {
        "packages/pkg-a/notes.md",
        "packages/pkg-a/service.py",
    }
