export type Segment = { id: string; text: string };
export type SubtitleReference = {
  sourceId: string;
  cueId: string;
  startMs: number;
  endMs: number;
};
export type PageReference = { page: number; segmentIds: string[] };
export type SourceContent = {
  text: string;
  segments: Segment[];
  pages?: PageReference[];
  failedPages?: { page: number; reason: string }[];
};
export type GenerationMetadata = {
  mode: "llm";
  elapsedMs: number;
  usage: Record<string, number> | null;
  cost: null;
  notice: string;
};
export const CATEGORIES = [
  "nouns",
  "verbs",
  "adjectives",
  "prepositions",
  "roots",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const DEFAULT_CATEGORIES: Category[] = ["nouns", "verbs", "adjectives"];
export type Preferences = {
  categories?: Category[];
  level: string;
  variety: string;
  language: string;
  cardsPerPassage?: number;
};
export type Vocabulary = {
  id: string;
  expression: string;
  meaning: string;
  sourceId: string;
  context: string;
  familiar: boolean;
};
export type SavedSet = {
  id: string;
  name: string;
  type: "PDF" | "Pasted text";
  text: string;
  segments: Segment[];
  selected: string[];
  preferences: Preferences;
  vocabulary: Vocabulary[];
  createdAt: string;
  starred?: boolean;
  subtitles?: SubtitleReference[];
  pages?: PageReference[];
  generation?: GenerationMetadata;
};
export type GenerateRequest = Omit<
  SavedSet,
  "id" | "vocabulary" | "createdAt" | "starred"
> & {
  id?: string;
};
export interface PrepClient {
  listSets(): Promise<SavedSet[]>;
  processContent(
    text: string,
    file?: File,
    range?: { start: number; end?: number },
  ): Promise<SourceContent>;
  importPdf(file: File, onProgress: (done: number, total: number) => void): Promise<SourceContent>;
  generateVocabulary(request: GenerateRequest, onProgress?: (message: string) => void): Promise<SavedSet>;
  updateFamiliar(id: string, itemIds: string[]): Promise<SavedSet>;
  getSet(id: string): Promise<SavedSet>;
  deleteSet(id: string): Promise<void>;
  updateStarred(id: string, starred: boolean): Promise<SavedSet>;
  cancelPending(): void;
}
