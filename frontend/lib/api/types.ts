export type Segment = { id: string; text: string };
export type PageReference = { page: number; segmentIds: string[] };
export type SourceContent = {
  text: string;
  segments: Segment[];
  pages?: PageReference[];
};
export type GenerationMetadata = {
  mode: "llm";
  elapsedMs: number;
  usage: Record<string, number> | null;
  cost: null;
  notice: string;
};
export type Preferences = {
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
  pages?: PageReference[];
  generation?: GenerationMetadata;
};
export type GenerateRequest = Omit<SavedSet, "id" | "vocabulary" | "createdAt"> & {
  id?: string;
};
export interface PrepClient {
  listSets(): Promise<SavedSet[]>;
  processContent(text: string, file?: File): Promise<SourceContent>;
  generateVocabulary(request: GenerateRequest): Promise<SavedSet>;
  updateFamiliar(id: string, itemIds: string[]): Promise<SavedSet>;
  getSet(id: string): Promise<SavedSet>;
  deleteSet(id: string): Promise<void>;
  cancelPending(): void;
}
