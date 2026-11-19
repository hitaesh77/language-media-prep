import type { ReactNode } from "react";
import type { Screen } from "./prep-types";
import { BrandLogo } from "./brand-logo";
import { House } from "lucide-react";

type AppShellProps = {
  screen: Screen;
  onHome: () => void;
  children: ReactNode;
};

export function AppShell({ screen, onHome, children }: AppShellProps) {
  const step = ["content", "subtitle", "passages"].includes(screen)
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
    <div
      className={`app-shell ${screen === "home" ? "library-shell" : "workspace-shell"}`}
    >
      <header>
        <button className="logo" onClick={onHome} aria-label="Lingo home">
          <BrandLogo />
        </button>
        {screen === "home" ? (
          <span className="home-link">Arabic vocabulary workspace</span>
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
        <button className="home-button" onClick={onHome} aria-label="Go home">
          <House size={16} /> Home
        </button>
      </header>
      <main className={`${mainClassName}${screen === "loading" ? " loading-page" : ""}`}>{children}</main>
      <footer>
        <span className="footer-brand">
          <BrandLogo />
        </span>
      </footer>
    </div>
  );
}
