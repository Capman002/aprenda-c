import { Elysia, t } from "elysia";
import { executeCode, type ExecuteRequest } from "../compiler/service";

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

export const compilerRoutes = new Elysia({ prefix: "/api" }).post(
  "/execute",
  async ({ body, set, error }) => {
    try {
      const result = await executeCode(body as ExecuteRequest);
      if (!result.success && result.error === "Erro interno") {
        return error(500, { success: false, error: "Internal Server Error" });
      }
      return result;
    } catch (err: any) {
      console.error("[COMPILER ERROR]", err);
      return error(500, {
        success: false,
        error: "Internal Server Error",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
  {
    body: ExecuteRequestSchema,
  },
);
