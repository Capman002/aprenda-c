import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";
import { systemRoutes } from "./routes/system";
import { compilerRoutes } from "./routes/compiler";

const PORT = parseInt(process.env.PORT ?? "3001");
const isProduction = process.env.NODE_ENV === "production";

const app = new Elysia()
  // Rate Limiting
  .use(
    rateLimit({
      duration: 60000,
      max: 100, // 100 req/min por IP (API apenas)
      errorResponse: "Rate limit exceeded. Calma lá, jovem!",
    }),
  )
  // CORS (em produção, Caddy já cuida, mas manter para dev)
  .use(
    cors({
      origin: isProduction
        ? true
        : [
            "http://localhost:4321",
            "http://localhost:3000",
            "http://localhost:4000",
          ],
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  // API Routes
  .use(systemRoutes)
  .use(compilerRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Aprenda C API running at http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV ?? "development"}`);
});
