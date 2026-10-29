import type { ReactNode } from "react";
import type { Screen } from "./prep-types";
import { BrandLogo } from "./brand-logo";

type AppShellProps = {
  screen: Screen;
  onHome: () => void;
  children: ReactNode;
};

export function AppShell({ screen, onHome, children }: AppShellProps) {
  const step = ["content", "passages"].includes(screen)
    ? 1
    : screen === "customize"
      ? 2
      : ["loading", "vocabulary"].includes(screen)
        ? 3
        : 4;
  const mainClassName =
    screen === "home"
      ? "home-page"
      : screen === "practice"
        ? "practice-page"
        : "flow-page";

  return (
    <div className="app-shell">
      <header>
        <button className="logo" onClick={onHome} aria-label="Lingo home">
          <BrandLogo />
        </button>
        {screen === "home" ? (
          <span className="home-link">Your library</span>
        ) : (
          <nav aria-label="Learning steps">
            {["Add content", "Customize", "Vocabulary", "Practice"].map((label, i) => (
              <span key={label} className={step === i + 1 ? "current" : ""}>
                <b>{i + 1}</b>
                <span>{label}</span>
              </span>
            ))}
          </nav>
        )}
      </header>
      <main className={mainClassName}>{children}</main>
      <footer>
        <span className="footer-brand">
          <BrandLogo />
          <span>A few words before you go.</span>
        </span>
      </footer>
    </div>
  );
}
