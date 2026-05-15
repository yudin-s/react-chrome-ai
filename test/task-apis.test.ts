import { describe, expect, it, vi } from "vitest";
import {
  assertTaskMethod,
  createChromeAITaskSession,
  readChromeAITaskAvailability,
} from "../src/task-apis";
import type { ChromeAITaskRuntime } from "../src/task-apis";

describe("Chrome AI task APIs", () => {
  it("detects missing task APIs as unavailable", async () => {
    await expect(readChromeAITaskAvailability("Summarizer", undefined, {})).resolves.toBe("unavailable");
  });

  it("creates task sessions with download progress monitoring", async () => {
    const runtime: ChromeAITaskRuntime = {
      Summarizer: {
        availability: vi.fn(async () => "downloadable" as const),
        create: vi.fn(async (options) => {
          const monitor = new EventTarget();
          options?.monitor?.(monitor);
          monitor.dispatchEvent(Object.assign(new Event("downloadprogress"), { loaded: 20, total: 100 }));
          return { summarize: vi.fn(async () => "short"), destroy: vi.fn() };
        }),
      },
    };
    const onProgress = vi.fn();

    const session = await createChromeAITaskSession("Summarizer", {}, runtime, onProgress);

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ percent: 20 }), {
      loaded: 20,
      total: 100,
    });
    await expect(assertTaskMethod(session, "summarize")("long")).resolves.toBe("short");
  });
});
