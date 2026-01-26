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
    this.loadConfig();

    // Initial Render
    this.renderUI();

    // Setup Event Listeners
    this.bindEvents();

    // Check API
    this.checkRuntime();

    // Init Resizer
    this.setupResizer();
  }

  // Config State
  private config = {
    fontSize: 14,
    wordWrap: false,
    minimap: false,
  };

  private setupResizer() {
    const resizer = document.getElementById("resizer");
    const outputPanel = document.querySelector(".output-panel") as HTMLElement;

    if (!resizer || !outputPanel) return;

    let isResizing = false;
    let initialX = 0;
    let initialWidth = 0;

    const startResize = (e: MouseEvent) => {
      isResizing = true;
      initialX = e.clientX;
      initialWidth = outputPanel.offsetWidth; // Get current px width

      // Visual feedback
      resizer.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - initialX;
      // Moving right (positive delta) decreases width (since panel is on right)
      // Moving left (negative delta) increases width
      const newWidth = initialWidth - deltaX;

      // Constraints (min 0 to collapse, max 80vw)
      if (newWidth < 50) {
        // Collapse mode
        outputPanel.style.width = "0px";
        outputPanel.style.minWidth = "0px";
        outputPanel.style.flexBasis = "0px";
        outputPanel.style.padding = "0"; // Hide padding if any
        outputPanel.style.overflow = "hidden";
      } else {
        outputPanel.style.width = `${newWidth}px`;
        outputPanel.style.flexBasis = `${newWidth}px`; // Override flex
        outputPanel.style.minWidth = "250px"; // Restore min-width when not collapsed
        outputPanel.style.padding = ""; // Restore padding
        outputPanel.style.overflow = "";
      }

      // Important: Tell Monaco to resize
      this.editor.layout();
    };

    const stopResize = () => {
      isResizing = false;
      resizer.classList.remove("resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    // Double click to toggle
    resizer.addEventListener("dblclick", () => {
      const currentWidth = outputPanel.offsetWidth;
      if (currentWidth > 50) {
        // Collapse
        outputPanel.dataset.prevWidth = currentWidth.toString();
        outputPanel.style.width = "0px";
        outputPanel.style.flexBasis = "0px";
        outputPanel.style.minWidth = "0px";
        outputPanel.style.overflow = "hidden";
      } else {
        // Restore
        const prev = outputPanel.dataset.prevWidth || "400";
        outputPanel.style.width = `${prev}px`;
        outputPanel.style.flexBasis = `${prev}px`;
        outputPanel.style.minWidth = "250px";
        outputPanel.style.overflow = "";
      }
      this.editor.layout();
    });

    resizer.addEventListener("mousedown", startResize);
  }

  private bindEvents() {
    // Toolbar
    this.ui.runBtn?.addEventListener("click", () => this.runCode());

    // Settings
    const settingsBtn = document.getElementById("settings-btn");
    const settingsPopover = document.getElementById("settings-popover");
    const closeSettings = document.getElementById("close-settings");

    settingsBtn?.addEventListener("click", () => {
      // Toggle Popover
      if (settingsPopover) {
        settingsPopover.style.display =
          settingsPopover.style.display === "none" ? "block" : "none";
      }
    });

    closeSettings?.addEventListener("click", () => {
      if (settingsPopover) settingsPopover.style.display = "none";
    });

    // Font Size
    document.getElementById("font-inc")?.addEventListener("click", () => {
      this.updateConfig({ fontSize: this.config.fontSize + 1 });
    });
    document.getElementById("font-dec")?.addEventListener("click", () => {
      this.updateConfig({ fontSize: Math.max(10, this.config.fontSize - 1) });
    });

    // Toggles
    document
      .getElementById("toggle-wordwrap")
      ?.addEventListener("change", (e) => {
        this.updateConfig({ wordWrap: (e.target as HTMLInputElement).checked });
      });
    document
      .getElementById("toggle-minimap")
      ?.addEventListener("change", (e) => {
        this.updateConfig({ minimap: (e.target as HTMLInputElement).checked });
      });

    // Close settings when clicking outside (simple version)
    document.addEventListener("click", (e) => {
      if (
        settingsPopover &&
        settingsBtn &&
        settingsPopover.style.display === "block"
      ) {
        if (
          !settingsPopover.contains(e.target as Node) &&
          !settingsBtn.contains(e.target as Node)
        ) {
          settingsPopover.style.display = "none";
        }
      }
    });

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

    // Fullscreen Toggle (Toolbar)
    document
      .getElementById("toggle-fullscreen")
      ?.addEventListener("click", () => {
        this.toggleFullscreen();
      });
    // Editor Maximize Toggle (Button next to Run)
    document.getElementById("expand-btn")?.addEventListener("click", () => {
      this.toggleEditorMaximize();
    });

    // Output Maximize Toggle
    document
      .getElementById("toggle-output-max")
      ?.addEventListener("click", () => {
        this.toggleOutputMaximize();
      });
  }

  private toggleFullscreen() {
    const wrapper = document.querySelector(".ide-wrapper");
    if (!wrapper) return;

    const isFullscreen = wrapper.classList.toggle("fullscreen-mode");

    // Update Icon for Fullscreen button only
    this.updateIconState("toggle-fullscreen", isFullscreen);

    this.layoutEditor();
  }

  private toggleEditorMaximize() {
    const main = document.querySelector(".ide-main");
    if (!main) return;

    // Reset output maximize if active
    if (main.classList.contains("output-maximized")) {
      main.classList.remove("output-maximized");
      this.updateIconState("toggle-output-max", false);
    }

    const isMaximized = main.classList.toggle("editor-maximized");

    // Update Icon for Expand button only
    this.updateIconState("expand-btn", isMaximized);

    this.layoutEditor();
  }

  private toggleOutputMaximize() {
    const main = document.querySelector(".ide-main");
    if (!main) return;

    // Reset editor maximize if active
    if (main.classList.contains("editor-maximized")) {
      main.classList.remove("editor-maximized");
      this.updateIconState("expand-btn", false);
    }

    const isMaximized = main.classList.toggle("output-maximized");

    // Update Icon
    this.updateIconState("toggle-output-max", isMaximized);

    this.layoutEditor();
  }

  private layoutEditor() {
    // Notify Monaco to resize after transition
    setTimeout(() => {
      this.editor.layout();
    }, 350);
  }

  private updateIconState(btnId: string, isActive: boolean) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const max = btn.querySelector(".icon-maximize") as HTMLElement;
    const min = btn.querySelector(".icon-minimize") as HTMLElement;

    if (max) max.style.display = isActive ? "none" : "";
    if (min) min.style.display = isActive ? "" : "none";
  }

  private updateConfig(newConfig: Partial<typeof this.config>) {
    this.config = { ...this.config, ...newConfig };
    this.applyConfig();
    this.saveConfig();
    this.renderConfigUI();
  }

  private applyConfig() {
    this.editor.updateOptions({
      fontSize: this.config.fontSize,
      wordWrap: this.config.wordWrap ? "on" : "off",
      minimap: { enabled: this.config.minimap },
    });
  }

  private renderConfigUI() {
    const display = document.getElementById("font-display");
    if (display) display.textContent = `${this.config.fontSize}px`;

    const wrapToggle = document.getElementById(
      "toggle-wordwrap",
    ) as HTMLInputElement;
    if (wrapToggle) wrapToggle.checked = this.config.wordWrap;

    const mapToggle = document.getElementById(
      "toggle-minimap",
    ) as HTMLInputElement;
    if (mapToggle) mapToggle.checked = this.config.minimap;
  }

  private saveConfig() {
    localStorage.setItem("playground-config", JSON.stringify(this.config));
  }

  private loadConfig() {
    const saved = localStorage.getItem("playground-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      } catch (e) {
        console.warn("Invalid config saved");
      }
    }
    // Apply initial config
    this.renderConfigUI();
    // setTimeout to ensure editor is ready or apply immediately if editor exists
    setTimeout(() => this.applyConfig(), 100);
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
                   <button class="tab-close" title="Fechar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                   </button>
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
