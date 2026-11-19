"use client";
import { practiceBatches } from "../lib/practice";
import { preparePdfSelection } from "../lib/pdf-selection";
import { DEFAULT_CATEGORIES } from "../lib/api/types";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type SavedSet, type Segment, type Preferences } from "../lib/api/client";
import { resetUnreadableLocalData, StorageError } from "../lib/api/storage";
import type { PageReference, SubtitleReference } from "../lib/api/types";
import type { Screen } from "./prep-types";
import { AppShell } from "./app-shell";
import { HomeScreen } from "./screens/home-screen";
import { SubtitleScreen } from "./screens/subtitle-screen";
import { moviePosition, subtitleReferences } from "../lib/subtitle-range";
import { ContentScreen } from "./screens/content-screen";
import { PassagesScreen } from "./screens/passages-screen";
import { CustomizeScreen } from "./screens/customize-screen";
import { LoadingScreen } from "./screens/loading-screen";
import { VocabularyScreen } from "./screens/vocabulary-screen";
import { PracticeScreen } from "./screens/practice-screen";
import { CompletionScreen } from "./screens/completion-screen";

// Provisional starting preferences for a new set.
const defaults: Preferences = {
  level: "Intermediate",
  categories: DEFAULT_CATEGORIES,
  variety: "Modern Standard Arabic (MSA)",
  language: "English",
};

export default function PrepApp() {
  const operation = useRef(0);
  // Navigation and saved-set state.
  const [screen, setScreen] = useState<Screen>("home");
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [active, setActive] = useState<SavedSet | null>(null);

  // Draft content and learner preferences, retained when navigating backward.
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"Pasted text" | "PDF">("Pasted text");
  const [file, setFile] = useState<File>();
  const [progress, setProgress] = useState("");
  const [failedPages, setFailedPages] = useState<{ page: number; reason: string }[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pages, setPages] = useState<PageReference[]>();
  const [subtitles, setSubtitles] = useState<SubtitleReference[]>();
  const [selected, setSelected] = useState<string[]>([]);
  const [prefs, setPrefs] = useState(defaults);

  // Request feedback and vocabulary filtering.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [filter, setFilter] = useState("All");

  // Practice uses a snapshot of unfamiliar cards for the current session.
  const [queue, setQueue] = useState<SavedSet["vocabulary"]>([]);
  const [batches, setBatches] = useState<SavedSet["vocabulary"][]>([]);
  const [batch, setBatch] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);

  const showError = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");

  useEffect(() => {
    api
      .listSets()
      .then(setSets)
      .catch((e) => {
        showError(e);
        setStorageError(e instanceof StorageError && e.kind === "corrupt");
      });
  }, []);

  function navigateTo(nextScreen: Screen) {
    setError("");
    setScreen(nextScreen);
    window.scrollTo({ top: 0 });
  }

  async function returnHome() {
    const run = ++operation.current;
    api.cancelPending();
    setBusy(false);
    navigateTo("home");
    try {
      const saved = await api.listSets();
      if (run === operation.current) setSets(saved);
    } catch (e) {
      if (run === operation.current) {
        showError(e);
        setStorageError(e instanceof StorageError && e.kind === "corrupt");
      }
    }
  }

  async function deleteSet(id: string) {
    try {
      await api.deleteSet(id);
      setSets(await api.listSets());
      if (active?.id === id) setActive(null);
    } catch (e) {
      showError(e);
      throw e;
    }
  }

  async function updateStarred(id: string, starred: boolean) {
    try {
      const updated = await api.updateStarred(id, starred);
      setSets(await api.listSets());
      if (active?.id === id) setActive(updated);
    } catch (e) {
      showError(e);
      throw e;
    }
  }

  function startNewSet() {
    setActive(null);
    setName("");
    setText("");
    setMode("Pasted text");
    setFile(undefined);
    setProgress("");
    setFailedPages([]);
    setSegments([]);
    setPages(undefined);
    setSubtitles(undefined);
    setSelected([]);
    setPrefs(defaults);
    navigateTo("content");
  }

  function openSet(set: SavedSet) {
    setActive(set);
    setName(set.name);
    setText(set.text);
    setMode(set.type);
    setSegments(set.segments);
    setPages(set.pages);
    setSubtitles(set.subtitles);
    setFile(undefined);
    setSelected(set.selected);
    setPrefs({
      ...set.preferences,
      categories: set.preferences.categories ?? DEFAULT_CATEGORIES,
    });
    setFilter("All");
    navigateTo("vocabulary");
  }

  async function processContent() {
    const run = ++operation.current;
    setBusy(true);
    setError("");
    try {
      setProgress(mode === "PDF" ? "Opening your PDF..." : "");
      const result = mode === "PDF" && file
        ? await api.importPdf(file, (done, total) => { if (run === operation.current) setProgress(`Processed ${done} of ${total} pages`); })
        : await api.processContent(text);
      if (run !== operation.current) return;
      setText(result.text);
      setSegments(result.segments);
      setPages(result.pages);
      setSubtitles(undefined);
      setFailedPages(result.failedPages ?? []);
      setSelected((previous) => screen === "passages" ? previous.filter((id) => result.segments.some((segment) => segment.id === id)) : mode === "PDF" ? [] : result.segments.map((s) => s.id));
      navigateTo("passages");
    } catch (e) {
      if (run === operation.current) showError(e);
    } finally {
      if (run === operation.current) setBusy(false);
    }
  }

  async function generateVocabulary() {
    if (busy) return;
    const run = ++operation.current;
    setBusy(true);
    navigateTo("loading");
    try {
      let generationText = text;
      let generationSegments = segments;
      let generationSelected = selected;
      let generationPages = pages;
      if (mode === "PDF" && !active) {
        const prepared = await preparePdfSelection(segments, pages, selected, async (source) => (await api.processContent(source)).segments);
        generationText = prepared.text;
        generationSegments = prepared.segments;
        generationSelected = prepared.selected;
        generationPages = prepared.pages;
      }
      const set = await api.generateVocabulary({
        id: active?.id,
        name: name.trim(),
        type: mode,
        text: generationText,
        segments: generationSegments,
        selected: generationSelected,
        preferences: prefs,
        pages: generationPages,
        subtitles,
      });
      if (run !== operation.current) return;
      setActive(set);
      setText(set.text);
      setSegments(set.segments);
      setSelected(set.selected);
      setPages(set.pages);
      setSubtitles(set.subtitles);
      setFilter("All");
      navigateTo("vocabulary");
    } catch (e) {
      if (run !== operation.current) return;
      setScreen("customize");
      showError(e);
    } finally {
      if (run === operation.current) setBusy(false);
    }
  }

  async function updateFamiliarSelections(ids: string[]) {
    if (!active) return;
    const run = ++operation.current;
    setBusy(true);
    try {
      const updated = await api.updateFamiliar(active.id, ids);
      if (run === operation.current) setActive(updated);
    } catch (e) {
      if (run === operation.current) showError(e);
    } finally {
      if (run === operation.current) setBusy(false);
    }
  }

  function startPractice() {
    if (!active) return;
    const groups = practiceBatches(active);
    if (!groups.length) return;
    setBatches(groups);
    setBatch(0);
    setQueue(groups[0]);
    setIndex(0);
    setFlipped(false);
    setReviewed([]);
    navigateTo("practice");
  }

  const advanceCard = useCallback(() => {
    const card = queue[index];
    if (!card) return;
    setReviewed((r) => (r.includes(card.id) ? r : [...r, card.id]));
    setFlipped(false);
    if (index === queue.length - 1) setScreen("complete");
    else setIndex((i) => i + 1);
  }, [index, queue]);

  useEffect(() => {
    if (screen !== "practice") return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("button,input,textarea,select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "ArrowRight") advanceCard();
      if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
        setFlipped(false);
      }
      if (e.key === "Escape") setScreen("vocabulary");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [screen, advanceCard]);

  const unfamiliar = active?.vocabulary.filter((item) => !item.familiar) || [];
  const familiarCount = active?.vocabulary.filter((item) => item.familiar).length || 0;
  const currentCard = queue[index];

  async function resetLocalData() {
    try {
      resetUnreadableLocalData();
      setSets(await api.listSets());
      setStorageError(false);
      setError("");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <AppShell screen={screen} onHome={returnHome}>
      {error && (
        <div className="error" role="alert">
          {error}
          {storageError && (
            <button onClick={resetLocalData}>Delete unreadable local data</button>
          )}
        </div>
      )}

      {screen === "home" && (
        <HomeScreen
          sets={sets}
          storageError={storageError}
          onCreateSet={startNewSet}
          onOpenSet={openSet}
          onDeleteSet={deleteSet}
          onStarSet={updateStarred}
        />
      )}

      {screen === "content" && (
        <ContentScreen
          name={name}
          text={text}
          mode={mode}
          file={file}
          progress={progress}
          busy={busy}
          onNameChange={setName}
          onTextChange={setText}
          onModeChange={setMode}
          onFileChange={setFile}
          onClearError={() => setError("")}
          onHome={returnHome}
          onMovie={() => navigateTo("subtitle")}
          onProcess={processContent}
        />
      )}

      {screen !== "home" && (
        <div hidden={screen !== "subtitle"}>
          <SubtitleScreen
            onBack={() => navigateTo("content")}
            onUse={async (cues, title) => {
              const source = cues.map((c) => c.text).join("\n\n");
              const result = { segments: source.split(/\r?\n\s*\r?\n/u).filter((part) => part.trim()).map((text, i) => ({ id: `subtitle:${i}`, text })) };
              const references = subtitleReferences(cues, result.segments);
              setName(title);
              setMode("Pasted text");
              setText(source);
              setSegments(result.segments);
              setPages(undefined);
              setSubtitles(references);
              setSelected(result.segments.map((s) => s.id));
              navigateTo("passages");
            }}
          />
        </div>
      )}
      {screen === "passages" && (
        <PassagesScreen
          name={name}
          mode={mode}
          segments={segments}
          pages={pages}
          subtitles={subtitles}
          selected={selected}
          failedPages={failedPages}
          busy={busy}
          progress={progress}
          onRetry={processContent}
          onNameChange={setName}
          onSelectionChange={setSelected}
          onBack={() => navigateTo(subtitles ? "subtitle" : "content")}
          onConfirm={() => navigateTo("customize")}
        />
      )}

      {screen === "customize" && (
        <CustomizeScreen
          preferences={prefs}
          isRegenerating={!!active}
          passageCount={selected.length}
          pdf={mode === "PDF" || !!subtitles}
          onChange={setPrefs}
          onBack={() => navigateTo(active ? "vocabulary" : "passages")}
          onGenerate={generateVocabulary}
        />
      )}

      {screen === "loading" && <LoadingScreen />}

      {screen === "vocabulary" && active && (
        <VocabularyScreen
          vocabularySet={active}
          filter={filter}
          busy={busy}
          onFilterChange={setFilter}
          onFamiliarChange={updateFamiliarSelections}
          onEditSettings={() => navigateTo("customize")}
          onPractice={startPractice}
          onHome={returnHome}
        />
      )}

      {screen === "practice" && currentCard && (
        <PracticeScreen
          card={currentCard}
          passageLabel={`${active?.subtitles?.find((c) => c.sourceId === currentCard.sourceId) ? `At ${moviePosition(active.subtitles.find((c) => c.sourceId === currentCard.sourceId)!.startMs)} ? ` : ""}Passage ${(active?.segments.findIndex((s) => s.id === currentCard.sourceId) ?? -1) + 1}${active?.pages?.find((p) => p.segmentIds.includes(currentCard.sourceId)) ? ` - Page ${active.pages.find((p) => p.segmentIds.includes(currentCard.sourceId))!.page}` : ""}`}
          batchLabel={`Batch ${batch + 1} of ${batches.length} - up to 10 cards from one passage`}
          index={index}
          total={queue.length}
          reviewedCount={reviewed.length}
          flipped={flipped}
          onPrevious={() => {
            setIndex(index - 1);
            setFlipped(false);
          }}
          onNext={advanceCard}
          onFlip={() => setFlipped(!flipped)}
          onExit={() => navigateTo("vocabulary")}
        />
      )}

      {screen === "complete" && active && (
        <CompletionScreen
          sourceName={active.name}
          reviewedCount={reviewed.length}
          total={queue.length}
          familiarCount={familiarCount}
          unfamiliarCount={unfamiliar.length}
          batchLabel={`Batch ${batch + 1} of ${batches.length} complete`}
          onNextBatch={
            batch + 1 < batches.length
              ? () => {
                  setBatch(batch + 1);
                  setQueue(batches[batch + 1]);
                  setIndex(0);
                  setFlipped(false);
                  setReviewed([]);
                  navigateTo("practice");
                }
              : undefined
          }
          onReviewAgain={startPractice}
          onBackToSet={() => navigateTo("vocabulary")}
          onHome={returnHome}
        />
      )}
    </AppShell>
  );
}
