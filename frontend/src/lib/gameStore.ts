export interface AudioProgress {
  completed: boolean;
  positionSeconds: number;
  durationSeconds?: number;
  timestamp: number;
}

export interface TopicProgress {
  completed: boolean;
  score?: number;
  attempts?: number;
  timestamp: number;
  audio?: AudioProgress;
}

export interface ModuleExamProgress {
  passed: boolean;
  score?: number;
  attempts?: number;
  timestamp: number;
}

export interface GameState {
  version: number;
  topics: Record<string, TopicProgress>; // entry.slug -> progress
  moduleExams: Record<string, ModuleExamProgress>; // moduleId -> progress
  totalXp: number;
  level: number;
}

const STORAGE_KEY = "c_course_gamification_v1";
const CURRENT_VERSION = 2;

class GameStore {
  private state: GameState;

  constructor() {
    this.state = this.loadState();
  }

  public setTopicCompleted(slug: string, completed: boolean) {
    const previous = this.state.topics[slug];

    if (completed) {
      const wasCompleted = previous?.completed ?? false;
      this.state.topics[slug] = {
        completed: true,
        score: previous?.score,
        attempts: previous?.attempts,
        timestamp: Date.now(),
        audio: previous?.audio,
      };

      if (!wasCompleted) {
        this.addXp(50);
        return;
      }

      this.saveState();
      return;
    }

    if (!previous) return;

    this.state.topics[slug] = {
      completed: false,
      score: previous.score,
      attempts: previous.attempts,
      timestamp: Date.now(),
      audio: previous.audio,
    };

    this.saveState();
  }

  private getEmptyState(): GameState {
    return {
      version: CURRENT_VERSION,
      topics: {},
      moduleExams: {},
      totalXp: 0,
      level: 1,
    };
  }

  private normalizeState(input: any): GameState {
    const base = this.getEmptyState();

    if (!input || typeof input !== "object") return base;

    const topics: Record<string, TopicProgress> =
      input.topics && typeof input.topics === "object" ? input.topics : {};

    const moduleExams: Record<string, ModuleExamProgress> =
      input.moduleExams && typeof input.moduleExams === "object"
        ? input.moduleExams
        : {};

    return {
      version:
        typeof input.version === "number" ? input.version : CURRENT_VERSION,
      topics,
      moduleExams,
      totalXp: typeof input.totalXp === "number" ? input.totalXp : 0,
      level: typeof input.level === "number" ? input.level : 1,
    };
  }

  private loadState(): GameState {
    if (typeof localStorage === "undefined") {
      return this.getEmptyState();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return this.getEmptyState();
    }

    try {
      const parsed = JSON.parse(stored);
      const normalized = this.normalizeState(parsed);
      if (normalized.version !== CURRENT_VERSION) {
        normalized.version = CURRENT_VERSION;
        this.state = normalized;
        this.saveState();
      }
      return normalized;
    } catch (e) {
      console.error("Failed to load game state", e);
      return this.getEmptyState();
    }
  }

  private saveState() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    if (typeof window !== "undefined") {
      // Dispatch event for UI updates
      window.dispatchEvent(
        new CustomEvent("gamification-update", { detail: this.state }),
      );
    }
  }

  public completeTopic(slug: string, score: number, maxScore: number) {
    const previous = this.state.topics[slug];

    const scorePercentage = maxScore > 0 ? score / maxScore : 0;
    const isFirstTime = !previous?.completed;

    let xpGained = 0;

    if (isFirstTime) {
      xpGained += 100;
      xpGained += Math.floor(scorePercentage * 50);
    } else {
      if ((previous.score || 0) < scorePercentage) {
        xpGained += 10;
      }
    }

    this.state.topics[slug] = {
      completed: true,
      score: Math.max(previous?.score || 0, scorePercentage),
      attempts: (previous?.attempts || 0) + 1,
      timestamp: Date.now(),
      audio: previous?.audio,
    };

    if (xpGained > 0) {
      this.addXp(xpGained);
    } else {
      this.saveState();
    }
  }

  public setAudioProgress(
    slug: string,
    positionSeconds: number,
    durationSeconds?: number,
  ) {
    const previous = this.state.topics[slug];

    const completed =
      typeof durationSeconds === "number" && durationSeconds > 0
        ? positionSeconds >= durationSeconds
        : false;

    this.state.topics[slug] = {
      completed: previous?.completed ?? false,
      score: previous?.score,
      attempts: previous?.attempts,
      timestamp: previous?.timestamp ?? Date.now(),
      audio: {
        completed,
        positionSeconds,
        durationSeconds,
        timestamp: Date.now(),
      },
    };

    this.saveState();
  }

  public completeModuleExam(
    moduleId: string,
    score: number,
    maxScore: number,
    passingScore: number,
  ) {
    const previous = this.state.moduleExams[moduleId];

    const scorePercentage = maxScore > 0 ? score / maxScore : 0;
    const passed = scorePercentage >= passingScore;

    let xpGained = 0;

    const firstPass = passed && !previous?.passed;
    if (firstPass) {
      xpGained += 250;
      xpGained += Math.floor(scorePercentage * 100);
    } else if (passed && (previous?.score || 0) < scorePercentage) {
      xpGained += 25;
    }

    this.state.moduleExams[moduleId] = {
      passed,
      score: Math.max(previous?.score || 0, scorePercentage),
      attempts: (previous?.attempts || 0) + 1,
      timestamp: Date.now(),
    };

    if (xpGained > 0) {
      this.addXp(xpGained);
    } else {
      this.saveState();
    }
  }

  private addXp(amount: number) {
    this.state.totalXp += amount;

    const nextLevelXp = this.state.level * 1000;
    if (this.state.totalXp >= nextLevelXp) {
      this.state.level++;
    }

    this.saveState();
  }

  public getTopic(slug: string) {
    return this.state.topics[slug];
  }

  public getModuleExam(moduleId: string) {
    return this.state.moduleExams[moduleId];
  }

  public getState() {
    return this.state;
  }

  public reset() {
    this.state = this.getEmptyState();
    this.saveState();
  }
}

// Singleton for client-side usage
export const gameStore = new GameStore();
