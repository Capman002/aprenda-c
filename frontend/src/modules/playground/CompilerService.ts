import type { ICompilerService, ExecutionResult } from "./types";

/**
 * CompilerService (Infrastructure Layer)
 * Isolates all HTTP/Network logic.
 * Knows about API endpoints, Validation, and Response parsing.
 */
export class CompilerService implements ICompilerService {
  private readonly API_BASE = "http://localhost:3000";

  async run(files: Map<string, string>): Promise<ExecutionResult> {
    // Prepara payload (Adapta Mapa interno -> Array da API)
    const payload = {
      files: Array.from(files.entries()).map(([name, content]) => ({
        name,
        content,
      })),
    };

    try {
      const response = await fetch(`${this.API_BASE}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      // Adapter: API Response -> Internal Domain Model
      return {
        success: data.success,
        timestamp: data.timestamp,
        stdout: data.run?.stdout || "",
        stderr: data.run?.stderr || "",
        exitCode: data.run?.exitCode,
        error: data.error,
      };
    } catch (error) {
      console.error("Compiler Service Error:", error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message
            : "Falha na comunicação com servidor",
      };
    }
  }

  async checkRuntime(): Promise<string> {
    try {
      const res = await fetch(`${this.API_BASE}/api/runtimes`);
      if (!res.ok) return "Offline";
      const runtimes = await res.json();
      const cRuntime = runtimes.find((r: any) => r.language === "c");
      return cRuntime ? `${cRuntime.version}` : "Unknown";
    } catch {
      return "Offline";
    }
  }
}
