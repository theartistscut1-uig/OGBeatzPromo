import {
  buildInstagramLoginUrl,
  exchangeInstagramCode,
  fetchInstagramAccount,
  listInstagramConversations,
  listYouTubeComments,
  publishInstagramMedia,
  replyToYouTubeComment,
  sendInstagramMessage,
  uploadYouTubeVideo,
} from "./platformApi.js";
import { createBlobUploadUrl, loadMusicforgeState, saveMusicforgeState } from "./azureServices.js";

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function redirectResponse(location) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
    },
    body: "",
  };
}

export async function handleApiRequest({ method, url, body }) {
  const requestUrl = new URL(url, "http://localhost");

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (method === "GET" && requestUrl.pathname === "/api/health") {
    return jsonResponse(200, { ok: true, service: "musicforge-api" });
  }

  if (method === "GET" && requestUrl.pathname === "/api/musicforge-data") {
    try {
      const data = await loadMusicforgeState();
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load app data.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "PUT" && requestUrl.pathname === "/api/musicforge-data") {
    try {
      const data = await saveMusicforgeState(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save app data.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/uploads/blob-sas") {
    try {
      const container = typeof body?.container === "string" ? body.container.trim() : "";
      const folder = typeof body?.folder === "string" ? body.folder.trim() : "";
      const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
      const contentType = typeof body?.contentType === "string" ? body.contentType.trim() : "application/octet-stream";

      if (!container || !folder || !fileName) {
        return jsonResponse(400, { error: "container, folder, and fileName are required." });
      }

      const upload = await createBlobUploadUrl({ container, folder, fileName, contentType });
      return jsonResponse(200, upload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to prepare blob upload.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "GET" && requestUrl.pathname === "/api/auth/instagram/start") {
    try {
      return redirectResponse(buildInstagramLoginUrl());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Instagram login.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "GET" && requestUrl.pathname === "/api/auth/instagram/callback") {
    const code = requestUrl.searchParams.get("code");
    const errorReason = requestUrl.searchParams.get("error_reason") || requestUrl.searchParams.get("error_description");

    if (errorReason) {
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_error", errorReason);
      return redirectResponse(frontendUrl.toString());
    }

    if (!code) {
      return jsonResponse(400, { error: "Missing Instagram authorization code." });
    }

    try {
      const payload = await exchangeInstagramCode(code);
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_oauth", Buffer.from(JSON.stringify(payload)).toString("base64url"));
      return redirectResponse(frontendUrl.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram login failed.";
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_error", message);
      return redirectResponse(frontendUrl.toString());
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/instagram/connect") {
    try {
      const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

      if (!accessToken) {
        return jsonResponse(400, { error: "Instagram access token is required." });
      }

      const data = await fetchInstagramAccount(accessToken);
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram request failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/instagram/publish") {
    try {
      const data = await publishInstagramMedia(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram publish failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/instagram/conversations") {
    try {
      const data = await listInstagramConversations(body || {});
      return jsonResponse(200, { data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram conversations request failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/instagram/messages/send") {
    try {
      const data = await sendInstagramMessage(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram send message failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/youtube/comments/list") {
    try {
      const data = await listYouTubeComments(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube comments request failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/youtube/comments/reply") {
    try {
      const data = await replyToYouTubeComment(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube comment reply failed.";
      return jsonResponse(500, { error: message });
    }
  }

  if (method === "POST" && requestUrl.pathname === "/api/youtube/upload") {
    try {
      const data = await uploadYouTubeVideo(body || {});
      return jsonResponse(200, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube upload failed.";
      return jsonResponse(500, { error: message });
    }
  }

  return jsonResponse(404, { error: "Not found." });
}
