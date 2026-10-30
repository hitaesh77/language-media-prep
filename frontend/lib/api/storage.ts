import { readSavedSet } from "./contracts";
import type { SavedSet } from "./types";
import { SAMPLE } from "../sample";

function untouchedSeed(set: SavedSet): boolean {
  const names = ["The Little Prince", "Cairo Travel Article", "Arabic Short Story"];
  const index = names.findIndex(
    (name, i) => set.id === `sample-${i}` && set.name === name,
  );
  return (
    index >= 0 &&
    !set.generation &&
    !set.pages &&
    set.text === SAMPLE &&
    set.createdAt === "2026-10-28T00:00:00Z" &&
    set.type === (index === 1 ? "Pasted text" : "PDF") &&
    set.preferences.level === "Intermediate" &&
    set.preferences.variety === "Modern Standard Arabic (MSA)" &&
    set.preferences.language === "English" &&
    set.vocabulary.every((v) => !v.familiar) &&
    set.selected.length === set.segments.length
  );
}

export const STORAGE_KEY = "sahih-sets-v1";
export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class StorageError extends Error {
  constructor(
    public readonly kind: "corrupt" | "unavailable" | "save",
    message: string,
  ) {
    super(message);
  }
}
export class Library {
  constructor(private readonly supplied?: BrowserStorage) {}
  private storage() {
    try {
      return this.supplied ?? window.localStorage;
    } catch {
      throw new StorageError(
        "unavailable",
        "Browser storage is unavailable. Allow site storage, then retry.",
      );
    }
  }
  read(): SavedSet[] {
    let raw: string | null;
    try {
      raw = this.storage().getItem(STORAGE_KEY);
    } catch {
      throw new StorageError(
        "unavailable",
        "Browser storage is unavailable. Allow site storage, then retry.",
      );
    }
    if (raw === null) return [];
    let sets: SavedSet[];
    try {
      const values: unknown = JSON.parse(raw);
      if (!Array.isArray(values)) throw Error();
      sets = values.map(readSavedSet);
      if (new Set(sets.map((s) => s.id)).size !== sets.length) throw Error();
    } catch {
      throw new StorageError(
        "corrupt",
        "Saved data could not be read. Reset unreadable local data to recover; this deletes the saved sets in this browser.",
      );
    }
    const ownSets = sets.filter((s) => !untouchedSeed(s));
    if (ownSets.length !== sets.length) this.write(ownSets);
    return ownSets;
  }
  write(sets: SavedSet[]) {
    try {
      this.storage().setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
      throw new StorageError(
        "save",
        "Could not save in this browser. Free storage or allow site storage, then retry. Your previous saved data was not replaced.",
      );
    }
  }
  resetUnreadable() {
    try {
      this.read();
      return;
    } catch (e) {
      if (!(e instanceof StorageError) || e.kind !== "corrupt") throw e;
    }
    try {
      this.storage().removeItem(STORAGE_KEY);
    } catch {
      throw new StorageError(
        "unavailable",
        "Could not reset browser storage. Allow site storage and retry.",
      );
    }
  }
}
export function resetUnreadableLocalData() {
  new Library().resetUnreadable();
}
