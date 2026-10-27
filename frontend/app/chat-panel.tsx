"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";

type Exchange = {
  id: number;
  prompt: string;
  reply: string;
};

type ApiError = {
  detail?: unknown;
};

const STARTERS = [
  "I feel stuck on…",
  "I keep putting off…",
  "I could use perspective on…",
];

function readableError(status: number, body: ApiError | null): string {
  if (status === 422) {
    return "That message could not be read. Please revise it and try again.";
  }

  if (status >= 500) {
    return "Your coach is unavailable right now. Your note is still here—please try again in a moment.";
  }

  if (typeof body?.detail === "string") {
    return body.detail;
  }

  return "Something interrupted the conversation. Please try again.";
}

export function ChatPanel() {
  const [message, setMessage] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const nextId = useRef(0);

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (isPending) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Write a thought first—even a few words is enough.");
      return;
    }

    setError("");
    setIsPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const body = (await response.json().catch(() => null)) as
        | (ApiError & { reply?: unknown })
        | null;

      if (!response.ok) {
        throw new Error(readableError(response.status, body));
      }

      if (typeof body?.reply !== "string" || !body.reply.trim()) {
        throw new Error("Your coach returned an empty note. Please try again.");
      }

      nextId.current += 1;
      setExchanges((current) => [
        ...current,
        { id: nextId.current, prompt: trimmedMessage, reply: body.reply as string },
      ]);
      setMessage("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something interrupted the conversation. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  function chooseStarter(starter: string) {
    setMessage(starter);
    setError("");
  }

  return (
    <section className="conversation" id="main-conversation" aria-label="Coaching conversation">
      <div className="conversation-topline">
        <span>Today&apos;s note</span>
        <span aria-label="Current status">{isPending ? "Thinking" : "Ready"}</span>
      </div>

      <div className="transcript" aria-live="polite" aria-busy={isPending}>
        {exchanges.length === 0 && !isPending ? (
          <div className="empty-state">
            <span className="empty-symbol" aria-hidden="true">
              ↗
            </span>
            <div>
              <h2>Start where you are.</h2>
              <p>No perfect prompt needed. A sentence, a worry, or a half-formed idea all work.</p>
            </div>
          </div>
        ) : null}

        {exchanges.map((exchange) => (
          <article className="exchange" key={exchange.id}>
            <div className="message-row message-row-user">
              <p className="message-label">You</p>
              <p className="message-bubble user-bubble">{exchange.prompt}</p>
            </div>
            <div className="message-row">
              <p className="message-label">Coach</p>
              <p className="message-bubble coach-bubble">{exchange.reply}</p>
            </div>
          </article>
        ))}

        {isPending ? (
          <article className="exchange pending-exchange">
            <div className="message-row message-row-user">
              <p className="message-label">You</p>
              <p className="message-bubble user-bubble">{message.trim()}</p>
            </div>
            <div className="message-row">
              <p className="message-label">Coach</p>
              <div className="message-bubble coach-bubble typing" aria-label="Coach is thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          </article>
        ) : null}
      </div>

      <form className="composer" onSubmit={submitMessage} noValidate>
        <label htmlFor="message">Your note</label>
        <div className={`input-wrap${error ? " input-wrap-error" : ""}`}>
          <textarea
            id="message"
            name="message"
            value={message}
            maxLength={2000}
            rows={3}
            placeholder="Write what’s on your mind…"
            disabled={isPending}
            aria-describedby={error ? "message-error message-hint" : "message-hint"}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setMessage(event.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" disabled={isPending} aria-label="Send note">
            <span>{isPending ? "Sending" : "Send note"}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="composer-meta">
          <p id="message-hint">Enter to send · Shift + Enter for a new line</p>
          <p>{message.length}/2000</p>
        </div>

        {error ? (
          <p className="error-message" id="message-error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        ) : null}

        {exchanges.length === 0 ? (
          <div className="starters" aria-label="Conversation starters">
            <span>Try a starter</span>
            {STARTERS.map((starter) => (
              <button type="button" key={starter} onClick={() => chooseStarter(starter)}>
                {starter}
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </section>
  );
}
