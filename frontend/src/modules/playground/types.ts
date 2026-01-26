export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface ExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  timestamp: string;
  error?: string;
}

export interface IProjectManager {
  getFiles(): Map<string, string>;
  getFileContent(name: string): string | undefined;
  setFileContent(name: string, content: string): void;
  createFile(name: string, content?: string): boolean;
  deleteFile(name: string): boolean;
  getActiveFile(): string;
  setActiveFile(name: string): void;
  getOpenTabs(): Set<string>;
  openTab(name: string): void;
  closeTab(name: string): string | null; // Retorna o próximo arquivo a focar
  clear(): void;
}

export interface ICodeEditor {
  init(container: HTMLElement): Promise<void>;
  setValue(value: string): void;
  getValue(): string;
  setLanguage(lang: string): void;
  layout(): void;
  onUserChange(callback: (value: string) => void): void;
}

export interface ICompilerService {
  run(files: Map<string, string>): Promise<ExecutionResult>;
  checkRuntime(): Promise<string>;
}
