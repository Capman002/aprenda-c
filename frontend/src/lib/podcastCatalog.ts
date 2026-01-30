export type PodcastVoice = "orus" | "leda";

type VoiceMap = Partial<Record<PodcastVoice, string>>;

type GlobImport = Record<string, string>;

const files = import.meta.glob<string>("../content/podcast/**/**/*.ogg", {
  eager: true,
  as: "url",
}) as GlobImport;

function normalizeSegment(segment: string): string {
  return segment.replace(/^\d+-/, "");
}

function parseAudioPath(path: string): { voice: PodcastVoice; topicSlug: string } | null {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/\/podcast\/(orus|leda)\/([^/]+)\/([^/]+)\.ogg$/);
  if (!match) return null;

  const voice = match[1] as PodcastVoice;
  const moduleFolder = normalizeSegment(match[2]);
  const fileSlug = normalizeSegment(match[3]);

  return {
    voice,
    topicSlug: `${moduleFolder}/${fileSlug}`,
  };
}

const catalog: Record<string, VoiceMap> = {};

for (const [path, url] of Object.entries(files)) {
  const parsed = parseAudioPath(path);
  if (!parsed) continue;

  (catalog[parsed.topicSlug] ??= {})[parsed.voice] = url;
}

export function getPodcastAudioUrl(
  topicSlug: string,
  voice: PodcastVoice,
): string | null {
  return catalog[topicSlug]?.[voice] ?? null;
}

export function hasPodcastForTopic(topicSlug: string): boolean {
  const entry = catalog[topicSlug];
  return Boolean(entry && (entry.orus || entry.leda));
}
