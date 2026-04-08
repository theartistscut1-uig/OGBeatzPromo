import { getFunctionUrl } from "./backendConfig";

type ApiError = { error?: string };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(getFunctionUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json() as T | ApiError;
  if (!response.ok) {
    const errorPayload = payload && typeof payload === "object" ? payload as ApiError : {};
    throw new Error(errorPayload.error || "Request failed.");
  }

  return payload as T;
}

export type InstagramConversation = {
  id: string;
  updated_time?: string;
  participants?: {
    data?: Array<{ id: string; username?: string; name?: string }>;
  };
  messages?: {
    data?: Array<{
      id: string;
      created_time?: string;
      message?: string;
      from?: { id?: string; username?: string };
    }>;
  };
};

export type YouTubeCommentThread = {
  id: string;
  snippet?: {
    totalReplyCount?: number;
    topLevelComment?: {
      id?: string;
      snippet?: {
        authorDisplayName?: string;
        textDisplay?: string;
        publishedAt?: string;
      };
    };
  };
  replies?: {
    comments?: Array<{
      id: string;
      snippet?: {
        authorDisplayName?: string;
        textDisplay?: string;
        publishedAt?: string;
      };
    }>;
  };
};

export async function publishInstagram(input: {
  igUserId: string;
  accessToken: string;
  caption: string;
  mediaType: "image" | "reel";
  imageUrl?: string;
  videoUrl?: string;
}) {
  return postJson<{ creationId: string; mediaId: string }>("instagram-publish", input);
}

export async function fetchInstagramConversations(input: {
  igUserId: string;
  accessToken: string;
}) {
  return postJson<{ data: InstagramConversation[] }>("instagram-conversations", input);
}

export async function sendInstagramReply(input: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  text: string;
}) {
  return postJson<{ message_id?: string }>("instagram-message-send", input);
}

export async function fetchYouTubeComments(input: {
  accessToken: string;
  videoId: string;
}) {
  return postJson<{ items?: YouTubeCommentThread[] }>("youtube-comments-list", input);
}

export async function replyYouTubeComment(input: {
  accessToken: string;
  parentId: string;
  text: string;
}) {
  return postJson<{ id?: string }>("youtube-comments-reply", input);
}

export async function uploadYouTube(input: {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  videoUrl: string;
}) {
  return postJson<{ id?: string }>("youtube-upload", input);
}

export async function uploadYouTubeDirect(input: {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  file: File;
}) {
  const metadata = {
    snippet: {
      title: input.title,
      description: input.description,
      tags: input.tags,
      categoryId: "10",
    },
    status: {
      privacyStatus: input.privacyStatus,
    },
  };

  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(input.file.size),
      "X-Upload-Content-Type": input.file.type || "video/mp4",
    },
    body: JSON.stringify(metadata),
  });

  const initText = await initResponse.text();
  let initPayload: unknown = {};
  try {
    initPayload = initText ? JSON.parse(initText) : {};
  } catch {
    initPayload = { raw: initText };
  }

  if (!initResponse.ok) {
    const message =
      (initPayload as any)?.error?.message ||
      (initPayload as any)?.error ||
      (initPayload as any)?.raw ||
      "Failed to initialize YouTube upload.";
    throw new Error(message);
  }

  const uploadLocation = initResponse.headers.get("location");
  if (!uploadLocation) {
    throw new Error("YouTube upload session did not return a resumable upload URL.");
  }

  const uploadResponse = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Type": input.file.type || "video/mp4",
      "Content-Length": String(input.file.size),
    },
    body: input.file,
  });

  const uploadText = await uploadResponse.text();
  let uploadPayload: unknown = {};
  try {
    uploadPayload = uploadText ? JSON.parse(uploadText) : {};
  } catch {
    uploadPayload = { raw: uploadText };
  }

  if (!uploadResponse.ok) {
    const message =
      (uploadPayload as any)?.error?.message ||
      (uploadPayload as any)?.error ||
      (uploadPayload as any)?.raw ||
      "YouTube upload failed.";
    throw new Error(message);
  }

  return uploadPayload as { id?: string };
}
