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
    // CSP Relaxada para Debug - Permite 'unsafe-inline' e 'unsafe-eval' que o Astro pode precisar
    set.headers["Content-Security-Policy"] =
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:;";
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
      ignorePatterns: [/index\.html/], // Não servir index.html via estático automaticamente, deixar pro fallback
    }),
  );

  // Fallback inteligente para SSG (Astro) e SPA
  app.get("*", async ({ path, set }) => {
    // 1. Se tiver extensão, tenta servir direto (assets)
    if (path.includes(".") && !path.endsWith(".html")) {
      const assetPath = join(frontendDistPath, path);
      if (existsSync(assetPath)) return Bun.file(assetPath);
    }

    // 2. Tenta encontrar a página HTML correspondente (SSG)
    // Tenta: /caminho/index.html (Padrão Astro para subpastas)
    let potentialHtml = join(frontendDistPath, path, "index.html");
    if (existsSync(potentialHtml)) {
      set.headers["content-type"] = "text/html";
      return Bun.file(potentialHtml);
    }

    // Tenta: /caminho.html
    potentialHtml = join(frontendDistPath, `${path}.html`);
    if (existsSync(potentialHtml)) {
      set.headers["content-type"] = "text/html";
      return Bun.file(potentialHtml);
    }

    // Tenta: /caminho (se for arquivo exato html)
    potentialHtml = join(frontendDistPath, path);
    if (
      existsSync(potentialHtml) &&
      (path.endsWith(".html") || !path.includes("."))
    ) {
      set.headers["content-type"] = "text/html";
      return Bun.file(potentialHtml);
    }

    // 3. Fallback final (404 ou SPA root)
    // Se existir 404.html (gerado pelo Astro), usa ele
    const notFoundPath = join(frontendDistPath, "404.html");
    if (existsSync(notFoundPath)) {
      set.status = 404;
      set.headers["content-type"] = "text/html";
      return Bun.file(notFoundPath);
    }

    // Último recurso: index.html da raiz
    // Só use isso se tiver certeza que é SPA, senão pode causar loops estranhos em SSG
    // Para Astro SSG, melhor retornar 404 simples se não achou nada
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
