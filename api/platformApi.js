async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error_description ||
      payload?.error ||
      payload?.raw ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getInstagramRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:8787/api/auth/instagram/callback";
}

export function buildInstagramLoginUrl() {
  const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || "";
  if (!clientId) {
    throw new Error("Missing required environment variable: META_APP_ID");
  }
  const redirectUri = getInstagramRedirectUri();
  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_messages",
  ].join(",");

  const url = new URL("https://www.facebook.com/v23.0/dialog/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

export async function exchangeInstagramCode(code) {
  const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || "";
  const clientSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || "";
  if (!clientId) {
    throw new Error("Missing required environment variable: META_APP_ID");
  }
  if (!clientSecret) {
    throw new Error("Missing required environment variable: META_APP_SECRET");
  }
  const redirectUri = getInstagramRedirectUri();

  const tokenUrl = new URL("https://graph.facebook.com/v23.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenPayload = await requestJson(tokenUrl);
  const accessToken = tokenPayload.access_token;
  if (!accessToken) {
    throw new Error("Meta did not return an access token.");
  }

  const pagesUrl = new URL("https://graph.facebook.com/v23.0/me/accounts");
  pagesUrl.searchParams.set("fields", "id,name,instagram_business_account{id,username,profile_picture_url}");
  pagesUrl.searchParams.set("access_token", accessToken);

  const pagesPayload = await requestJson(pagesUrl);
  const pages = Array.isArray(pagesPayload?.data) ? pagesPayload.data : [];
  const linkedPage = pages.find((page) => page.instagram_business_account?.id);

  if (!linkedPage?.instagram_business_account?.id) {
    throw new Error("No Instagram professional account linked to a Facebook Page was found for this login.");
  }

  const igAccount = linkedPage.instagram_business_account;
  const profileUrl = new URL(`https://graph.facebook.com/v23.0/${igAccount.id}`);
  profileUrl.searchParams.set("fields", "id,username,account_type,media_count,profile_picture_url");
  profileUrl.searchParams.set("access_token", accessToken);

  const mediaUrl = new URL(`https://graph.facebook.com/v23.0/${igAccount.id}/media`);
  mediaUrl.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  mediaUrl.searchParams.set("limit", "6");
  mediaUrl.searchParams.set("access_token", accessToken);

  const [profile, mediaPayload] = await Promise.all([
    requestJson(profileUrl),
    requestJson(mediaUrl),
  ]);

  return {
    accessToken,
    pageId: linkedPage.id,
    profile,
    media: Array.isArray(mediaPayload?.data) ? mediaPayload.data : [],
  };
}

export async function fetchInstagramAccount(accessToken) {
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,username,account_type,media_count");
  profileUrl.searchParams.set("access_token", accessToken);

  const mediaUrl = new URL("https://graph.instagram.com/me/media");
  mediaUrl.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  mediaUrl.searchParams.set("limit", "6");
  mediaUrl.searchParams.set("access_token", accessToken);

  const [profile, mediaPayload] = await Promise.all([
    requestJson(profileUrl),
    requestJson(mediaUrl),
  ]);

  return {
    profile,
    media: Array.isArray(mediaPayload?.data) ? mediaPayload.data : [],
  };
}

export async function publishInstagramMedia({ igUserId, accessToken, caption, imageUrl, videoUrl, mediaType }) {
  const createUrl = new URL(`https://graph.facebook.com/v23.0/${igUserId}/media`);
  createUrl.searchParams.set("access_token", accessToken);
  createUrl.searchParams.set("caption", caption || "");

  if (mediaType === "reel") {
    createUrl.searchParams.set("media_type", "REELS");
    createUrl.searchParams.set("video_url", videoUrl);
    createUrl.searchParams.set("share_to_feed", "true");
  } else {
    createUrl.searchParams.set("image_url", imageUrl);
  }

  const creation = await requestJson(createUrl, { method: "POST" });
  const publishUrl = new URL(`https://graph.facebook.com/v23.0/${igUserId}/media_publish`);
  publishUrl.searchParams.set("creation_id", creation.id);
  publishUrl.searchParams.set("access_token", accessToken);

  const published = await requestJson(publishUrl, { method: "POST" });

  return {
    creationId: creation.id,
    mediaId: published.id,
  };
}

export async function listInstagramConversations({ igUserId, accessToken }) {
  const url = new URL(`https://graph.facebook.com/v23.0/${igUserId}/conversations`);
  url.searchParams.set("platform", "instagram");
  url.searchParams.set(
    "fields",
    "id,updated_time,participants,messages.limit(10){id,from,created_time,message}"
  );
  url.searchParams.set("access_token", accessToken);

  const payload = await requestJson(url);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function sendInstagramMessage({ igUserId, accessToken, recipientId, text }) {
  const url = new URL(`https://graph.facebook.com/v23.0/${igUserId}/messages`);
  url.searchParams.set("access_token", accessToken);

  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
}

export async function listYouTubeComments({ accessToken, videoId }) {
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.searchParams.set("part", "snippet,replies");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("order", "time");
  url.searchParams.set("textFormat", "plainText");

  return requestJson(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function replyToYouTubeComment({ accessToken, parentId, text }) {
  const url = new URL("https://www.googleapis.com/youtube/v3/comments");
  url.searchParams.set("part", "snippet");

  return requestJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        parentId,
        textOriginal: text,
      },
    }),
  });
}

export async function uploadYouTubeVideo({ accessToken, title, description, tags, privacyStatus, videoUrl }) {
  const sourceResponse = await fetch(videoUrl);
  if (!sourceResponse.ok) {
    throw new Error("Could not fetch the video URL for YouTube upload.");
  }

  const fileBuffer = Buffer.from(await sourceResponse.arrayBuffer());
  const contentType = sourceResponse.headers.get("content-type") || "video/mp4";

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "10",
    },
    status: {
      privacyStatus,
    },
  };

  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fileBuffer.byteLength),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const payload = await parseJsonResponse(initResponse);
    const message = payload?.error?.message || payload?.error || "Failed to initialize YouTube upload.";
    throw new Error(message);
  }

  const uploadLocation = initResponse.headers.get("location");
  if (!uploadLocation) {
    throw new Error("YouTube upload session did not return a resumable upload URL.");
  }

  const uploadResponse = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.byteLength),
    },
    body: fileBuffer,
  });

  const payload = await parseJsonResponse(uploadResponse);
  if (!uploadResponse.ok) {
    const message = payload?.error?.message || payload?.error || "YouTube upload failed.";
    throw new Error(message);
  }

  return payload;
}
