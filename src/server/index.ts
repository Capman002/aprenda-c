import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";

// Helper para extrair IP do request
function getClientIP(headers: Record<string, string | undefined>): string {
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers["x-real-ip"] ?? "unknown";
}

import {
  executeCode,
  getRuntimes,
  type ExecuteRequest,
} from "./compiler/service";

const ExecuteRequestSchema = t.Object({
  files: t.Array(
    t.Object({
      name: t.String(),
      content: t.String(),
    }),
  ),
  stdin: t.Optional(t.String()),
  args: t.Optional(t.Array(t.String())),
});

const app = new Elysia()
  .use(
    cors({
      origin: [
        "http://localhost:4000",
        "http://localhost:4321",
        "http://localhost:3000",
      ],
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )

  .get("/", () => ({
    name: "Course API (Docker Runner)",
    version: "4.0.0",
    endpoints: {
      health: "/api/health",
      modules: "/api/modules",
      execute: "POST /api/execute",
      runtimes: "/api/runtimes",
    },
  }))

  .get("/api/health", () => ({
    status: "online",
    mode: "local-docker",
  }))

  .get("/api/runtimes", async () => {
    const runtimes = await getRuntimes();
    return {
      available: true,
      c: runtimes[0],
      allRuntimes: runtimes.length,
    };
  })

  .post(
    "/api/execute",
    async ({ body, set }) => {
      try {
        const result = await executeCode(body as ExecuteRequest);
        if (!result.success) {
          set.status = 500;
        }
        return result;
      } catch (err) {
        set.status = 500;
        return { success: false, error: "Internal Server Error" };
      }
    },
    {
      body: ExecuteRequestSchema,
    },
  )

  // ============ Course Modules ============
  .get("/api/modules", () => ({
    modules: [
      {
        id: "00",
        title: "História",
        path: "/historia",
        topicCount: 1,
      },
      {
        id: "01",
        title: "Fundamentos",
        path: "/fundamentos",
        topicCount: 4,
      },
      // ... keep existing modules ...
    ],
  }))

  .listen(3000);

console.log(
  `🚀 Orchestrator API running at http://localhost:${app.server?.port}`,
);
console.log(`📡 Endpoints:`);
console.log(`   - GET  /api/health`);
console.log(`   - GET  /api/modules`);
