import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "./chat-panel";

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
};

function mockResponse(body: unknown, options: MockResponseOptions = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("ChatPanel", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the empty, ready state with conversation starters", () => {
    render(<ChatPanel />);

    expect(screen.getByRole("heading", { name: "Start where you are." })).toBeInTheDocument();
    expect(screen.getByLabelText("Current status")).toHaveTextContent("Ready");
    expect(screen.getByRole("textbox", { name: "Your note" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send note" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /I (feel|keep|could)/ })).toHaveLength(3);
  });

  it("shows an accessible validation error for an empty message", async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write a thought first—even a few words is enough.",
    );
    expect(screen.getByRole("textbox", { name: "Your note" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fills the composer from a starter and clears validation", async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Send note" }));
    await user.click(screen.getByRole("button", { name: "I feel stuck on…" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your note" })).toHaveValue("I feel stuck on…");
  });

  it("uses Shift+Enter for a new line without submitting", async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    const textbox = screen.getByRole("textbox", { name: "Your note" });

    await user.type(textbox, "First line");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textbox, "Second line");

    expect(textbox).toHaveValue("First line\nSecond line");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a trimmed message with the exact backend request contract", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(mockResponse({ reply: "Begin with five focused minutes." }));
    render(<ChatPanel />);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "  I feel scattered.  ");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I feel scattered." }),
    });
    expect(await screen.findByText("Begin with five focused minutes.")).toBeInTheDocument();
  });

  it("shows a pending state and prevents duplicate submissions", async () => {
    const user = userEvent.setup();
    const pendingResponse = deferred<Response>();
    fetchMock.mockReturnValue(pendingResponse.promise);
    render(<ChatPanel />);

    const textbox = screen.getByRole("textbox", { name: "Your note" });
    await user.type(textbox, "Help me choose a priority.");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(screen.getByLabelText("Current status")).toHaveTextContent("Thinking");
    expect(textbox).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send note" })).toBeDisabled();
    expect(screen.getByLabelText("Coach is thinking")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send note" }));
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => {
      pendingResponse.resolve(mockResponse({ reply: "Choose the task with the clearest deadline." }));
    });
    expect(await screen.findByText("Choose the task with the clearest deadline.")).toBeInTheDocument();
  });

  it("clears the draft after success and keeps completed exchanges", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(mockResponse({ reply: "Start with the smallest action." }))
      .mockResolvedValueOnce(mockResponse({ reply: "Set a ten-minute timer." }));
    render(<ChatPanel />);
    const textbox = screen.getByRole("textbox", { name: "Your note" });

    await user.type(textbox, "How do I begin?");
    await user.click(screen.getByRole("button", { name: "Send note" }));
    expect(await screen.findByText("Start with the smallest action.")).toBeInTheDocument();
    expect(textbox).toHaveValue("");

    await user.type(textbox, "How long should I try?");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Set a ten-minute timer.")).toBeInTheDocument();
    expect(screen.getByText("How do I begin?")).toBeInTheDocument();
    expect(screen.getByText("How long should I try?")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders a useful FastAPI validation error and preserves the draft", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(mockResponse({ detail: [] }, { ok: false, status: 422 }));
    render(<ChatPanel />);
    const textbox = screen.getByRole("textbox", { name: "Your note" });

    await user.type(textbox, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That message could not be read. Please revise it and try again.",
    );
    expect(textbox).toHaveValue("Keep this draft");
    expect(textbox).toBeEnabled();
  });

  it("hides backend details behind a friendly server-error message", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      mockResponse({ detail: "sensitive backend exception" }, { ok: false, status: 500 }),
    );
    render(<ChatPanel />);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "Please help");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your coach is unavailable right now.");
    expect(alert).not.toHaveTextContent("sensitive backend exception");
  });

  it("uses a safe API detail for other unsuccessful responses", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      mockResponse({ detail: "Please slow down and try again." }, { ok: false, status: 429 }),
    );
    render(<ChatPanel />);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "Another note");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please slow down and try again.");
  });

  it("reports a network failure and leaves the message ready to retry", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new Error("Network connection failed"));
    render(<ChatPanel />);
    const textbox = screen.getByRole("textbox", { name: "Your note" });

    await user.type(textbox, "Do not lose this");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network connection failed");
    expect(textbox).toHaveValue("Do not lose this");
    expect(textbox).toBeEnabled();
  });

  it("rejects a successful response that does not contain a usable reply", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(mockResponse({ reply: "   " }));
    render(<ChatPanel />);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "A valid prompt");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your coach returned an empty note. Please try again.",
    );
    expect(screen.queryByText("A valid prompt", { selector: ".user-bubble" })).not.toBeInTheDocument();
  });
});
