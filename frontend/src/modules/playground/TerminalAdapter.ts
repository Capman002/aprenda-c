/**
 * TerminalAdapter (Infrastructure/Adapter Layer)
 * Wraps xterm.js instance and handles WebSocket communication for interactive execution.
 */
export class TerminalAdapter {
  private term: any = null;
  private fitAddon: any = null;
  private socket: WebSocket | null = null;
  private container: HTMLElement | null = null;

  // Callbacks
  private onExitCallback: ((code: number) => void) | null = null;

  async init(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.container = container;

    // Check if xterm is loaded via CDN
    const win = window as any;
    if (!win.Terminal) {
      console.error("XTerm.js not loaded!");
      return;
    }

    // Initialize Terminal
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
    });

    // Initialize Fit Addon
    if (win.FitAddon) {
      this.fitAddon = new win.FitAddon.FitAddon();
      this.term.loadAddon(this.fitAddon);
    }

    this.term.open(container);
    this.fitAddon?.fit();

    // Bind Resize
    const resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
    });
    resizeObserver.observe(container);

    // Handle Input → Local Echo + WebSocket
    this.term.onData((data: string) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Local echo: mostra o que o usuário está digitando
        if (data === "\r") {
          // Enter → nova linha visual + envia \n para o processo
          this.term.write("\r\n");
          this.socket.send(JSON.stringify({ type: "stdin", data: "\n" }));
        } else if (data === "\x7f" || data === "\b") {
          // Backspace → apaga caractere visual
          this.term.write("\b \b");
          this.socket.send(JSON.stringify({ type: "stdin", data: "\b" }));
        } else if (data === "\x03") {
          // Ctrl+C → encerrar processo
          this.socket.send(JSON.stringify({ type: "stdin", data: data }));
          this.term.write("^C\r\n");
        } else {
          // Caractere normal → exibe e envia
          this.term.write(data);
          this.socket.send(JSON.stringify({ type: "stdin", data }));
        }
      }
    });
  }

  public runInteractive(files: Map<string, string>) {
    this.clear();
    this.show();

    // Determine WS URL
    const isProd = import.meta.env.PROD;
    const protocol = isProd ? "wss" : "ws";
    const host = isProd ? "api.aprendac.online" : "localhost:3000";
    const url = `${protocol}://${host}/api/ws/terminal`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      // Nenhuma mensagem verbosa — já abre limpo
      // Prepare payload
      const payloadFiles = Array.from(files.entries()).map(
        ([name, content]) => ({
          name,
          content,
        }),
      );

      // Send init command
      this.socket?.send(
        JSON.stringify({
          type: "init",
          files: payloadFiles,
        }),
      );
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "stdout") {
          this.term.write(msg.data);
        } else if (msg.type === "stderr") {
          // Erros de runtime em vermelho
          this.term.write(`\x1b[31m${msg.data}\x1b[0m`);
        } else if (msg.type === "compile_error") {
          // Erros de compilação — exibir de forma clara
          this.term.writeln("\x1b[1;31m✗ Erro de compilação:\x1b[0m");
          this.term.writeln("");
          this.term.write(msg.data);
        } else if (msg.type === "exit") {
          const code = msg.code;
          if (code === 0) {
            this.term.writeln(`\n\x1b[32m✓ Programa finalizado.\x1b[0m`);
          } else {
            this.term.writeln(
              `\n\x1b[33m⚠ Programa encerrou com código ${code}\x1b[0m`,
            );
          }
          this.onExitCallback?.(code);
          this.socket?.close();
        } else if (msg.type === "error") {
          this.term.writeln(`\x1b[31m✗ ${msg.message}\x1b[0m`);
        }
        // Ignora 'system' silenciosamente
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
    };

    this.socket.onerror = (err) => {
      this.term.writeln(`\x1b[31m✗ Erro de conexão com o servidor.\x1b[0m`);
      console.error(err);
    };
  }

  public clear() {
    this.term?.clear();
    this.term?.reset();
  }

  public show() {
    if (this.container) {
      this.container.style.display = "block";
      this.fitAddon?.fit();
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
}
