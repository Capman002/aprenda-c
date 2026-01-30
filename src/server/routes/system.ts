import { Elysia } from "elysia";
import { getRuntimes } from "../compiler/service";

export const systemRoutes = new Elysia({ prefix: "/api" })
  .get("/health", () => ({
    status: "online",
    mode: "local-docker",
    timestamp: new Date().toISOString(),
  }))
  .get("/runtimes", async () => {
    const runtimes = await getRuntimes();
    return {
      available: true,
      c: runtimes[0],
      allRuntimes: runtimes.length,
    };
  });
