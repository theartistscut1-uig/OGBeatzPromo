import { getFunctionUrl } from "./backendConfig";

export type MusicforgeData = {
  album_covers: unknown[];
  video_concepts: unknown[];
  social_posts: unknown[];
  keywords: unknown[];
  ai_chat: unknown[];
  assets: unknown[];
  connected_accounts: unknown[];
  updated_at?: string;
};

type ApiError = { error?: string };

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(getFunctionUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json() as T | ApiError;
  if (!response.ok) {
    const errorPayload = payload && typeof payload === "object" ? payload as ApiError : {};
    throw new Error(errorPayload.error || "Request failed.");
  }

  return payload as T;
}

export async function loadMusicforgeData() {
  return requestJson<MusicforgeData>("musicforge-data", {
    method: "GET",
  });
}

export async function saveMusicforgeData(payload: MusicforgeData) {
  return requestJson<{ ok: true }>("musicforge-data", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createBlobUpload(input: {
  container: string;
  folder: string;
  fileName: string;
  contentType: string;
}) {
  return requestJson<{
    blobPath: string;
    uploadUrl: string;
    blobUrl: string;
  }>("uploads/blob-sas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
