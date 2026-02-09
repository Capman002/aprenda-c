import { Elysia, t } from "elysia";
import { createJob, cleanupJob } from "../compiler/service";
import { join } from "path";
import { writeFile } from "fs/promises";
import { Subprocess } from "bun";

// Tipagem do estado da conexão WS
interface WSState {
  jobId?: string;
  tempDir?: string;
  process?: Subprocess;
}

export const wsRoutes = new Elysia({ prefix: "/api/ws" }).ws("/terminal", {
  // Schema de validação das mensagens
  body: t.Any(), // Aceita qualquer JSON por enquanto, validamos dentro

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

        ws.send({ type: "system", message: "Preparando ambiente..." });

        // Criar Job isolado
        const { jobId, tempDir } = await createJob(files);
        state.jobId = jobId;
        state.tempDir = tempDir;

        // Script de Compilação e Execução
        const runScriptContent = `
        #!/bin/bash
        # Compilação
        gcc -fdiagnostics-color=always -Wall -Wextra -pthread -o app *.c -lm
        COMPILE_STATUS=$?
        
        if [ $COMPILE_STATUS -ne 0 ]; then
            exit 1
        fi
        
        # Execução Interativa
        # stdbuf -i0 -o0 -e0 força buffers zero para stdin/out/err
        # Se stdbuf não existir, tentamos rodar direto.
        if command -v stdbuf &> /dev/null; then
            stdbuf -i0 -o0 -e0 ./app
        else
            ./app
        fi
        `;

        await writeFile(
          join(tempDir, "run.sh"),
          runScriptContent.replace(/\r\n/g, "\n"),
          {
            mode: 0o755,
          },
        );

        ws.send({ type: "system", message: "Compilando..." });

        // Spawn do Processo
        // Usamos 'cat' como pipe simples se stdbuf falhar, mas o ideal é o próprio Bun gerenciar.
        // Importante: Bun.spawn com stdin: 'pipe' permite escrevermos nele.
        const proc = Bun.spawn(["bash", "run.sh"], {
          cwd: tempDir,
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe", // Podemos misturar ou separar
          env: { ...process.env, TERM: "xterm-256color" }, // Force colored output
        });

        state.process = proc;

        // Stream stdout -> WS
        readStream(proc.stdout, (chunk) => {
          ws.send({ type: "stdout", data: chunk });
        });

        // Stream stderr -> WS
        readStream(proc.stderr, (chunk) => {
          ws.send({ type: "stderr", data: chunk });
        });

        // Wait for exit
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

    // 3. Resize (Opcional, se usarmos pty real no futuro)
    if (message.type === "resize") {
      // Ignorar por enquanto
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
      callback(decoder.decode(value, { stream: true })); // stream: true mantém estado de multi-byte chars
    }
  } catch (e) {
    // Ignore stream errors on close
  }
}

async function cleanup(state: WSState) {
  if (state.process) {
    state.process.kill(); // Assegura morte do processo
    state.process = undefined;
  }
  if (state.tempDir) {
    await cleanupJob(state.tempDir);
    state.tempDir = undefined;
  }
}
