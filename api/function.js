import { app } from "@azure/functions";
import { handleApiRequest } from "./requestRouter.js";

app.http("api", {
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "{*path}",
  handler: async (request) => {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.json().catch(() => ({}));
    const result = await handleApiRequest({
      method: request.method,
      url: request.url,
      body,
    });

    return {
      status: result.statusCode,
      headers: result.headers,
      body: result.body,
    };
  },
});
