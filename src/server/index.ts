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
    // CSP Ajustado para Fontes e Performance (Data URIs e Blobs necessários para fontes modernas)
    set.headers["Content-Security-Policy"] =
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;";
  })

  // Debug Middleware
  .onRequest(({ request }) => {
    console.log(`[REQ] ${request.method} ${request.url}`);
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

console.log(`[INIT] Verificando arquivos estáticos em: ${frontendDistPath}`);
if (isProduction && existsSync(frontendDistPath)) {
  try {
    const { readdirSync } = await import("fs");
    const files = readdirSync(frontendDistPath);
    console.log(
      `[INIT] Arquivos encontrados (${files.length}):`,
      files.slice(0, 5),
    );
  } catch (e) {
    console.error("[INIT] Erro ao listar arquivos:", e);
  }

  // Servir assets do Astro (_astro/*)
  app.use(
    staticPlugin({
      assets: frontendDistPath,
      prefix: "", // No prefixo para servir na raiz
      alwaysStatic: true, // Forçar modo estático
      ignorePatterns: [/index\.html/], // Não servir index.html via estático automaticamente
      headers: {
        // Cache agressivo para assets buildados (geralmente hash-based)
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }),
  );

  // Fallback Assíncrono de Alta Performance
  app.get("*", async ({ path, set }) => {
    // 1. Assets (com extensão) que passaram pelo plugin
    if (path.includes(".") && !path.endsWith(".html")) {
      const assetPath = join(frontendDistPath, path);
      const file = Bun.file(assetPath);

      // Check assíncrono (não bloqueia o event loop)
      if (await file.exists()) {
        if (path.includes("/_astro/") || path.includes("/fonts/")) {
          set.headers["Cache-Control"] = "public, max-age=31536000, immutable";
        } else {
          set.headers["Cache-Control"] = "public, max-age=3600";
        }
        return file;
      }
    }

    // 2. Resolução de Rotas (SSG) - Non-blocking
    // Prioridade: /caminho/index.html -> /caminho.html -> /caminho

    // Tenta: /caminho/index.html
    let htmlFile = Bun.file(join(frontendDistPath, path, "index.html"));
    if (await htmlFile.exists()) {
      set.headers["Content-Type"] = "text/html";
      return htmlFile;
    }

    // Tenta: /caminho.html
    htmlFile = Bun.file(join(frontendDistPath, `${path}.html`));
    if (await htmlFile.exists()) {
      set.headers["Content-Type"] = "text/html";
      return htmlFile;
    }

    // Tenta: /caminho (se for arquivo exato html)
    htmlFile = Bun.file(join(frontendDistPath, path));
    if (
      (path.endsWith(".html") || !path.includes(".")) &&
      (await htmlFile.exists())
    ) {
      set.headers["Content-Type"] = "text/html";
      return htmlFile;
    }

    // 3. Fallback 404
    const notFound = Bun.file(join(frontendDistPath, "404.html"));
    if (await notFound.exists()) {
      set.status = 404;
      set.headers["Content-Type"] = "text/html";
      return notFound;
    }

    set.status = 404;
    return "Página não encontrada (404)";
  });

  console.log(`📁 Static files enabled from: ${frontendDistPath}`);
} else {
  console.error(`❌ Frontend build not found at: ${frontendDistPath}`);
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
