import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";

const TIMEOUT_MS = 15000; // 15s timeout
const MAX_OUTPUT_SIZE = 100 * 1024; // 100KB output limit

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

/**
 * Executa código C usando Docker localmente.
 * Requer Docker instalado e rodando no host.
 */
/**
 * Executa código C usando GCC localmente (Nativo).
 * Mais rápido e confiável em ambientes containerizados (sem problemas de volume Docker).
 * Requer: apt-get install gcc build-essential
 */
export async function executeCode(
  req: ExecuteRequest,
): Promise<ExecuteResponse> {
  const timestamp = new Date().toISOString();

  // 1. Criar diretório temporário isolado
  const jobId = crypto.randomUUID();
  const tempDir = join(process.cwd(), ".jobs", jobId);

  try {
    await mkdir(tempDir, { recursive: true });

    // 2. Gravar arquivos
    for (const file of req.files) {
      // Segurança básica de path e nome
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
      await writeFile(join(tempDir, safeName), file.content);
    }

    if (req.stdin) {
      await writeFile(join(tempDir, "input.txt"), req.stdin);
    }

    // 3. Script de Compilação e Execução (Nativo)
    // Usa timeout do comando Linux para segurança extra contra loops infinitos binários
    const runScriptContent = `
    #!/bin/bash
    # Compilar
    gcc -fdiagnostics-color=always -Wall -Wextra -pthread -o app *.c -lm
    COMPILE_STATUS=$?
    
    if [ $COMPILE_STATUS -ne 0 ]; then
        exit 1
    fi
    
    # Executar com limite de tempo (2s) via timeout do sistema se disponível, senão direto
    if command -v timeout >/dev/null 2>&1; then
        CMD="timeout 2s ./app"
    else
        CMD="./app"
    fi

    if [ -f input.txt ]; then
        $CMD < input.txt
    else
        $CMD
    fi
    `;

    await writeFile(
      join(tempDir, "run.sh"),
      runScriptContent.replace(/\r\n/g, "\n"),
      { mode: 0o755 },
    );

    // 4. Executar via Bun Spawn (Shell)
    const startTime = performance.now();

    const proc = Bun.spawn(["bash", "run.sh"], {
      cwd: tempDir,
      stdin: null, // Input via arquivo
      env: { ...process.env, PATH: process.env.PATH }, // Herda PATH para achar gcc
    });

    // Timeout Killer (Nível Bun - Segurança redundante)
    const timeoutSignal = AbortSignal.timeout(5000); // 5s hard limit (compilação + exec)
    timeoutSignal.onabort = () => {
      proc.kill();
    };

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    // Se timeout Bun disparou
    if (timeoutSignal.aborted) {
      return {
        success: true,
        timestamp,
        run: {
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr:
            stderr.slice(0, MAX_OUTPUT_SIZE) +
            "\n\n[Sistema] Timeout (Processo morto externamente).",
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
  } catch (err) {
    console.error("Execution Error:", err);
    return {
      success: false,
      timestamp,
      error: "Falha na execução nativa do código.",
    };
  } finally {
    // 5. Cleanup rápido
    setTimeout(() => {
      rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }, 500);
  }
}

export async function getRuntimes() {
  return [{ language: "c", version: "Docker GCC (Latest)", aliases: ["gcc"] }];
}
