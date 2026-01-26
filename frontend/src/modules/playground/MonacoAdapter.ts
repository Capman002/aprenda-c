import type { ICodeEditor } from "./types";

/**
 * MonacoAdapter (Infrastructure/Adapter Layer)
 * Wraps the complex Monaco Editor API behind a simple interface.
 * Handles lazy loading via CDN requirejs.
 */
export class MonacoAdapter implements ICodeEditor {
  private editor: any = null; // Monaco instance
  private monacoObj: any = null; // Global 'monaco' object

  // Callbacks
  private changeCallback: ((value: string) => void) | null = null;

  async init(container: HTMLElement): Promise<void> {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }

    return new Promise((resolve, reject) => {
      // Check if 'require' loader exists (CDN)
      if (typeof (window as any).require === "undefined") {
        return reject(new Error("Monaco loader not found"));
      }

      const require = (window as any).require;

      require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
        },
      });

      require(["vs/editor/editor.main"], () => {
        this.monacoObj = (window as any).monaco;
        this.setupTheme();

        this.editor = this.monacoObj.editor.create(container, {
          value: "",
          language: "c",
          theme: "robotics-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          padding: { top: 16, bottom: 16 },
          cursorBlinking: "smooth",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        });

        // Bind events
        this.editor.onDidChangeModelContent(() => {
          if (this.changeCallback) {
            this.changeCallback(this.editor.getValue());
          }
        });

        resolve();
      });
    });
  }

  private setupTheme() {
    if (!this.monacoObj) return;

    this.monacoObj.editor.defineTheme("robotics-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A737D", fontStyle: "italic" },
        { token: "keyword", foreground: "FF7B72" },
        { token: "string", foreground: "A5D6FF" },
        { token: "number", foreground: "79C0FF" },
        { token: "type", foreground: "FFA657" },
        { token: "function", foreground: "D2A8FF" },
      ],
      colors: {
        "editor.background": "#0D0D0D",
        "editor.foreground": "#E6EDF3",
        "editor.selectionBackground": "#264F78",
        "editorCursor.foreground": "#58A6FF",
        "editorLineNumber.foreground": "#484F58",
        "editorLineNumber.activeForeground": "#8B949E",
      },
    });
  }

  setValue(value: string): void {
    if (this.editor) {
      // Preserve undo stack if possible, or just set value
      const model = this.editor.getModel();
      if (model) {
        // Use pushEditOperations for undo support (advanced)
        // or just setValue for simplicity/reset
        this.editor.setValue(value);
      }
    }
  }

  getValue(): string {
    return this.editor ? this.editor.getValue() : "";
  }

  setLanguage(lang: string): void {
    if (this.editor && this.monacoObj) {
      const model = this.editor.getModel();
      this.monacoObj.editor.setModelLanguage(model, lang);
    }
  }

  layout(): void {
    this.editor?.layout();
  }

  onUserChange(callback: (value: string) => void): void {
    this.changeCallback = callback;
  }

  // Command binding helper
  addCommand(keybinding: number, handler: () => void) {
    if (this.editor && this.monacoObj) {
      this.editor.addCommand(keybinding, handler);
    }
  }

  onRunShortcut(callback: () => void) {
    if (this.editor && this.monacoObj) {
      this.editor.addCommand(
        this.monacoObj.KeyMod.CtrlCmd | this.monacoObj.KeyCode.Enter,
        callback,
      );
    }
  }

  get monaco() {
    return this.monacoObj;
  } // Escape hatch if needed
}
