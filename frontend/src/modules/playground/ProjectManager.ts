import type { IProjectManager, ProjectFile } from "./types";

/**
 * ProjectManager (Core Layer)
 * Responsável APENAS pelo estado logico do projeto.
 * Não sabe o que é DOM, não sabe o que é Monaco, não sabe o que é Fetch.
 * Extremamente testável.
 */
export class ProjectManager implements IProjectManager {
  private files: Map<string, string>;
  private activeFile: string;
  private openTabs: Set<string>;

  constructor(initialFiles: Map<string, string> = new Map()) {
    this.files = initialFiles;
    // Lógica de inicialização segura
    this.activeFile = this.files.keys().next().value || "main.c";
    this.openTabs = new Set([this.activeFile]);
  }

  getFiles() {
    return this.files;
  }

  getFileContent(name: string): string | undefined {
    return this.files.get(name);
  }

  setFileContent(name: string, content: string): void {
    if (this.files.has(name)) {
      this.files.set(name, content);
    }
  }

  createFile(name: string, content: string = ""): boolean {
    if (this.files.has(name)) return false;

    // Validação básica
    if (!name.match(/^[a-zA-Z0-9._-]+$/)) return false;

    this.files.set(name, content);
    this.openTab(name);
    this.setActiveFile(name);
    return true;
  }

  deleteFile(name: string): boolean {
    if (!this.files.has(name)) return false;

    // Impedir deletar o último arquivo
    if (this.files.size <= 1) return false;

    this.files.delete(name);
    this.openTabs.delete(name);

    // Se deletou o arquivo ativo, define um novo
    if (this.activeFile === name) {
      this.activeFile = this.files.keys().next().value || "";
      if (this.activeFile) this.openTabs.add(this.activeFile);
    }

    return true;
  }

  clear(): void {
    this.files.clear();
    this.openTabs.clear();
    this.activeFile = "";
  }

  getActiveFile(): string {
    return this.activeFile;
  }

  setActiveFile(name: string): void {
    if (this.files.has(name)) {
      this.activeFile = name;
      this.openTabs.add(name);
    }
  }

  getOpenTabs(): Set<string> {
    return this.openTabs;
  }

  openTab(name: string): void {
    if (this.files.has(name)) {
      this.openTabs.add(name);
    }
  }

  closeTab(name: string): string | null {
    if (this.openTabs.size <= 1) return null; // Mantém pelo menos uma aba

    this.openTabs.delete(name);

    if (this.activeFile === name) {
      // Se fechou a aba ativa, muda para a primeira disponível
      const next = this.openTabs.values().next().value || null;
      if (next) this.setActiveFile(next);
      return next;
    }

    return this.activeFile; // Arquivo ativo não mudou
  }

  // Persistência (Helpers puros)
  serialize(): string {
    return JSON.stringify({
      files: Array.from(this.files.entries()),
      activeFile: this.activeFile,
      openTabs: Array.from(this.openTabs),
    });
  }

  static deserialize(json: string): ProjectManager | null {
    try {
      const data = JSON.parse(json);
      if (data.files && Array.isArray(data.files)) {
        const manager = new ProjectManager(new Map(data.files));
        if (data.activeFile) manager.setActiveFile(data.activeFile);
        if (data.openTabs) manager.openTabs = new Set(data.openTabs);
        return manager;
      }
    } catch (e) {
      console.error("Failed to load project:", e);
    }
    return null;
  }
}
