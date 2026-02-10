import { Elysia, t } from "elysia";
import { createJob, cleanupJob } from "../compiler/service";
import { Subprocess } from "bun";

const EXECUTION_TIMEOUT_MS = 15_000; // 15s máximo por execução

// Tipagem do estado da conexão WS
interface WSState {
  jobId?: string;
  tempDir?: string;
  process?: Subprocess;
  timeoutId?: ReturnType<typeof setTimeout>;
}

// Validação de segurança (mesma do CompilerService)
function validateSecurity(code: string): string | null {
  const forbidden = [
    { pattern: /system\s*\(/, reason: "Chamada de sistema (system) proibida." },
    { pattern: /fork\s*\(/, reason: "Criação de processos (fork) proibida." },
    {
      pattern: /exec(l|lp|le|v|vp|vpe)?\s*\(/,
      reason: "Execução de binários proibida.",
    },
    { pattern: /popen\s*\(/, reason: "Pipes de comando proibidos." },
    {
      pattern: /<sys\/socket\.h>/,
      reason: "Acesso à rede (sockets) bloqueado.",
    },
    { pattern: /<netinet\/in\.h>/, reason: "Acesso à rede bloqueado." },
  ];

  for (const rule of forbidden) {
    if (rule.pattern.test(code)) {
      return rule.reason;
    }
  }
  return null;
}

export const wsRoutes = new Elysia({ prefix: "/api/ws" }).ws("/terminal", {
  body: t.Any(),

  async open(ws) {
    ws.data = {
      jobId: undefined,
      tempDir: undefined,
      process: undefined,
      timeoutId: undefined,
    };
    console.log(`[WS] Cliente conectado: ${ws.id}`);
  },

  async message(ws, message: any) {
    const state = ws.data as WSState;

    // ─── 1. Inicializar Job ───
    if (message.type === "init") {
      try {
        const files = message.files;
        if (!files || !Array.isArray(files)) {
          ws.send(
            JSON.stringify({ type: "error", message: "Arquivos inválidos." }),
          );
          return;
        }

        // Validação de segurança em todos os arquivos
        for (const file of files) {
          const secError = validateSecurity(file.content || "");
          if (secError) {
            ws.send(
              JSON.stringify({
                type: "compile_error",
                data: `[Segurança] ${secError}\nEste ambiente é sandbox para fins educativos.`,
              }),
            );
            ws.send(JSON.stringify({ type: "exit", code: 126 }));
            return;
          }
        }

        // Criar Job isolado
        const { jobId, tempDir } = await createJob(files);
        state.jobId = jobId;
        state.tempDir = tempDir;

        // ── Fase 1: Compilação silenciosa ──
        // Filtra apenas .c para compilação (ignora .h — usado via #include)
        const cFiles = files
          .map((f: any) => f.name.replace(/[^a-zA-Z0-9._-]/g, ""))
          .filter((name: string) => name.endsWith(".c"));

        if (cFiles.length === 0) {
          ws.send(
            JSON.stringify({
              type: "compile_error",
              data: "Nenhum arquivo .c encontrado para compilar.",
            }),
          );
          ws.send(JSON.stringify({ type: "exit", code: 1 }));
          await cleanupJob(tempDir);
          state.tempDir = undefined;
          return;
        }

        const compileProc = Bun.spawn(
          [
            "gcc",
            "-Wall",
            "-Wextra",
            "-pthread",
            "-o",
            "app",
            ...cFiles,
            "-lm",
          ],
          {
            cwd: tempDir,
            stdout: "pipe",
            stderr: "pipe",
          },
        );

        const compileExitCode = await compileProc.exited;
        const compileStderr = await new Response(compileProc.stderr).text();

        if (compileExitCode !== 0) {
          ws.send(
            JSON.stringify({ type: "compile_error", data: compileStderr }),
          );
          ws.send(JSON.stringify({ type: "exit", code: 1 }));
          await cleanupJob(tempDir);
          state.tempDir = undefined;
          return;
        }

        // ── Fase 2: Execução Interativa ──
        // Detecta stdbuf corretamente
        const stdbufCheck = Bun.spawnSync(["which", "stdbuf"], {
          cwd: tempDir,
        });
        const hasStdbuf = stdbufCheck.exitCode === 0;

        const execArgs = hasStdbuf
          ? ["stdbuf", "-i0", "-o0", "-e0", "./app"]
          : ["./app"];

        const proc = Bun.spawn(execArgs, {
          cwd: tempDir,
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, TERM: "dumb" },
        });

        state.process = proc;

        // Timeout: mata o processo se exceder o limite
        state.timeoutId = setTimeout(() => {
          if (state.process) {
            state.process.kill();
            ws.send(
              JSON.stringify({
                type: "stderr",
                data: "\n[Timeout] O programa excedeu o limite de tempo e foi encerrado.\n",
              }),
            );
            ws.send(JSON.stringify({ type: "exit", code: 124 }));
            cleanup(state);
          }
        }, EXECUTION_TIMEOUT_MS);

        // Stream stdout → WS
        readStream(proc.stdout, (chunk) => {
          ws.send(JSON.stringify({ type: "stdout", data: chunk }));
        });

        // Stream stderr → WS (erros de runtime)
        readStream(proc.stderr, (chunk) => {
          ws.send(JSON.stringify({ type: "stderr", data: chunk }));
        });

        // Aguardar finalização
        proc.exited.then((code) => {
          if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = undefined;
          }
          ws.send(JSON.stringify({ type: "exit", code }));
          cleanup(state);
        });
      } catch (err: any) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: err.message || "Erro interno.",
          }),
        );
        cleanup(state);
      }
    }

    // ─── 2. Input do Usuário (stdin) ───
    // Recebe a linha completa do frontend (após Enter)
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
  } catch {
    // Stream fechou — ignorar
  }
}

async function cleanup(state: WSState) {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = undefined;
  }
  if (state.process) {
    try {
      state.process.kill();
    } catch {}
    state.process = undefined;
  }
  if (state.tempDir) {
    await cleanupJob(state.tempDir);
    state.tempDir = undefined;
  }
}
