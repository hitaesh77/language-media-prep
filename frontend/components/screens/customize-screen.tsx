import { useState } from "react";
import { ArrowLeft, ArrowRight, Globe, Briefcase, Layers } from "lucide-react";
import type { Preferences } from "../../lib/api/types";
import { Title, Choice } from "../flow-controls";

type CustomizeScreenProps = {
  preferences: Preferences;
  isRegenerating: boolean;
  passageCount: number;
  onChange: (preferences: Preferences) => void;
  onBack: () => void;
  onGenerate: () => void;
};

export function CustomizeScreen({
  preferences,
  isRegenerating,
  passageCount,
  onChange,
  onBack,
  onGenerate,
}: CustomizeScreenProps) {
  const presets = [3, 5, 10];
  const [custom, setCustom] = useState(
    preferences.cardsPerPassage !== undefined &&
      !presets.includes(preferences.cardsPerPassage),
  );
  const count = preferences.cardsPerPassage;
  const maximum = Math.min(15, Math.floor(300 / Math.max(1, passageCount)));
  const invalidCount =
    count !== undefined && (!Number.isInteger(count) || count < 1 || count > maximum);
  return (
    <>
      <Title
        title="Customize your set"
        subtitle="Tell us a bit about your goals so we can find useful words and phrases for you."
      />
      <div className="preferences">
        <Choice
          icon={<Briefcase size={21} />}
          title="Your level"
          values={["Beginner", "Intermediate", "Advanced"]}
          value={preferences.level}
          onChange={(level) => onChange({ ...preferences, level })}
        />
        <Choice
          icon={<Globe size={21} />}
          title="Arabic variety"
          values={["Modern Standard Arabic (MSA)", "Egyptian Arabic", "Levantine Arabic"]}
          value={preferences.variety}
          onChange={(variety) => onChange({ ...preferences, variety })}
        />
        <Choice
          icon={<Layers size={21} />}
          title="Explain in"
          values={["English", "Arabic"]}
          value={preferences.language}
          onChange={(language) => onChange({ ...preferences, language })}
        />
      </div>
      <label className="card-count">
        Flashcards per passage
        <select
          aria-label="Flashcards per passage"
          value={custom ? "custom" : (count ?? "auto")}
          onChange={(e) => {
            const value = e.target.value;
            setCustom(value === "custom");
            onChange({
              ...preferences,
              cardsPerPassage:
                value === "auto"
                  ? undefined
                  : value === "custom"
                    ? (count ?? Math.min(5, maximum))
                    : Number(value),
            });
          }}
        >
          <option value="auto">Automatic (up to 15 total)</option>
          {presets.map((n) => (
            <option key={n} value={n} disabled={n > maximum}>
              {n} per passage
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>
      </label>
      {custom && (
        <label className="card-count">
          Your number per passage
          <input
            type="number"
            aria-label="Your number per passage"
            min={1}
            max={maximum}
            step={1}
            value={count || ""}
            aria-invalid={invalidCount}
            aria-describedby="card-count-help"
            onChange={(e) =>
              onChange({ ...preferences, cardsPerPassage: Number(e.target.value) })
            }
          />
        </label>
      )}
      <p id="card-count-help" className="notice" aria-live="polite">
        {invalidCount
          ? `Enter a whole number from 1 to ${maximum}.`
          : count !== undefined
            ? `${count} per passage - ${count * passageCount} cards requested across ${passageCount} passages.`
            : "Automatic chooses up to 15 cards in total."}
      </p>
      <p className="notice">
        Choose a target for each selected passage. Short passages may yield fewer distinct
        expressions. Maximum 300 cards per set. Each selected passage is generated
        separately. More passages use more AI requests.
      </p>
      {!["English", "Arabic"].includes(preferences.language) && (
        <p role="alert">
          Choose English or Arabic before regenerating this older set. Existing cards are
          preserved.
        </p>
      )}
      <p className="notice">
        Provisional defaults. Your selected passages and preferences are sent to the AI
        provider to generate contextual vocabulary. Meanings need review.
      </p>
      <div className="actions">
        <button onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          className="primary"
          onClick={onGenerate}
          disabled={!["English", "Arabic"].includes(preferences.language) || invalidCount}
        >
          {isRegenerating ? "Regenerate vocabulary" : "Generate vocabulary"}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
