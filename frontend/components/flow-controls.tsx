export function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-title">
      <h1>
        {title}
        <span className="title-spark">✳</span>
      </h1>
      <p>{subtitle}</p>
    </div>
  );
}
export function Choice({
  icon,
  title,
  values,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="choice">
      <legend>
        {icon}
        {title}
      </legend>
      <div>
        {values.map((v) => (
          <button
            key={v}
            className={value === v ? "selected" : ""}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SourceNameInput({
  name,
  onChange,
  disabled,
}: {
  name: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <label className="field-label" htmlFor="set-name">
        Source name
      </label>
      <input
        id="set-name"
        disabled={disabled}
        maxLength={100}
        placeholder="e.g. A morning in the old city"
        value={name}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}
