from __future__ import annotations

from pathlib import Path


def test_register_repo_and_list(api_client, sample_git_repo) -> None:
    response = api_client.post("/repos", json={"path": sample_git_repo["path"]})
    assert response.status_code == 201

    body = response.json()
    assert body["name"] == "sample-repo"
    assert body["path"] == sample_git_repo["path"]

    list_response = api_client.get("/repos")
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1


def test_reject_non_git_directory(api_client, tmp_path: Path) -> None:
    non_git_dir = tmp_path / "not-a-repo"
    non_git_dir.mkdir()

    response = api_client.post("/repos", json={"path": str(non_git_dir)})
    assert response.status_code == 422
    assert response.json()["detail"] == "Path is not a git repository"
