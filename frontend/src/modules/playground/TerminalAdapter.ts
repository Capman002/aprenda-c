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
      cursorBlinking: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      theme: {
        background: "#0D0D0D", // Matches OutputPanel bg
        foreground: "#cccccc",
      },
      convertEol: true, // Handle \n correctly
    });

    // Initialize Fit Addon
    if (win.FitAddon) {
      this.fitAddon = new win.FitAddon.FitAddon();
      this.term.loadAddon(this.fitAddon);
    }

    this.term.open(container);
    this.fitAddon?.fit();

    // Bind Resize
    window.addEventListener("resize", () => {
      this.fitAddon?.fit();
    });

    // Handle Input
    this.term.onData((data: string) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "stdin", data }));
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

    this.term.writeln("\x1b[36mInitializing connection...\x1b[0m");

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.term.writeln("\x1b[32mConnected.\x1b[0m");

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

        if (msg.type === "stdout" || msg.type === "stderr") {
          this.term.write(msg.data);
        } else if (msg.type === "system") {
          this.term.writeln(`\x1b[90m[System] ${msg.message}\x1b[0m`);
        } else if (msg.type === "error") {
          this.term.writeln(`\x1b[31m[Error] ${msg.message}\x1b[0m`);
        } else if (msg.type === "exit") {
          this.term.writeln(
            `\n\x1b[33mProgram exited with code ${msg.code}\x1b[0m`,
          );
          this.onExitCallback?.(msg.code);
          this.socket?.close();
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.socket.onclose = () => {
      this.term.writeln("\n\x1b[90mConnection closed.\x1b[0m");
      this.socket = null;
    };

    this.socket.onerror = (err) => {
      this.term.writeln(`\n\x1b[31mConnection error.\x1b[0m`);
      console.error(err);
    };
  }

  public clear() {
    this.term?.clear();
  }

  public show() {
    if (this.container) {
      this.container.style.display = "block";
      // Hide standard output if visible? Handled by PlaygroundController
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
