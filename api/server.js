import { createServer } from "node:http";
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

const PORT = Number(process.env.PORT || 8787);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Missing request URL." });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "musicforge-api" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/musicforge-data") {
    try {
      const data = await loadMusicforgeState();
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load app data.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "PUT" && url.pathname === "/api/musicforge-data") {
    try {
      const body = await readJsonBody(req);
      const data = await saveMusicforgeState(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save app data.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/uploads/blob-sas") {
    try {
      const body = await readJsonBody(req);
      const container = typeof body.container === "string" ? body.container.trim() : "";
      const folder = typeof body.folder === "string" ? body.folder.trim() : "";
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
      const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "application/octet-stream";

      if (!container || !folder || !fileName) {
        sendJson(res, 400, { error: "container, folder, and fileName are required." });
        return;
      }

      const upload = await createBlobUploadUrl({ container, folder, fileName, contentType });
      sendJson(res, 200, upload);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to prepare blob upload.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/auth/instagram/start") {
    try {
      sendRedirect(res, buildInstagramLoginUrl());
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Instagram login.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/auth/instagram/callback") {
    const code = url.searchParams.get("code");
    const errorReason = url.searchParams.get("error_reason") || url.searchParams.get("error_description");

    if (errorReason) {
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_error", errorReason);
      sendRedirect(res, frontendUrl.toString());
      return;
    }

    if (!code) {
      sendJson(res, 400, { error: "Missing Instagram authorization code." });
      return;
    }

    try {
      const payload = await exchangeInstagramCode(code);
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_oauth", Buffer.from(JSON.stringify(payload)).toString("base64url"));
      sendRedirect(res, frontendUrl.toString());
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram login failed.";
      const frontendUrl = new URL(process.env.APP_URL || "http://localhost:5173");
      frontendUrl.searchParams.set("instagram_error", message);
      sendRedirect(res, frontendUrl.toString());
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/instagram/connect") {
    try {
      const body = await readJsonBody(req);
      const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";

      if (!accessToken) {
        sendJson(res, 400, { error: "Instagram access token is required." });
        return;
      }

      const data = await fetchInstagramAccount(accessToken);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram request failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/instagram/publish") {
    try {
      const body = await readJsonBody(req);
      const data = await publishInstagramMedia(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram publish failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/instagram/conversations") {
    try {
      const body = await readJsonBody(req);
      const data = await listInstagramConversations(body);
      sendJson(res, 200, { data });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram conversations request failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/instagram/messages/send") {
    try {
      const body = await readJsonBody(req);
      const data = await sendInstagramMessage(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram send message failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/youtube/comments/list") {
    try {
      const body = await readJsonBody(req);
      const data = await listYouTubeComments(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube comments request failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/youtube/comments/reply") {
    try {
      const body = await readJsonBody(req);
      const data = await replyToYouTubeComment(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube comment reply failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/youtube/upload") {
    try {
      const body = await readJsonBody(req);
      const data = await uploadYouTubeVideo(body);
      sendJson(res, 200, data);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube upload failed.";
      sendJson(res, 500, { error: message });
      return;
    }
  }

  sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`MusicForge API listening on http://localhost:${PORT}`);
});
