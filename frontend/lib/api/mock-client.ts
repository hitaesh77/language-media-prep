import type { GenerateRequest, PrepClient, SavedSet, Segment } from "./types";
export const SAMPLE =
  "في صباح يوم مشمس، قررت سارة أن تزور المدينة القديمة. كانت تبحث عن كتاب في المكتبة، بينما كان الباعة يبيعون الفاكهة في الشوارع الضيقة.\n\nجلست سارة قرب النافذة وبدأت تقرأ قصة عن مسافر اكتشف قرية صغيرة بين الجبال. شعرت بالهدوء والفضول، وقررت أن تعود كل أسبوع.";
const lexicon: Record<string, string[]> = {
  صباح: ["morning", "صباح", "mañana"],
  مشمس: ["sunny", "مضيء بالشمس", "soleado"],
  "المدينة القديمة": ["the old city", "القسم القديم من المدينة", "la ciudad antigua"],
  كتاب: ["a book", "مؤلَّف للقراءة", "un libro"],
  المكتبة: ["the library", "مكان لحفظ الكتب وقراءتها", "la biblioteca"],
  الباعة: ["vendors", "الأشخاص الذين يبيعون السلع", "vendedores"],
  الفاكهة: ["fruit", "ثمار تؤكل", "fruta"],
  الشوارع: ["the streets", "طرق داخل المدينة", "las calles"],
  النافذة: ["the window", "فتحة في الجدار للضوء والهواء", "la ventana"],
  مسافر: ["a traveler", "شخص ينتقل من مكان إلى آخر", "un viajero"],
  "قرية صغيرة": ["a small village", "تجمع سكني صغير", "un pueblo pequeño"],
  الجبال: ["the mountains", "مرتفعات كبيرة من الأرض", "las montañas"],
  بالهدوء: ["with calm", "بالسكينة", "con calma"],
  والفضول: ["and curiosity", "والرغبة في المعرفة", "y curiosidad"],
};

// All demo persistence stays behind this API implementation.
// Keep the original key so the Lingo rename preserves existing saved sets.
const KEY = "sahih-sets-v1";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Hash the untouched source so identical input receives identical paragraph IDs.
export async function segmentText(text: string): Promise<Segment[]> {
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return text
    .split(/\r?\n\s*\r?\n/)
    .filter((p) => p.trim())
    .map((text, i) => ({ id: `${hash}-${i}`, text }));
}

// Glossary examples are illustrative; unmatched text never receives invented meanings.
function buildMockVocabulary(segments: Segment[], language: string) {
  const languageIndex = language === "Arabic" ? 1 : 0;
  const found = Object.entries(lexicon).flatMap(([expression, meanings]) => {
    const segment = segments.find((s) => s.text.includes(expression));
    return segment
      ? [
          {
            id: `${segment.id}:${expression}`,
            expression,
            meaning: meanings[languageIndex],
            sourceId: segment.id,
            context: segment.text,
            familiar: false,
          },
        ]
      : [];
  });
  if (found.length) return found.slice(0, 15);

  const tokens = [
    ...new Set(
      segments.flatMap((s) => s.text.match(/[\u0621-\u064A\u064B-\u065F]+/g) || []),
    ),
  ]
    .filter((w) => w.length > 2)
    .slice(0, 12);

  return tokens.map((expression) => {
    const s = segments.find((s) => s.text.includes(expression))!;
    return {
      id: `${s.id}:${expression}`,
      expression,
      meaning: "Meaning unavailable in this demo — connect the generation endpoint.",
      sourceId: s.id,
      context: s.text,
      familiar: false,
    };
  });
}

async function createSeedSets(): Promise<SavedSet[]> {
  const segments = await segmentText(SAMPLE);
  return ["The Little Prince", "Cairo Travel Article", "Arabic Short Story"].map(
    (name, i) => ({
      id: `sample-${i}`,
      name,
      type: i === 1 ? "Pasted text" : "PDF",
      text: SAMPLE,
      segments,
      selected: segments.map((s) => s.id),
      preferences: {
        level: "Intermediate",
        variety: "Modern Standard Arabic (MSA)",
        language: "English",
      },
      vocabulary: buildMockVocabulary(segments, "English"),
      createdAt: "2026-10-28T00:00:00Z",
    }),
  );
}

async function read(): Promise<SavedSet[]> {
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    const data = await createSeedSets();
    write(data);
    return data;
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isSavedSet)) throw Error();
    return data;
  } catch {
    throw new Error("Saved data could not be read. Reset local demo data to recover.");
  }
}

function isSavedSet(s: SavedSet) {
  return (
    s &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.text === "string" &&
    s.text.length <= 20000 &&
    ["PDF", "Pasted text"].includes(s.type) &&
    typeof s.createdAt === "string" &&
    Array.isArray(s.selected) &&
    s.selected.every((id) => typeof id === "string") &&
    Array.isArray(s.segments) &&
    s.segments.every(
      (p) => p && typeof p.id === "string" && typeof p.text === "string",
    ) &&
    s.preferences &&
    typeof s.preferences.level === "string" &&
    typeof s.preferences.variety === "string" &&
    typeof s.preferences.language === "string" &&
    Array.isArray(s.vocabulary) &&
    s.vocabulary.every(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.expression === "string" &&
        typeof v.meaning === "string" &&
        typeof v.context === "string" &&
        typeof v.sourceId === "string" &&
        typeof v.familiar === "boolean",
    )
  );
}

function write(sets: SavedSet[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sets));
  } catch {
    throw new Error(
      "Could not save on this device. Free browser storage or allow local storage, then retry.",
    );
  }
}

export function resetDemo() {
  localStorage.removeItem(KEY);
}

export const mockClient: PrepClient = {
  cancelPending() {},
  async deleteSet(id) {
    write((await read()).filter((s) => s.id !== id));
  },
  listSets: read,

  async getSet(id) {
    const set = (await read()).find((s) => s.id === id);
    if (!set)
      throw Error("This set is no longer available. Return home and try another.");
    return set;
  },

  async processContent(text, file) {
    if (file) {
      if (
        !file.name.toLowerCase().endsWith(".pdf") ||
        (file.type && file.type !== "application/pdf")
      )
        throw Error("Choose a PDF file.");
      if (file.size === 0 || file.size > 4 * 1024 * 1024)
        throw Error("Choose a nonempty PDF no larger than 4 MiB.");
      await delay(450);
      text = SAMPLE;
    }
    if (!text.trim() || text.length > 20000)
      throw Error("Enter between 1 and 20,000 characters.");
    if (!/[\u0621-\u064A]/.test(text))
      throw Error("Please include Arabic text in your passage.");
    return { text, segments: await segmentText(text) };
  },

  async generateVocabulary(request: GenerateRequest) {
    await delay(1200);
    if (!request.text.trim() || request.text.length > 20000)
      throw Error("Enter between 1 and 20,000 characters.");
    const segments = await segmentText(request.text);
    if (
      !request.name.trim() ||
      !request.selected.length ||
      request.selected.some((id) => !segments.some((s) => s.id === id))
    )
      throw Error("Select at least one valid passage and provide a source name.");
    const vocabulary = buildMockVocabulary(
      segments.filter((s) => request.selected.includes(s.id)),
      request.preferences.language,
    );
    if (!vocabulary.length)
      throw Error("No Arabic expressions found. Try a longer passage.");
    const existing = await read();
    const previous = existing.find((s) => s.id === request.id);
    const set: SavedSet = {
      ...request,
      segments,
      id: request.id || crypto.randomUUID(),
      vocabulary,
      createdAt: previous?.createdAt || new Date().toISOString(),
    };
    write([...existing.filter((s) => s.id !== set.id), set]);
    return set;
  },

  async updateFamiliar(id, itemIds) {
    const sets = await read();
    const set = sets.find((s) => s.id === id);
    if (!set) throw Error("Set not found.");
    set.vocabulary = set.vocabulary.map((v) => ({
      ...v,
      familiar: itemIds.includes(v.id),
    }));
    write(sets);
    return set;
  },
};
