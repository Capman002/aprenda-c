import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_SIZE = 100 * 1024; // 100KB output limit
const MAX_CONCURRENT_JOBS = 4; // Limite rigoroso de concorrência

export interface ExecuteRequest {
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
}

export interface ExecuteResponse {
  success: boolean;
  timestamp: string;
  run?: {
    stdout: string;
    stderr: string;
    exitCode: number;
    signal?: string;
  };
  error?: string;
}

// Fila de Execução Simples (Semaphore)
class ExecutionQueue {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.active++;
        next();
      }
    }
  }

  get stats() {
    return { active: this.active, queued: this.queue.length };
  }
}

const executionQueue = new ExecutionQueue(MAX_CONCURRENT_JOBS);

// Filtro de Segurança (Heurística)
function validateSecurity(code: string): string | null {
  // Padrões perigosos
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
    // Bloquear loops infinitos óbvios (ex: while(1) sem break é difícil pegar com regex, mas while(true) ajuda)
    // Isso é frágil, o timeout do processo é a proteção real, mas ajuda a educar.
  ];

  for (const rule of forbidden) {
    if (rule.pattern.test(code)) {
      return rule.reason;
    }
  }
  return null;
}

export async function createJob(files: { name: string; content: string }[]) {
  const jobId = crypto.randomUUID();
  const tempDir = join(process.cwd(), ".jobs", jobId);

  await mkdir(tempDir, { recursive: true });

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    await writeFile(join(tempDir, safeName), file.content);
  }

  return { jobId, tempDir };
}

export async function cleanupJob(tempDir: string) {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {}
}

export async function executeCode(
  req: ExecuteRequest,
): Promise<ExecuteResponse> {
  const timestamp = new Date().toISOString();

  // 0. Validação de Segurança Estática
  for (const file of req.files) {
    const error = validateSecurity(file.content);
    if (error) {
      return {
        success: true, // Request ok, mas código rejeitado (Business Rule)
        timestamp,
        run: {
          stdout: "",
          stderr: `[Security] Violação detectada: ${error}\nEste ambiente é sandbox e restrito para fins educativos.`,
          exitCode: 126, // Command invoked cannot execute
        },
      };
    }
  }

  // 1. Controle de Concorrência
  await executionQueue.acquire();

  try {
    // 2. Criar diretório e arquivos
    const { tempDir } = await createJob(req.files);

    try {
      if (req.stdin) {
        await writeFile(join(tempDir, "input.txt"), req.stdin);
      }

      // 4. Script de Execução Otimizado
      const runScriptContent = `
      #!/bin/bash
      # Limite de recursos (ulimit) se possível, para evitar fork bomb
      ulimit -u 64 2>/dev/null 
      
      gcc -fdiagnostics-color=always -Wall -Wextra -pthread -o app *.c -lm
      COMPILE_STATUS=$?
      
      if [ $COMPILE_STATUS -ne 0 ]; then
          exit 1
      fi
      
      # Execução segura
      if [ -f input.txt ]; then
          ./app < input.txt
      else
          ./app
      fi
      `;

      await writeFile(
        join(tempDir, "run.sh"),
        runScriptContent.replace(/\r\n/g, "\n"),
        { mode: 0o755 },
      );

      // 5. Spawn Process
      const proc = Bun.spawn(["bash", "run.sh"], {
        cwd: tempDir,
        stdin: null,
        env: { ...process.env, PATH: process.env.PATH },
      });

      // 6. Timeout Handler
      const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
      timeoutSignal.onabort = () => {
        proc.kill();
      };

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      if (timeoutSignal.aborted) {
        return {
          success: true,
          timestamp,
          run: {
            stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
            stderr:
              stderr.slice(0, MAX_OUTPUT_SIZE) +
              "\n\n[Sistema] Timeout (Limite de tempo excedido).",
            exitCode: 124,
            signal: "SIGKILL",
          },
        };
      }

      return {
        success: true,
        timestamp,
        run: {
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
          exitCode: exitCode ?? -1,
        },
      };
    } finally {
      // 7. Cleanup
      // Executa rm no background sem await para liberar a resposta pro cliente mais rápido
      cleanupJob(tempDir);
    }
  } catch (err) {
    console.error("Execution Error:", err);
    return {
      success: false,
      timestamp,
      error: "Falha interna na execução.",
    };
  } finally {
    // 8. Liberar vaga na fila
    executionQueue.release();

    // Opcional: Log de carga
    // console.log(`[Queue] Active: ${executionQueue.stats.active}, Queued: ${executionQueue.stats.queued}`);
  }
}

export async function getRuntimes() {
  return [{ language: "c", version: "System GCC", aliases: ["gcc"] }];
}
