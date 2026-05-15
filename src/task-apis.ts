import { normalizeDownloadProgress, toError } from "./runtime";
import type {
  ChromeAIAvailability,
  ChromeAIDownloadEventLike,
  ChromeAIDownloadProgress,
  ChromeAIMonitorEventTarget,
  ChromeAITaskAPI,
  ChromeAITaskAPIName,
  ChromeAITaskCreateOptions,
  ChromeAITaskSession,
} from "./types";

export interface ChromeAITaskRuntime {
  LanguageModel?: ChromeAITaskAPI;
  Summarizer?: ChromeAITaskAPI;
  Translator?: ChromeAITaskAPI;
  LanguageDetector?: ChromeAITaskAPI;
  Writer?: ChromeAITaskAPI;
  Rewriter?: ChromeAITaskAPI;
  Proofreader?: ChromeAITaskAPI;
}

export function getChromeAITaskAPI<TSession = ChromeAITaskSession>(
  apiName: ChromeAITaskAPIName,
  runtime: ChromeAITaskRuntime = globalThis as typeof globalThis & ChromeAITaskRuntime
): ChromeAITaskAPI<TSession> | undefined {
  return runtime[apiName] as ChromeAITaskAPI<TSession> | undefined;
}

export function isChromeAITaskSupported(apiName: ChromeAITaskAPIName, runtime?: ChromeAITaskRuntime): boolean {
  return Boolean(getChromeAITaskAPI(apiName, runtime));
}

export async function readChromeAITaskAvailability(
  apiName: ChromeAITaskAPIName,
  options?: Record<string, unknown>,
  runtime?: ChromeAITaskRuntime
): Promise<ChromeAIAvailability> {
  const api = getChromeAITaskAPI(apiName, runtime);
  if (!api) {
    return "unavailable";
  }

  try {
    return await api.availability(options);
  } catch {
    return api.availability();
  }
}

export function withTaskDownloadProgress(
  options: ChromeAITaskCreateOptions = {},
  onProgress?: (progress: ChromeAIDownloadProgress, event: ChromeAIDownloadEventLike) => void
): ChromeAITaskCreateOptions {
  return {
    ...options,
    monitor(monitor: ChromeAIMonitorEventTarget) {
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

export async function createChromeAITaskSession<TSession = ChromeAITaskSession>(
  apiName: ChromeAITaskAPIName,
  options: ChromeAITaskCreateOptions = {},
  runtime?: ChromeAITaskRuntime,
  onProgress?: (progress: ChromeAIDownloadProgress, event: ChromeAIDownloadEventLike) => void
): Promise<TSession> {
  const api = getChromeAITaskAPI<TSession>(apiName, runtime);
  if (!api) {
    throw new Error(`${apiName} API is not exposed in this browser.`);
  }

  const availability = await readChromeAITaskAvailability(apiName, options, runtime);
  if (availability === "unavailable") {
    throw new Error(`${apiName} API is unavailable for the requested options.`);
  }

  return api.create(withTaskDownloadProgress(options, onProgress));
}

export async function destroyChromeAITaskSession(session: unknown): Promise<void> {
  const destroy = (session as ChromeAITaskSession | undefined)?.destroy;
  if (typeof destroy === "function") {
    destroy.call(session);
  }
}

export function assertTaskMethod<TArgs extends unknown[] = unknown[], TResult = unknown>(
  session: unknown,
  methodName: string
): (...args: TArgs) => TResult {
  const method = (session as Record<string, unknown> | undefined)?.[methodName];
  if (typeof method !== "function") {
    throw new Error(`Task session does not expose ${methodName}().`);
  }
  return method.bind(session) as (...args: TArgs) => TResult;
}

export async function callChromeAITaskMethod<TResult = unknown>(
  session: unknown,
  methodName: string,
  ...args: unknown[]
): Promise<TResult> {
  try {
    return await assertTaskMethod(session, methodName)(...args) as TResult;
  } catch (cause) {
    throw toError(cause);
  }
}
