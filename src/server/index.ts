import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";
import { systemRoutes } from "./routes/system";
import { compilerRoutes } from "./routes/compiler";
import { wsRoutes } from "./routes/ws";

const PORT = parseInt(process.env.PORT ?? "3000");
const isProduction = process.env.NODE_ENV === "production";

// Domínios permitidos para CORS
const allowedOrigins = isProduction
  ? [
      "https://aprendac.online",
      "https://www.aprendac.online",
      "https://aprenda-c.pages.dev", // Cloudflare Pages preview
    ]
  : ["http://localhost:4321", "http://localhost:3000", "http://localhost:4000"];

const app = new Elysia()
  // Rate Limiting (apenas para API do compilador)
  .use(
    rateLimit({
      duration: 60000,
      max: 30, // 30 execuções/min por IP (proteção contra abuse)
      errorResponse: JSON.stringify({
        success: false,
        error:
          "Rate limit exceeded. Aguarde um momento antes de compilar novamente.",
      }),
    }),
  )
  // CORS (necessário para requisições do frontend separado)
  .use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
    }),
  )
  // API Routes
  .use(systemRoutes)
  .use(compilerRoutes)
  .use(wsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Aprenda C API running at http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? "production" : "development"}`);
  console.log(`🔒 CORS origins: ${allowedOrigins.join(", ")}`);
});
