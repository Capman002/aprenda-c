import { Elysia, t } from "elysia";
import { createJob, cleanupJob } from "../compiler/service";
import { join } from "path";
import { Subprocess } from "bun";

// Tipagem do estado da conexão WS
interface WSState {
  jobId?: string;
  tempDir?: string;
  process?: Subprocess;
}

export const wsRoutes = new Elysia({ prefix: "/api/ws" }).ws("/terminal", {
  body: t.Any(),

  async open(ws) {
    ws.data = { jobId: undefined, tempDir: undefined, process: undefined };
    console.log(`[WS] Cliente conectado: ${ws.id}`);
  },

  async message(ws, message: any) {
    const state = ws.data as WSState;

    // 1. Inicializar Job (Compilar e Rodar)
    if (message.type === "init") {
      try {
        const files = message.files;
        if (!files || !Array.isArray(files)) {
          ws.send({ type: "error", message: "Arquivos inválidos." });
          return;
        }

        // Criar Job isolado
        const { jobId, tempDir } = await createJob(files);
        state.jobId = jobId;
        state.tempDir = tempDir;

        // ── Fase 1: Compilação (silenciosa) ──
        const compileProc = Bun.spawn(
          [
            "gcc",
            "-Wall",
            "-Wextra",
            "-pthread",
            "-o",
            "app",
            ...files.map((f: any) => f.name.replace(/[^a-zA-Z0-9._-]/g, "")),
            "-lm",
          ],
          {
            cwd: tempDir,
            stdout: "pipe",
            stderr: "pipe",
          },
        );

        const compileExitCode = await compileProc.exited;

        // Captura stderr da compilação
        const compileStderr = await new Response(compileProc.stderr).text();

        // Se a compilação falhou, exibir os erros e parar
        if (compileExitCode !== 0) {
          ws.send({ type: "compile_error", data: compileStderr });
          ws.send({ type: "exit", code: 1 });
          await cleanupJob(tempDir);
          state.tempDir = undefined;
          return;
        }

        // ── Fase 2: Execução Interativa (limpa) ──
        // stdbuf força buffers zero para I/O imediato
        const execArgs: string[] = [];
        try {
          // Testa se stdbuf existe
          Bun.spawnSync(["which", "stdbuf"], { cwd: tempDir });
          execArgs.push("stdbuf", "-i0", "-o0", "-e0", "./app");
        } catch {
          execArgs.push("./app");
        }

        const proc = Bun.spawn(execArgs, {
          cwd: tempDir,
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, TERM: "dumb" }, // Sem cores ANSI extras do sistema
        });

        state.process = proc;

        // Stream stdout → WS
        readStream(proc.stdout, (chunk) => {
          ws.send({ type: "stdout", data: chunk });
        });

        // Stream stderr → WS (erros de runtime apenas)
        readStream(proc.stderr, (chunk) => {
          ws.send({ type: "stderr", data: chunk });
        });

        // Aguardar finalização
        proc.exited.then((code) => {
          ws.send({ type: "exit", code });
          cleanup(state);
        });
      } catch (err: any) {
        ws.send({ type: "error", message: err.message || "Erro interno." });
        cleanup(state);
      }
    }

    // 2. Input do Usuário (stdin)
    if (message.type === "stdin") {
      if (state.process && state.process.stdin) {
        state.process.stdin.write(message.data);
        state.process.stdin.flush();
      }
    }
  },

  async close(ws) {
    console.log(`[WS] Cliente desconectado: ${ws.id}`);
    cleanup(ws.data as WSState);
  },
});

// Helper para ler streams do Bun
async function readStream(
  stream: ReadableStream,
  callback: (chunk: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      callback(decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    // Ignore stream errors on close
  }
}

async function cleanup(state: WSState) {
  if (state.process) {
    state.process.kill();
    state.process = undefined;
  }
  if (state.tempDir) {
    await cleanupJob(state.tempDir);
    state.tempDir = undefined;
  }
}
