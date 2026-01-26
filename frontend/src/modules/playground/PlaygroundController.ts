import { ProjectManager } from "./ProjectManager";
import { CompilerService } from "./CompilerService";
import { MonacoAdapter } from "./MonacoAdapter";
import { PROJECT_TEMPLATES } from "./ProjectTemplates";
import type { IProjectManager, ICompilerService, ICodeEditor } from "./types";

/**
 * PlaygroundController (Orchestrator Layer)
 * "The Glue". Connects UI Events <-> Business Logic <-> Infrastructure.
 * Keeps the main Astro file clean.
 */
export class PlaygroundController {
  // Modules
  private project: IProjectManager;
  private compiler: ICompilerService;
  private editor: MonacoAdapter; // Use explicit type for addCommand access

  // UI Cache
  private ui = {
    tabs: document.getElementById("editor-tabs"),
    fileTree: document.getElementById("file-tree"),
    runBtn: document.getElementById("run-btn"),
    output: document.getElementById("output"),
    status: document.getElementById("status-indicator"),
    execStats: document.getElementById("execution-stats"),
    stdinSection: document.getElementById("stdin-section"),
    stdinInput: document.getElementById("stdin-input") as HTMLTextAreaElement,
    loading: document.getElementById("editor-loading"),
  };

  constructor() {
    this.project = new ProjectManager();
    this.compiler = new CompilerService();
    this.editor = new MonacoAdapter();
  }

  async init() {
    // Initialize Editor
    const editorContainer = document.getElementById("monaco-editor");
    if (editorContainer) {
      try {
        await this.editor.init(editorContainer);

        // Bind Editor Events
        this.editor.onUserChange((newContent) => {
          const active = this.project.getActiveFile();
          this.project.setFileContent(active, newContent);
          this.saveState();
        });

        // Bind Keys: Ctrl+Enter (Run)
        this.editor.onRunShortcut(() => {
          console.log("Ctrl+Enter pressed! Running...");
          this.runCode();
        });

        // Hide Loading State
        if (this.ui.loading) this.ui.loading.style.display = "none";
      } catch (e) {
        console.error("Editor init failed", e);
        if (this.ui.loading)
          this.ui.loading.innerHTML =
            '<span style="color:red">Erro ao carregar editor</span>';
      }
    }

    // Load State
    this.loadState();

    // Initial Render
    this.renderUI();

    // Setup Event Listeners
    this.bindEvents();

    // Check API
    this.checkRuntime();
  }

  private bindEvents() {
    // Toolbar
    this.ui.runBtn?.addEventListener("click", () => this.runCode());

    // Output Actions
    document
      .getElementById("clear-output-btn")
      ?.addEventListener("click", () => this.clearOutput());
    document
      .getElementById("toggle-stdin")
      ?.addEventListener("click", () => this.toggleStdin());

    // Explorer Actions
    document
      .getElementById("new-file-btn")
      ?.addEventListener("click", () => this.showNewFileModal());

    // Modal Logic (Simplified for brevity, can be extracted too)
    document
      .getElementById("modal-confirm")
      ?.addEventListener("click", () => this.handleCreateFile());

    // Templates
    document.querySelectorAll(".template-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const template = (e.currentTarget as HTMLElement).dataset.template;
        if (template) this.loadTemplate(template);
      });
    });
  }

  // --- Core Logic ---

  private loadState() {
    const saved = localStorage.getItem("playground-project");
    if (saved) {
      const loaded = ProjectManager.deserialize(saved);
      if (loaded) {
        this.project = loaded; // Replace instance with loaded one
      }
    }

    // Sync Editor
    const activeContent = this.project.getFileContent(
      this.project.getActiveFile(),
    );
    if (activeContent !== undefined) {
      this.editor.setValue(activeContent);
      this.updateEditorLanguage(this.project.getActiveFile());
    }
  }

  private saveState() {
    localStorage.setItem(
      "playground-project",
      (this.project as ProjectManager).serialize(),
    );
  }

  private updateEditorLanguage(filename: string) {
    const lang = filename.endsWith(".h")
      ? "c"
      : filename.endsWith(".c")
        ? "c"
        : "plaintext";
    this.editor.setLanguage(lang);
  }

  private async runCode() {
    if (!this.ui.runBtn || this.ui.runBtn.classList.contains("running")) return;

    // UI State: Running
    this.setRunningState(true);
    this.clearOutput(true); // Keep 'Running...' msg

    // Get Input
    const stdin =
      this.ui.stdinSection?.style.display !== "none"
        ? this.ui.stdinInput?.value
        : undefined;

    // Execute
    const result = await this.compiler.run(this.project.getFiles());

    // Render Result
    this.renderOutput(result);

    // UI State: Ready
    this.setRunningState(false);
  }

  // --- Rendering methods ---

  private renderUI() {
    this.renderFileTree();
    this.renderTabs();
  }

  private renderFileTree() {
    if (!this.ui.fileTree) return;

    const files = this.project.getFiles();
    const active = this.project.getActiveFile();
    let html = "";

    files.forEach((_, name) => {
      const isActive = name === active ? "active" : "";
      const iconClass = name.endsWith(".h") ? "icon-h" : "icon-c";
      const iconChar = name.endsWith(".h") ? "H" : "C";

      html += `
                <div class="file-item ${isActive}" data-filename="${name}">
                    <span class="file-icon ${iconClass}" style="font-weight:900; font-size:10px; width:16px;">${iconChar}</span>
                    <span class="file-name">${name}</span>
                    <button class="file-action-btn delete-file" title="Excluir">×</button>
                </div>
            `;
    });

    this.ui.fileTree.innerHTML = html;

    // Bind item clicks
    this.ui.fileTree.querySelectorAll(".file-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const name = (el as HTMLElement).dataset.filename!;

        // Delete?
        if (target.classList.contains("delete-file")) {
          e.stopPropagation();
          if (confirm(`Excluir ${name}?`)) {
            this.project.deleteFile(name);
            this.saveState();
            this.renderUI();
            // Refocus editor
            const newActive = this.project.getActiveFile();
            this.editor.setValue(this.project.getFileContent(newActive) || "");
          }
          return;
        }

        this.switchFile(name);
      });
    });
  }

  private renderTabs() {
    if (!this.ui.tabs) return;

    const tabs = this.project.getOpenTabs();
    const active = this.project.getActiveFile();
    let html = "";

    tabs.forEach((name) => {
      const isActive = name === active ? "active" : "";
      html += `
                <div class="tab ${isActive}" data-filename="${name}">
                   <span>${name}</span>
                   <button class="tab-close">×</button>
                </div>
            `;
    });

    this.ui.tabs.innerHTML = html;

    // Bind Tab Events
    this.ui.tabs.querySelectorAll(".tab").forEach((el) => {
      el.addEventListener("click", (e) => {
        const name = (el as HTMLElement).dataset.filename!;
        const target = e.target as HTMLElement;

        if (target.classList.contains("tab-close")) {
          e.stopPropagation();
          const nextFile = this.project.closeTab(name);
          this.renderTabs();
          if (nextFile && nextFile !== active) this.switchFile(nextFile);
          return;
        }

        this.switchFile(name);
      });
    });
  }

  // --- Actions ---

  private switchFile(name: string) {
    this.project.setActiveFile(name);
    const content = this.project.getFileContent(name) || "";
    this.editor.setValue(content);
    this.updateEditorLanguage(name);
    this.renderUI();
    this.saveState();
  }

  private setRunningState(running: boolean) {
    if (!this.ui.runBtn || !this.ui.status) return;

    if (running) {
      this.ui.runBtn.innerHTML = `<span>...</span>`;
      this.ui.runBtn.classList.add("running");
      this.ui.status.className = "status-indicator running";
      this.ui.status.innerHTML = `<span class="status-dot"></span><span class="status-text">Rodando</span>`;
    } else {
      // Restore original state
      this.ui.runBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Run</span>`;
      this.ui.runBtn.classList.remove("running");
      this.ui.status.className = "status-indicator ready";
      this.ui.status.innerHTML = `<span class="status-dot"></span><span class="status-text">Pronto</span>`;
    }
  }

  private renderOutput(result: any) {
    if (!this.ui.output) return;

    // Robust ANSI Parser
    const parseAnsi = (text: string) => {
      if (!text) return "";

      // 1. Sanitize HTML
      let proc = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // 2. Remove replacement characters usually caused by bad encoding
      proc = proc.replace(/\ufffd/g, "");

      // 3. Process Colors
      // Regex matches \x1b[XXm or \x1b[XX;YYm
      // We handle standard foregrounds (30-37) and brights (90-97)

      const colors: Record<string, string> = {
        "30": "#000",
        "31": "#ef4444",
        "32": "#10b981",
        "33": "#f59e0b",
        "34": "#3b82f6",
        "35": "#d946ef",
        "36": "#06b6d4",
        "37": "#f3f4f6",
        "90": "#71717a",
        "91": "#f87171",
        "92": "#34d399",
        "93": "#fbbf24",
        "94": "#60a5fa",
        "95": "#e879f9",
        "96": "#22d3ee",
        "97": "#ffffff",
      };

      // Reset
      proc = proc.replace(/(\x1b)\[0?m/g, "</span>");

      // Colors and Styles
      proc = proc.replace(/(\x1b)\[([\d;]+)m/g, (match, esc, codeStr) => {
        const codes = codeStr.split(";");
        let styleParts = [];

        for (const code of codes) {
          if (colors[code]) {
            styleParts.push(`color:${colors[code]}`);
          } else if (code === "1") {
            styleParts.push("font-weight:bold");
          }
        }

        return styleParts.length > 0
          ? `<span style="${styleParts.join(";")}">`
          : match;
      });

      return proc;
    };

    let html = "";
    if (result.stderr) {
      html += `<div class="output-section error"><div class="section-header">❌ Erro</div><pre>${parseAnsi(result.stderr)}</pre></div>`;
    }
    if (result.stdout) {
      html += `<div class="output-section success"><div class="section-header">✅ Saída</div><pre>${parseAnsi(result.stdout)}</pre></div>`;
    }
    if (!result.stderr && !result.stdout) {
      html += `<div class="output-section info"><pre>Sem saída.</pre></div>`;
    }

    this.ui.output.innerHTML = html;

    if (this.ui.execStats) {
      this.ui.execStats.style.display = "flex";
      document.getElementById("exec-files")!.textContent =
        `${this.project.getFiles().size} arquivos`;
    }
  }

  private clearOutput(keepRunningObj = false) {
    if (keepRunningObj && this.ui.output) {
      this.ui.output.innerHTML =
        '<div class="output-welcome"><div class="loading-spinner"></div><p>Compilando e Executando...</p></div>';
      return;
    }
    if (this.ui.output) {
      this.ui.output.innerHTML =
        '<div class="output-welcome"><p>Output limpo.</p></div>';
    }
    if (this.ui.execStats) this.ui.execStats.style.display = "none";
  }

  private toggleStdin() {
    if (this.ui.stdinSection) {
      const isHidden = this.ui.stdinSection.style.display === "none";
      this.ui.stdinSection.style.display = isHidden ? "block" : "none";
    }
  }

  private async checkRuntime() {
    const info = await this.compiler.checkRuntime();
    const footer = document.getElementById("runtime-info");
    if (footer) footer.innerHTML = `<span>⚙️ ${info}</span>`;
  }

  private showNewFileModal() {
    document.getElementById("new-file-modal")!.style.display = "flex";
  }

  private handleCreateFile() {
    const input = document.getElementById("new-file-name") as HTMLInputElement;
    const name = input.value.trim();
    if (this.project.createFile(name)) {
      this.saveState();
      this.switchFile(name);
      document.getElementById("new-file-modal")!.style.display = "none";
      input.value = "";
    } else {
      alert("Nome inválido ou arquivo já existe!");
    }
  }

  private loadTemplate(id: string) {
    // @ts-ignore
    const tpl = PROJECT_TEMPLATES[id];
    if (!tpl) return;

    // Clear current
    this.project.clear();

    // Load template files
    Object.entries(tpl.files).forEach(([name, content]) => {
      this.project.createFile(name);
      this.project.setFileContent(name, content as string);
    });

    this.project.setActiveFile("main.c");
    this.saveState();
    this.renderUI();

    // Restore editor content
    this.switchFile("main.c");
  }
}
