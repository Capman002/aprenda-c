import { Elysia } from "elysia";
import { securitySetup } from "./setup";
import { systemRoutes } from "./routes/system";
import { compilerRoutes } from "./routes/compiler";
import { courseRoutes } from "./routes/course";
import { frontendServing } from "./middlewares/frontend";

const PORT = parseInt(process.env.PORT ?? "3000"); // Default para env var se existir

const app = new Elysia()
  // 1. Core & Security
  .use(securitySetup)

  // 2. Documentation (Removed)
  // .use(docsSetup)

  // 3. API Routes
  .use(systemRoutes)
  .use(compilerRoutes)
  .use(courseRoutes)

  // 4. Frontend Serving (Last Resort/Fallback)
  .use(frontendServing);

app.listen(PORT, () => {
  console.log(`🚀 Aprenda C API running at http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV ?? "development"}`);
});
