export type Segment = { id: string; text: string };
export type Preferences = { level: string; variety: string; language: string };
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
};
export type GenerateRequest = Omit<SavedSet, "id" | "vocabulary" | "createdAt"> & {
  id?: string;
};
export interface PrepClient {
  listSets(): Promise<SavedSet[]>;
  processContent(
    text: string,
    file?: File,
  ): Promise<{ text: string; segments: Segment[] }>;
  generateVocabulary(request: GenerateRequest): Promise<SavedSet>;
  updateFamiliar(id: string, itemIds: string[]): Promise<SavedSet>;
  getSet(id: string): Promise<SavedSet>;
}
