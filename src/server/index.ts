import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { existsSync } from "fs";
import { join } from "path";

const isProduction = process.env.NODE_ENV === "production";
const PORT = parseInt(process.env.PORT ?? "3000");

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

// Configurar CORS baseado no ambiente
const corsOrigins = isProduction
  ? true // Aceita qualquer origem em produção (ou configure seu domínio)
  : ["http://localhost:4000", "http://localhost:4321", "http://localhost:3000"];

const app = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  // Headers de Segurança (Helmet-style)
  .onRequest(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "SAMEORIGIN";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    // CSP Básico - Ajuste conforme necessidade (permite imagens externas, scripts do mesmo domínio/cdn comum)
    set.headers["Content-Security-Policy"] =
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";
  })

  // Informações da API movidas para /api para liberar a raiz para o frontend
  .get("/api", () => ({
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
    ],
  }));

// Em produção, servir arquivos estáticos do frontend
const frontendDistPath = join(process.cwd(), "frontend/dist");

if (isProduction && existsSync(frontendDistPath)) {
  app.use(
    staticPlugin({
      assets: frontendDistPath,
      prefix: "/",
      alwaysStatic: false,
    }),
  );

  // Fallback para SPA - retorna index.html para rotas não encontradas
  app.get("*", async ({ set }) => {
    set.headers["content-type"] = "text/html";
    const indexPath = join(frontendDistPath, "index.html");
    return new Response(await Bun.file(indexPath).text(), {
      headers: { "content-type": "text/html" },
    });
  });

  console.log(`📁 Serving static files from: ${frontendDistPath}`);
}

app.listen(PORT);

console.log(`🚀 Aprenda C API running at http://localhost:${PORT}`);
console.log(`🌍 Environment: ${isProduction ? "production" : "development"}`);
console.log(`📡 Endpoints:`);
console.log(`   - GET  /api/health`);
console.log(`   - GET  /api/runtimes`);
console.log(`   - POST /api/execute`);
if (isProduction) {
  console.log(`   - GET  /* (static files)`);
}
