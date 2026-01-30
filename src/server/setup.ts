import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

export const securitySetup = (app: Elysia) => {
  // Configuração de CORS
  const corsOrigins = isProduction
    ? true
    : [
        "http://localhost:4321",
        "http://localhost:3000",
        "http://localhost:5173",
      ];

  return app
    .use(
      rateLimit({
        duration: 60000, // 1 minuto
        max: 60, // 60 requests por IP por minuto (1/seg)
        errorResponse: "Rate limit exceeded. Calma lá, jovem!",
      }),
    )
    .use(
      cors({
        origin: corsOrigins,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
      }),
    )
    .onRequest(({ set }) => {
      // Headers de Segurança (Helmet-style)
      set.headers["X-Content-Type-Options"] = "nosniff";
      set.headers["X-Frame-Options"] = "SAMEORIGIN";
      set.headers["X-XSS-Protection"] = "1; mode=block";
      set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

      // CSP Ajustado
      set.headers["Content-Security-Policy"] = [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "connect-src 'self' https: http://localhost:* ws://localhost:*",
        "worker-src 'self' blob:",
      ].join("; ");
    });
};
