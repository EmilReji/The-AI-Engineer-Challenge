import { ChatPanel } from "./chat-panel";

export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header" aria-label="Kindling home">
        <a className="wordmark" href="#main-conversation">
          <span className="wordmark-mark" aria-hidden="true">
            ✦
          </span>
          Kindling
        </a>
        <p className="status-note">
          <span aria-hidden="true" /> Ready when you are
        </p>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">A clear head starts with one honest thought.</p>
        <h1 id="page-title">
          What&apos;s taking up
          <br />
          <span>space today?</span>
        </h1>
        <p className="intro">
          Put it down in words. Your coach will help you find a calmer,
          practical next step—without the pep-talk overload.
        </p>
      </section>

      <ChatPanel />

      <footer>
        <p>Made for reflection, not emergencies.</p>
        <p>Kindling can make mistakes. Trust your judgment.</p>
      </footer>
    </main>
  );
}
