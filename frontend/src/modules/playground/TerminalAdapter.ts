/**
 * TerminalAdapter (Infrastructure/Adapter Layer)
 *
 * Responsabilidades:
 * - Wraps xterm.js para renderizar o terminal no browser.
 * - Gerencia a conexão WebSocket com o backend.
 * - Implementa "line buffering" com local echo:
 *   O usuário digita e vê os caracteres em tempo real.
 *   Ao pressionar Enter, a linha completa é enviada ao processo.
 *   Isso simula o comportamento de um stdin com canonical mode (cooked mode).
 */
export class TerminalAdapter {
  private term: any = null;
  private fitAddon: any = null;
  private socket: WebSocket | null = null;
  private container: HTMLElement | null = null;

  // Line buffer: acumula caracteres até o usuário dar Enter
  private lineBuffer: string = "";

  // Callbacks
  private onExitCallback: ((code: number) => void) | null = null;

  async init(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.container = container;

    const win = window as any;
    if (!win.Terminal) {
      console.error("[TerminalAdapter] xterm.js não carregado via CDN.");
      return;
    }

    // Inicializa Terminal
    this.term = new win.Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 14,
      lineHeight: 1.4,
      theme: {
        background: "#0D0D0D",
        foreground: "#e4e4e7",
        cursor: "#3b82f6",
        cursorAccent: "#0D0D0D",
        selectionBackground: "rgba(59, 130, 246, 0.3)",
      },
      convertEol: true,
      scrollback: 1000,
      disableStdin: false,
    });

    // Fit Addon
    if (win.FitAddon) {
      this.fitAddon = new win.FitAddon.FitAddon();
      this.term.loadAddon(this.fitAddon);
    }

    this.term.open(container);
    this.fitAddon?.fit();

    // Auto-resize
    const resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
    });
    resizeObserver.observe(container);

    // ─── Input Handler (Line Buffered + Local Echo) ───
    this.term.onData((data: string) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

      for (const char of data) {
        if (char === "\r" || char === "\n") {
          // Enter: exibe nova linha e envia a linha completa ao processo
          this.term.write("\r\n");
          this.socket.send(
            JSON.stringify({ type: "stdin", data: this.lineBuffer + "\n" }),
          );
          this.lineBuffer = "";
        } else if (char === "\x7f" || char === "\b") {
          // Backspace: apaga do buffer e do visual
          if (this.lineBuffer.length > 0) {
            this.lineBuffer = this.lineBuffer.slice(0, -1);
            this.term.write("\b \b");
          }
        } else if (char === "\x03") {
          // Ctrl+C: tenta encerrar o processo
          this.term.write("^C\r\n");
          this.lineBuffer = "";
          this.socket.send(JSON.stringify({ type: "stdin", data: "\x03" }));
        } else if (char === "\x04") {
          // Ctrl+D: EOF
          this.socket.send(JSON.stringify({ type: "stdin", data: "" }));
        } else if (char.charCodeAt(0) >= 32) {
          // Caractere imprimível: acumula no buffer e exibe
          this.lineBuffer += char;
          this.term.write(char);
        }
        // Ignora outros caracteres de controle silenciosamente
      }
    });
  }

  /**
   * Inicia a execução interativa via WebSocket.
   * Compila o código no servidor e conecta stdin/stdout ao terminal.
   */
  public runInteractive(files: Map<string, string>) {
    this.clear();
    this.show();
    this.lineBuffer = "";

    // URL do WebSocket
    const isProd = import.meta.env.PROD;
    const protocol = isProd ? "wss" : "ws";
    const host = isProd ? "api.aprendac.online" : "localhost:3000";
    const url = `${protocol}://${host}/api/ws/terminal`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      const payloadFiles = Array.from(files.entries()).map(
        ([name, content]) => ({ name, content }),
      );

      this.socket?.send(JSON.stringify({ type: "init", files: payloadFiles }));
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "stdout":
            this.term.write(msg.data);
            break;

          case "stderr":
            this.term.write(`\x1b[31m${msg.data}\x1b[0m`);
            break;

          case "compile_error":
            this.term.writeln("\x1b[1;31m✗ Erro de compilação:\x1b[0m");
            this.term.writeln("");
            // Escreve cada linha do erro de compilação
            const lines = msg.data.split("\n");
            for (const line of lines) {
              this.term.writeln(line);
            }
            break;

          case "exit": {
            const code = msg.code;
            if (code === 0) {
              this.term.writeln(`\r\n\x1b[32m✓ Programa finalizado.\x1b[0m`);
            } else if (code === 124) {
              // Timeout — mensagem já foi enviada pelo backend
            } else if (code === 126) {
              // Security block — mensagem já foi exibida
            } else {
              this.term.writeln(
                `\r\n\x1b[33m⚠ Programa encerrou com código ${code}\x1b[0m`,
              );
            }
            this.onExitCallback?.(code);
            this.socket?.close();
            break;
          }

          case "error":
            this.term.writeln(`\x1b[31m✗ ${msg.message}\x1b[0m`);
            break;

          // 'system' e outros tipos desconhecidos são ignorados
        }
      } catch (e) {
        console.error("[TerminalAdapter] Erro ao processar mensagem WS:", e);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
    };

    this.socket.onerror = () => {
      this.term.writeln(`\x1b[31m✗ Erro de conexão com o servidor.\x1b[0m`);
    };
  }

  public clear() {
    this.term?.clear();
    this.term?.reset();
    this.lineBuffer = "";
  }

  public show() {
    if (this.container) {
      this.container.style.display = "block";
      setTimeout(() => this.fitAddon?.fit(), 50);
    }
  }

  public hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  public onExit(callback: (code: number) => void) {
    this.onExitCallback = callback;
  }

  public dispose() {
    this.socket?.close();
    this.socket = null;
    this.lineBuffer = "";
  }
}
