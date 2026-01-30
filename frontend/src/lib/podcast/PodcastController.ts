import { gameStore } from "../gameStore";

export interface Track {
  slug: string;
  title: string;
  moduleTitle?: string;
  audioOrus?: string | null;
  audioLeda?: string | null;
}

type Voice = "orus" | "leda";

const VOICE_KEY = "podcast-voice";
const PROGRESS_KEY = "podcast-progress-v1";
const AD_SESSION_KEY = "podcast-ad-session-v1";
const AD_TRACK_COUNT_KEY = "podcast-ad-track-count";

export class PodcastController {
  private audio: HTMLAudioElement;
  private trackList: Track[] = [];
  private currentTrackIndex: number = -1;
  private currentVoice: Voice = "orus";

  private isAdPlaying: boolean = false;
  private sessionTracksPlayed: number = 0;

  private adUrl1: string | null = null;
  private adUrl2: string | null = null;

  // Callbacks para UI
  public onStateChange?: () => void;
  public onTrackChange?: (track: Track | null) => void;

  constructor(audioElement: HTMLAudioElement, adUrl1: string, adUrl2: string) {
    this.audio = audioElement;
    this.adUrl1 = adUrl1;
    this.adUrl2 = adUrl2;

    this.loadSettings();
    this.setupAudioListeners();
    this.loadAdState();
  }

  private loadSettings() {
    try {
      const v = localStorage.getItem(VOICE_KEY);
      if (v === "orus" || v === "leda") this.currentVoice = v;
    } catch {}
  }

  private loadAdState() {
    try {
      const c = sessionStorage.getItem(AD_TRACK_COUNT_KEY);
      this.sessionTracksPlayed = c ? parseInt(c, 10) : 0;
      if (isNaN(this.sessionTracksPlayed)) this.sessionTracksPlayed = 0;
    } catch {}
  }

  public setPlaylist(tracks: Track[]) {
    this.trackList = tracks;
  }

  public get state() {
    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration,
      currentTrack: this.getCurrentTrack(),
      currentVoice: this.currentVoice,
      isAdPlaying: this.isAdPlaying,
      canOrus: !!this.getCurrentTrack()?.audioOrus,
      canLeda: !!this.getCurrentTrack()?.audioLeda,
    };
  }

  public getCurrentTrack(): Track | null {
    if (
      this.currentTrackIndex < 0 ||
      this.currentTrackIndex >= this.trackList.length
    )
      return null;
    return this.trackList[this.currentTrackIndex];
  }

  // --- Audio Control ---

  public async play() {
    if (this.isAdPlaying) {
      await this.audio.play();
      return;
    }

    // Se não tem source, tenta carregar
    if (!this.audio.currentSrc && !this.audio.src) {
      const track = this.getCurrentTrack();
      if (track) await this.loadTrack(track, this.currentVoice);
      else return;
    }

    await this.audio.play();
  }

  public pause() {
    this.audio.pause();
  }

  public togglePlay() {
    if (this.audio.paused) this.play();
    else this.pause();
  }

  public setVolume(val: number) {
    this.audio.volume = Math.max(0, Math.min(1, val));
  }

  public seek(time: number) {
    if (this.isAdPlaying) return; // Bloqueia seek no Ad
    if (Number.isFinite(time)) this.audio.currentTime = time;
  }

  public setVoice(v: Voice) {
    if (this.isAdPlaying) return;
    if (v === this.currentVoice) return;

    this.currentVoice = v;
    try {
      localStorage.setItem(VOICE_KEY, v);
    } catch {}

    // Se estiver tocando, troca
    const track = this.getCurrentTrack();
    if (track) {
      this.loadTrack(track, v, true); // true = autoPlay se estava tocando? Melhor sempre carregar e manter estado
    }
  }

  // --- Track Management ---

  public loadTrackBySlug(slug: string) {
    if (this.isAdPlaying) return; // Talvez permitir skip ad trocando de track? Mantendo bloqueio conforme original.

    const idx = this.trackList.findIndex((t) => t.slug === slug);
    if (idx >= 0) {
      this.currentTrackIndex = idx;
      const track = this.trackList[idx];

      // Decidir se toca Ad ou Conteúdo
      this.playContentOrAd(track);
    }
  }

  public nextTrack() {
    if (this.isAdPlaying) return;
    if (this.currentTrackIndex < this.trackList.length - 1) {
      this.currentTrackIndex++;
      this.playContentOrAd(this.trackList[this.currentTrackIndex]);
    }
  }

  public prevTrack() {
    if (this.isAdPlaying) return;
    if (this.currentTrackIndex > 0) {
      this.currentTrackIndex--;
      this.playContentOrAd(this.trackList[this.currentTrackIndex]);
    }
  }

  // --- Core Logic: Ads vs Content ---

  private playContentOrAd(track: Track) {
    const adUrl = this.getNextAdUrl();

    if (adUrl) {
      this.playAd(adUrl, track);
    } else {
      this.playContent(track);
    }
  }

  private getNextAdUrl(): string | null {
    // Lógica idêntica ao original
    const sessionKey = sessionStorage.getItem(AD_SESSION_KEY);
    if (sessionKey !== "visited") {
      try {
        sessionStorage.setItem(AD_SESSION_KEY, "visited");
      } catch {}
      return this.adUrl1 || null;
    }

    const shouldTrigger =
      this.sessionTracksPlayed > 0 && this.sessionTracksPlayed % 3 === 0;
    if (shouldTrigger) return this.adUrl2 || null;

    return null;
  }

  private async playAd(url: string, nextTrack: Track) {
    this.isAdPlaying = true;
    this.audio.src = url;
    this.audio.load();

    this.notifyChange();

    try {
      await this.audio.play();
    } catch (e) {
      console.error("Ad play failed", e);
    }
  }

  private async playContent(track: Track) {
    this.isAdPlaying = false;
    // Marca contagem aqui
    this.sessionTracksPlayed++;
    try {
      sessionStorage.setItem(
        AD_TRACK_COUNT_KEY,
        String(this.sessionTracksPlayed),
      );
    } catch {}

    await this.loadTrack(track, this.currentVoice, true);
  }

  private async loadTrack(
    track: Track,
    voice: Voice,
    autoPlay: boolean = false,
  ) {
    const url = voice === "orus" ? track.audioOrus : track.audioLeda;

    // Fallback
    const finalUrl =
      url || (voice === "orus" ? track.audioLeda : track.audioOrus);

    if (!finalUrl) {
      console.warn("No audio for track", track.title);
      return;
    }

    this.audio.src = finalUrl;

    // Recuperar progresso
    const progress = this.loadProgress(track.slug, voice);
    if (progress > 0) {
      this.audio.currentTime = progress;
    }

    this.notifyChange(track);

    if (autoPlay) {
      try {
        await this.audio.play();
      } catch {}
    }
  }

  // --- Persistence & Listeners ---

  private loadProgress(slug: string, voice: string): number {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed[slug]?.[voice]?.position ?? 0;
    } catch {
      return 0;
    }
  }

  private saveProgress() {
    if (this.isAdPlaying) return;
    const track = this.getCurrentTrack();
    if (!track) return;

    const cur = this.audio.currentTime;
    const dur = this.audio.duration;

    const p = this.loadAllProgress();
    (p[track.slug] ??= {})[this.currentVoice] = {
      position: cur,
      duration: dur,
    };

    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    } catch {}

    // Atualiza GameStore externo também, como side-effect
    gameStore.setAudioProgress(track.slug, cur, dur);
  }

  private loadAllProgress(): any {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  private setupAudioListeners() {
    this.audio.addEventListener("timeupdate", () => {
      this.saveProgress(); // Throttle if needed? Browser usually throttles timeupdate to 250ms
      this.notifyChange();
    });

    this.audio.addEventListener("ended", () => {
      if (this.isAdPlaying) {
        // Ad acabou, toca conteúdo atual
        const track = this.getCurrentTrack();
        if (track) this.playContent(track);
      } else {
        // Conteúdo acabou, próximo
        this.nextTrack();
      }
    });

    this.audio.addEventListener("play", () => this.notifyChange());
    this.audio.addEventListener("pause", () => this.notifyChange());
    this.audio.addEventListener("durationchange", () => this.notifyChange());
  }

  private notifyChange(track?: Track) {
    if (this.onStateChange) this.onStateChange();
    if (track !== undefined && this.onTrackChange)
      this.onTrackChange(track || this.getCurrentTrack());
  }
}
