import type {
  ChromeAIAvailability,
  ChromeAIAvailabilityOptions,
  ChromeAICreateOptions,
  ChromeAIDiagnostic,
  ChromeAIDownloadEventLike,
  ChromeAIDownloadProgress,
  ChromeAILanguageModelAPI,
  ChromeAILanguageModelSession,
  ChromeAIModelStatus,
  ChromeAIRuntime,
} from "./types";

export class ChromeAIError extends Error {
  readonly status: ChromeAIModelStatus;
  readonly cause?: unknown;

  constructor(message: string, status: ChromeAIModelStatus = "error", cause?: unknown) {
    super(message);
    this.name = "ChromeAIError";
    this.status = status;
    this.cause = cause;
  }
}

const defaultExpectedOptions: ChromeAIAvailabilityOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

export function getChromeLanguageModelAPI(
  runtime: ChromeAIRuntime = globalThis as typeof globalThis & ChromeAIRuntime
): ChromeAILanguageModelAPI | undefined {
  return runtime.LanguageModel ?? runtime.ai?.languageModel;
}

export function isChromeLanguageModelSupported(runtime?: ChromeAIRuntime): boolean {
  return Boolean(getChromeLanguageModelAPI(runtime));
}

export function defaultLanguageModelOptions(): ChromeAIAvailabilityOptions {
  return {
    expectedInputs: defaultExpectedOptions.expectedInputs?.map((item) => ({ ...item })),
    expectedOutputs: defaultExpectedOptions.expectedOutputs?.map((item) => ({ ...item })),
  };
}

export function normalizeDownloadProgress(event?: ChromeAIDownloadEventLike): ChromeAIDownloadProgress {
  const loaded = typeof event?.loaded === "number" ? event.loaded : undefined;
  const total = typeof event?.total === "number" ? event.total : undefined;
  const progress = typeof loaded === "number" && typeof total === "number" && total > 0
    ? Math.max(0, Math.min(1, loaded / total))
    : typeof loaded === "number" && loaded >= 0 && loaded <= 1
      ? loaded
      : undefined;

  return {
    loaded,
    total,
    progress,
    percent: typeof progress === "number" ? Math.round(progress * 100) : undefined,
    indeterminate: typeof progress !== "number",
    completed: progress === 1,
  };
}

export async function readChromeAIAvailability(
  options: ChromeAIAvailabilityOptions = defaultLanguageModelOptions(),
  runtime?: ChromeAIRuntime
): Promise<ChromeAIAvailability> {
  const api = getChromeLanguageModelAPI(runtime);
  if (!api) {
    return "unavailable";
  }

  try {
    return await api.availability(options);
  } catch {
    return api.availability();
  }
}

export async function readChromeAIParams(runtime?: ChromeAIRuntime) {
  const api = getChromeLanguageModelAPI(runtime);
  if (!api?.params) {
    return undefined;
  }

  return api.params();
}

export function withDownloadProgress(
  options: ChromeAICreateOptions = {},
  onProgress?: (progress: ChromeAIDownloadProgress, event: ChromeAIDownloadEventLike) => void
): ChromeAICreateOptions {
  return {
    ...options,
    monitor(monitor) {
      options.monitor?.(monitor);
      monitor.addEventListener("downloadprogress", (event) => {
        const raw = {
          loaded: typeof event.loaded === "number" ? event.loaded : undefined,
          total: typeof event.total === "number" ? event.total : undefined,
        };
        onProgress?.(normalizeDownloadProgress(raw), raw);
      });
    },
  };
}

export async function createChromeAISession(
  options: ChromeAICreateOptions = defaultLanguageModelOptions(),
  runtime?: ChromeAIRuntime,
  onProgress?: (progress: ChromeAIDownloadProgress, event: ChromeAIDownloadEventLike) => void
): Promise<ChromeAILanguageModelSession> {
  const api = getChromeLanguageModelAPI(runtime);
  if (!api) {
    throw new ChromeAIError("Chrome LanguageModel API is not exposed in this runtime.", "unsupported");
  }

  const availability = await readChromeAIAvailability(options, runtime);
  if (availability === "unavailable") {
    throw new ChromeAIError("Chrome LanguageModel is unavailable on this device, browser, origin, or profile.", "unavailable");
  }

  return api.create(withDownloadProgress(options, onProgress));
}

export async function prepareChromeAIModel(
  options: ChromeAICreateOptions = defaultLanguageModelOptions(),
  runtime?: ChromeAIRuntime,
  onProgress?: (progress: ChromeAIDownloadProgress, event: ChromeAIDownloadEventLike) => void
): Promise<ChromeAIDiagnostic> {
  const supported = isChromeLanguageModelSupported(runtime);
  if (!supported) {
    return { status: "unsupported", supported: false };
  }

  const availability = await readChromeAIAvailability(options, runtime);
  if (availability === "unavailable") {
    return { status: "unavailable", supported, availability };
  }

  let session: ChromeAILanguageModelSession | undefined;
  try {
    session = await createChromeAISession(options, runtime, onProgress);
    return {
      status: "ready",
      supported,
      availability: "available",
      contextUsage: session.contextUsage,
      contextWindow: session.contextWindow,
    };
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    return { status: "error", supported, availability, error };
  } finally {
    session?.destroy();
  }
}

export function getUserActivation(): boolean | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return navigator.userActivation?.isActive || navigator.userActivation?.hasBeenActive;
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
