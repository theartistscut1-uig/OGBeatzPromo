import "./loadEnv.js";
import { createServer } from "node:http";
import { handleApiRequest } from "./requestRouter.js";

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

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readJsonBody(req);
  const result = await handleApiRequest({
    method: req.method || "GET",
    url: req.url,
    body,
  });

  res.writeHead(result.statusCode, {
    ...(result.headers || {}),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(result.body);
});

server.listen(PORT, () => {
  console.log(`MusicForge API listening on http://localhost:${PORT}`);
});
