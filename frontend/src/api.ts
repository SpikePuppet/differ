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
import type { IpcResult } from "../../electron/shared/ipc";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

function codeToStatus(code: string): number {
  switch (code) {
    case "NOT_FOUND": return 404;
    case "CONFLICT": return 409;
    case "VALIDATION": return 422;
    case "BAD_REQUEST": return 400;
    default: return 500;
  }
}

async function call<T>(channel: string, payload?: unknown): Promise<T> {
  const result = await window.electronAPI.invoke<IpcResult<T>>(channel, payload);
  if (!result.success) {
    throw new ApiError(
      result.error.message,
      codeToStatus(result.error.code),
      result.error,
    );
  }
  return result.data;
}

export const api = {
  repos: {
    list: () => call<Repo[]>("repos:list"),
    get: (id: string) => call<Repo>("repos:get", { id }),
    create: (path: string) => call<Repo>("repos:create", { path }),
    branches: (id: string) => call<{ branches: string[]; current: string }>("repos:branches", { id }),
  },
  sessions: {
    list: () => call<Session[]>("sessions:list"),
    get: (id: string) => call<Session>("sessions:get", { id }),
    create: (req: SessionCreateRequest) => call<Session>("sessions:create", req),
    archive: (id: string) => call<Session>("sessions:archive", { id }),
    compare: (id: string, overrides: CompareOverrides = {}) =>
      call<DiffResponse>("sessions:compare", { sessionId: id, overrides }),
  },
  comments: {
    list: (sessionId: string, params?: { head_commit_sha?: string; file_path?: string; status?: string }) =>
      call<Comment[]>("comments:list", { sessionId, ...params }),
    create: (sessionId: string, req: CommentCreateRequest) =>
      call<Comment>("comments:create", { sessionId, ...req }),
    update: (id: string, req: CommentUpdateRequest) =>
      call<Comment>("comments:update", { id, ...req }),
    resolve: (id: string) => call<Comment>("comments:resolve", { id }),
    reopen: (id: string) => call<Comment>("comments:reopen", { id }),
  },
  fs: {
    browse: (path?: string, showHidden = false) =>
      call<FsBrowseResponse>("fs:browse", { path, showHidden }),
  },
};
