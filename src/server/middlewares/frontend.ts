import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { join } from "path";
import { existsSync } from "fs";

const isProduction = process.env.NODE_ENV === "production";
const frontendDistPath = join(process.cwd(), "frontend/dist");

export const frontendServing = (app: Elysia) => {
  if (!isProduction || !existsSync(frontendDistPath)) {
    if (!isProduction)
      console.log(
        "🚧 Modo desenvolvimento: Frontend servido via Astro Dev Server (proxy ou separado).",
      );
    else console.error(`❌ Frontend build not found at: ${frontendDistPath}`);
    return app;
  }

  // Verificar arquivos (log inicial)
  try {
    // Usando dynamic import para fs se necessário, mas já importei lá em cima
    // Só para log
    console.log(`[INIT] Servindo arquivos estáticos de: ${frontendDistPath}`);
  } catch (e) {}

  return (
    app
      // Servir assets do Astro (_astro/*)
      .use(
        staticPlugin({
          assets: frontendDistPath,
          prefix: "",
          alwaysStatic: true,
          ignorePatterns: [/index\.html/],
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }),
      )
      // Fallback SPA / SSG de Alta Performance
      .get("*", async ({ path, set }) => {
        // 1. Assets (com extensão) que passaram pelo plugin
        if (path.includes(".") && !path.endsWith(".html")) {
          const assetPath = join(frontendDistPath, path);
          const file = Bun.file(assetPath);
          if (await file.exists()) {
            set.headers["Cache-Control"] =
              path.includes("/_astro/") || path.includes("/fonts/")
                ? "public, max-age=31536000, immutable"
                : "public, max-age=3600";
            return file;
          }
        }

        // 2. Resolução de Rotas (SSG)
        // Cache HTML: navegação instantânea + revalidação em background
        const htmlCacheControl =
          "public, max-age=60, stale-while-revalidate=3600";

        // /caminho/index.html
        let htmlFile = Bun.file(join(frontendDistPath, path, "index.html"));
        if (await htmlFile.exists()) {
          set.headers["Content-Type"] = "text/html";
          set.headers["Cache-Control"] = htmlCacheControl;
          return htmlFile;
        }

        // /caminho.html
        htmlFile = Bun.file(join(frontendDistPath, `${path}.html`));
        if (await htmlFile.exists()) {
          set.headers["Content-Type"] = "text/html";
          set.headers["Cache-Control"] = htmlCacheControl;
          return htmlFile;
        }

        // /caminho (se arquivo exato)
        htmlFile = Bun.file(join(frontendDistPath, path));
        if (
          (path.endsWith(".html") || !path.includes(".")) &&
          (await htmlFile.exists())
        ) {
          set.headers["Content-Type"] = "text/html";
          set.headers["Cache-Control"] = htmlCacheControl;
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
      })
  );
};
