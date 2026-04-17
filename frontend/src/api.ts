import type {
  Comment,
  CommentCreateRequest,
  CommentUpdateRequest,
  CompareOverrides,
  DiffResponse,
  FsBrowseResponse,
  Repo,
  Session,
  SessionCreateRequest,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* body not json */
    }
    const message =
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : res.statusText) || `Request failed with ${res.status}`;
    throw new ApiError(message, res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  repos: {
    list: () =>
      call<{ items: Repo[] }>("/repos").then((r) => r.items),
    get: (id: string) => call<Repo>(`/repos/${id}`),
    create: (path: string) =>
      call<Repo>("/repos", {
        method: "POST",
        body: JSON.stringify({ path }),
      }),
  },
  sessions: {
    list: () =>
      call<{ items: Session[] }>("/sessions").then((r) => r.items),
    get: (id: string) => call<Session>(`/sessions/${id}`),
    create: (req: SessionCreateRequest) =>
      call<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify(req),
      }),
    archive: (id: string) =>
      call<Session>(`/sessions/${id}/archive`, { method: "POST" }),
    compare: (id: string, overrides: CompareOverrides = {}) =>
      call<DiffResponse>(`/sessions/${id}/compare`, {
        method: "POST",
        body: JSON.stringify(overrides),
      }),
  },
  comments: {
    list: (sessionId: string, params?: { head_commit_sha?: string; file_path?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.head_commit_sha) q.set("head_commit_sha", params.head_commit_sha);
      if (params?.file_path) q.set("file_path", params.file_path);
      if (params?.status) q.set("status", params.status);
      const suffix = q.toString() ? `?${q.toString()}` : "";
      return call<{ items: Comment[] }>(`/sessions/${sessionId}/comments${suffix}`).then(
        (r) => r.items,
      );
    },
    create: (sessionId: string, req: CommentCreateRequest) =>
      call<Comment>(`/sessions/${sessionId}/comments`, {
        method: "POST",
        body: JSON.stringify(req),
      }),
    update: (id: string, req: CommentUpdateRequest) =>
      call<Comment>(`/comments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(req),
      }),
    resolve: (id: string) =>
      call<Comment>(`/comments/${id}/resolve`, { method: "POST" }),
    reopen: (id: string) =>
      call<Comment>(`/comments/${id}/reopen`, { method: "POST" }),
  },
  fs: {
    browse: (path?: string, showHidden = false) => {
      const q = new URLSearchParams();
      if (path) q.set("path", path);
      if (showHidden) q.set("show_hidden", "true");
      const suffix = q.toString() ? `?${q.toString()}` : "";
      return call<FsBrowseResponse>(`/fs/browse${suffix}`);
    },
  },
};
