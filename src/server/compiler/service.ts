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
export async function executeCode(
  req: ExecuteRequest,
): Promise<ExecuteResponse> {
  const timestamp = new Date().toISOString();

  // 1. Criar diretório temporário
  const jobId = crypto.randomUUID();
  // Usar pasta local no projeto para facilitar mount no Windows (evita problemas de path do /tmp)
  // Certifique-se que o Docker tem permissão para montar esta pasta
  const tempDir = join(process.cwd(), ".jobs", jobId);

  try {
    await mkdir(tempDir, { recursive: true });

    // 2. Gravar arquivos
    for (const file of req.files) {
      // Segurança básica de path
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
      await writeFile(join(tempDir, safeName), file.content);
    }

    // Gravar stdin se houver
    if (req.stdin) {
      await writeFile(join(tempDir, "input.txt"), req.stdin);
    }

    // 3. Preparar comando Docker
    // Script interno para compilar e rodar
    // Redireciona input.txt para stdin se existir
    const internalScript = `
    gcc -fdiagnostics-color=always -Wall -Wextra -pthread -o app *.c -lm
    COMPILE_STATUS=$?
    
    if [ $COMPILE_STATUS -ne 0 ]; then
        exit 1
    fi
    
    if [ -f input.txt ]; then
        ./app < input.txt
    else
        ./app
    fi
    `;

    // Sanitizar script para LF (Linux) removendo \r, crítico para Docker no Windows
    const runScriptContent = internalScript.replace(/\r\n/g, "\n");
    await writeFile(join(tempDir, "run.sh"), runScriptContent);

    // 4. Executar Docker
    // --rm: remove container ao sair
    // --network none: sem internet (segurança)
    // -v: monta volume
    // gcc:latest: imagem oficial (deve estar pre-pullada idealmente)
    const dockerCmd = [
      "docker",
      "run",
      "--rm",
      "--network",
      "none",
      "--memory",
      "100m", // Limite 100MB
      "--cpus",
      "0.5", // Limite 0.5 CPU
      "-v",
      `${tempDir}:/workspace`,
      "-w",
      "/workspace",
      "gcc:latest",
      "bash",
      "run.sh",
    ];

    const startTime = performance.now();

    // Bun.spawn
    const proc = Bun.spawn(dockerCmd, {
      stdin: null, // Stdin vai via arquivo
    });

    // Timeout Killer
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
    timeoutSignal.onabort = () => {
      proc.kill(); // SIGKILL
    };

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const wallTime = performance.now() - startTime;

    // Se timeout disparou
    if (timeoutSignal.aborted) {
      return {
        success: true, // "Success" no sentido de que rodou, mas falhou
        timestamp,
        run: {
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr:
            stderr.slice(0, MAX_OUTPUT_SIZE) +
            "\n\n[Sistema] Tempo limite excedido (15s).",
          exitCode: 124, // Timeout exit code standard
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
    console.error("Docker Execution Error:", err);
    return {
      success: false,
      timestamp,
      error: "Falha interna ao executar container Docker.",
    };
  } finally {
    // 5. Cleanup (Fire and forget)
    // Delay pequeno para garantir que Docker soltou arquivos (Windows lock)
    setTimeout(() => {
      rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }, 1000);
  }
}

export async function getRuntimes() {
  return [{ language: "c", version: "Docker GCC (Latest)", aliases: ["gcc"] }];
}
