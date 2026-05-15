import { describe, expect, it, vi } from "vitest";
import { createStructuredPrompt, promptWithReflection, safeParseJSON } from "../src/reflection";
import type { ChromeAILanguageModelSession } from "../src/types";

function sessionWithPrompt(prompt: ChromeAILanguageModelSession["prompt"]): ChromeAILanguageModelSession {
  return {
    prompt,
    promptStreaming: vi.fn(),
    destroy: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

describe("reflection helpers", () => {
  it("extracts JSON from plain text and fenced output", () => {
    expect(safeParseJSON<{ ok: boolean }>("{\"ok\":true}")).toEqual({ ok: true });
    expect(safeParseJSON<{ ok: boolean }>("```json\n{\"ok\":true}\n```")).toEqual({ ok: true });
  });

  it("adds format instructions without changing message shape", () => {
    expect(createStructuredPrompt("Classify", { format: "json" })).toContain("Return only valid JSON");
    expect(Array.isArray(createStructuredPrompt([{ role: "user", content: "Classify" }], { format: "json" }))).toBe(true);
  });

  it("can run a draft and reflection pass", async () => {
    const prompt = vi.fn(async () => (prompt.mock.calls.length === 1 ? "draft" : "{\"ok\":true}"));
    const session = sessionWithPrompt(prompt);

    const result = await promptWithReflection<{ ok: boolean }>(session, "Do it", {
      format: "json",
      reflect: true,
    });

    expect(prompt).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ text: "{\"ok\":true}", data: { ok: true }, draft: "draft" });
  });
});
