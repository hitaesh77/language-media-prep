import { ArrowLeft, ArrowRight, Globe, Briefcase, Layers } from "lucide-react";
import type { Preferences } from "../../lib/api/types";
import { Title, Choice } from "../flow-controls";

type CustomizeScreenProps = {
  preferences: Preferences;
  isRegenerating: boolean;
  onChange: (preferences: Preferences) => void;
  onBack: () => void;
  onGenerate: () => void;
};

export function CustomizeScreen({
  preferences,
  isRegenerating,
  onChange,
  onBack,
  onGenerate,
}: CustomizeScreenProps) {
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
          values={["English", "Arabic", "Spanish"]}
          value={preferences.language}
          onChange={(language) => onChange({ ...preferences, language })}
        />
      </div>
      <p className="notice">
        Provisional defaults. Demo meanings use a small sample glossary; level and variety
        are saved but do not change mock selections.
      </p>
      <div className="actions">
        <button onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <button className="primary" onClick={onGenerate}>
          {isRegenerating ? "Regenerate vocabulary" : "Generate vocabulary"}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
