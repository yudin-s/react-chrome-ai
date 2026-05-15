import { describe, expect, it, vi } from "vitest";
import {
  createChromeAISession,
  normalizeDownloadProgress,
  readChromeAIAvailability,
} from "../src/runtime";
import type { ChromeAIRuntime } from "../src/types";

describe("Chrome AI runtime", () => {
  it("returns unavailable when LanguageModel is missing", async () => {
    await expect(readChromeAIAvailability(undefined, {})).resolves.toBe("unavailable");
  });

  it("falls back to availability without options when typed options fail", async () => {
    const availability = vi
      .fn()
      .mockRejectedValueOnce(new Error("unsupported options"))
      .mockResolvedValueOnce("available");
    const runtime: ChromeAIRuntime = {
      LanguageModel: {
        availability,
        create: vi.fn(),
      },
    };

    await expect(readChromeAIAvailability(undefined, runtime)).resolves.toBe("available");
    expect(availability).toHaveBeenCalledTimes(2);
  });

  it("normalizes fractional and byte download progress", () => {
    expect(normalizeDownloadProgress({ loaded: 0.4 })).toMatchObject({
      progress: 0.4,
      percent: 40,
      indeterminate: false,
      completed: false,
    });
    expect(normalizeDownloadProgress({ loaded: 50, total: 100 })).toMatchObject({
      progress: 0.5,
      percent: 50,
      indeterminate: false,
    });
  });

  it("passes downloadprogress from create monitor to caller", async () => {
    const prompt = vi.fn();
    const runtime: ChromeAIRuntime = {
      LanguageModel: {
        availability: vi.fn(async () => "downloadable" as const),
        create: vi.fn(async (options) => {
          const monitor = new EventTarget();
          options?.monitor?.(monitor);
          monitor.dispatchEvent(Object.assign(new Event("downloadprogress"), { loaded: 1 }));
          return {
            prompt,
            promptStreaming: vi.fn(),
            destroy: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          };
        }),
      },
    };
    const onProgress = vi.fn();

    await createChromeAISession({}, runtime, onProgress);

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ completed: true }), { loaded: 1 });
  });
});
