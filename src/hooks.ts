import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChromeAISession,
  defaultLanguageModelOptions,
  getUserActivation,
  isChromeLanguageModelSupported,
  readChromeAIAvailability,
  readChromeAIParams,
  toError,
} from "./runtime";
import { promptWithReflection } from "./reflection";
import { toAsyncIterable } from "./streams";
import {
  assertTaskMethod,
  createChromeAITaskSession,
  destroyChromeAITaskSession,
  isChromeAITaskSupported,
  readChromeAITaskAvailability,
} from "./task-apis";
import type {
  ChromeAIAvailability,
  ChromeAIAvailabilityOptions,
  ChromeAICreateOptions,
  ChromeAIDownloadProgress,
  ChromeAILanguageModelSession,
  ChromeAIMessage,
  ChromeAIPromptInput,
  ChromeAIPromptState,
  ChromeAIReflectionOptions,
  ChromeAISessionState,
  ChromeAITaskAPIName,
  ChromeAITaskCreateOptions,
  ChromeAITaskOperationState,
  ChromeAITaskSession,
} from "./types";

export interface UseChromeAIAvailabilityOptions {
  options?: ChromeAIAvailabilityOptions;
  autoCheck?: boolean;
}

export interface UseChromeAIAvailabilityResult {
  supported: boolean;
  status: "idle" | "checking" | "ready" | "unavailable" | "error";
  availability?: ChromeAIAvailability;
  userActivation?: boolean;
  error?: Error;
  refresh: () => Promise<ChromeAIAvailability>;
}

export function useChromeAIAvailability({
  options = defaultLanguageModelOptions(),
  autoCheck = true,
}: UseChromeAIAvailabilityOptions = {}): UseChromeAIAvailabilityResult {
  const [status, setStatus] = useState<UseChromeAIAvailabilityResult["status"]>("idle");
  const [availability, setAvailability] = useState<ChromeAIAvailability>();
  const [error, setError] = useState<Error>();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refresh = useCallback(async () => {
    setStatus("checking");
    setError(undefined);
    try {
      const result = await readChromeAIAvailability(optionsRef.current);
      setAvailability(result);
      setStatus(result === "unavailable" ? "unavailable" : "ready");
      return result;
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      setStatus("error");
      throw nextError;
    }
  }, []);

  useEffect(() => {
    if (!autoCheck) {
      return;
    }
    void refresh();
  }, [autoCheck, refresh]);

  return {
    supported: isChromeLanguageModelSupported(),
    status,
    availability,
    userActivation: getUserActivation(),
    error,
    refresh,
  };
}

export function useChromeAIParams(autoLoad = true) {
  const [params, setParams] = useState<Awaited<ReturnType<typeof readChromeAIParams>>>();
  const [error, setError] = useState<Error>();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unsupported" | "error">("idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(undefined);
    try {
      const result = await readChromeAIParams();
      setParams(result);
      setStatus(result ? "ready" : "unsupported");
      return result;
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      setStatus("error");
      throw nextError;
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return { params, status, error, refresh };
}

export interface UseChromeAISessionOptions {
  createOptions?: ChromeAICreateOptions;
  autoCreate?: boolean;
  destroyOnUnmount?: boolean;
}

export interface UseChromeAISessionResult extends ChromeAISessionState {
  createSession: (overrideOptions?: ChromeAICreateOptions) => Promise<ChromeAILanguageModelSession>;
  destroySession: () => void;
}

export function useChromeAISession({
  createOptions = defaultLanguageModelOptions(),
  autoCreate = false,
  destroyOnUnmount = true,
}: UseChromeAISessionOptions = {}): UseChromeAISessionResult {
  const [state, setState] = useState<ChromeAISessionState>({
    status: "idle",
    session: null,
  });
  const sessionRef = useRef<ChromeAILanguageModelSession | null>(null);
  const createOptionsRef = useRef(createOptions);
  createOptionsRef.current = createOptions;

  const destroySession = useCallback(() => {
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setState((current) => ({ ...current, status: "idle", session: null }));
  }, []);

  const createSession = useCallback(async (overrideOptions?: ChromeAICreateOptions) => {
    setState((current) => ({ ...current, status: "checking", error: undefined }));
    const options = overrideOptions ?? createOptionsRef.current;
    const availability = await readChromeAIAvailability(options);
    const availabilityStatus = availability === "available" ? "ready" : availability;
    setState((current) => ({ ...current, availability, status: availabilityStatus }));

    try {
      const session = await createChromeAISession(options, undefined, (progress) => {
        setState((current) => ({
          ...current,
          status: progress.completed ? "preparing" : "downloading",
          progress,
        }));
      });
      sessionRef.current?.destroy();
      sessionRef.current = session;
      setState({ status: "ready", availability: "available", session });
      return session;
    } catch (cause) {
      const error = toError(cause);
      setState({ status: error.name === "AbortError" ? "aborted" : "error", session: null, availability, error });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (autoCreate) {
      void createSession();
    }
  }, [autoCreate, createSession]);

  useEffect(() => {
    if (!destroyOnUnmount) {
      return;
    }
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, [destroyOnUnmount]);

  return {
    ...state,
    createSession,
    destroySession,
  };
}

export interface UseChromeAIPromptOptions<TData = unknown> extends UseChromeAISessionOptions {
  reflection?: ChromeAIReflectionOptions<TData>;
  reuseSession?: boolean;
}

export interface UseChromeAIPromptResult<TData = unknown> extends ChromeAIPromptState<TData> {
  prompt: (input: ChromeAIPromptInput, options?: { signal?: AbortSignal }) => Promise<string>;
  promptStructured: (
    input: ChromeAIPromptInput,
    options?: ChromeAIReflectionOptions<TData> & { signal?: AbortSignal }
  ) => Promise<{ text: string; data?: TData; draft?: string }>;
  reset: () => void;
  session: ChromeAILanguageModelSession | null;
  progress?: ChromeAIDownloadProgress;
}

export function useChromeAIPrompt<TData = unknown>({
  reflection,
  reuseSession = true,
  ...sessionOptions
}: UseChromeAIPromptOptions<TData> = {}): UseChromeAIPromptResult<TData> {
  const { session, createSession, destroySession, progress } = useChromeAISession(sessionOptions);
  const [state, setState] = useState<ChromeAIPromptState<TData>>({
    status: "idle",
    text: "",
    chunks: [],
  });

  const ensureSession = useCallback(async () => session ?? createSession(), [createSession, session]);

  const reset = useCallback(() => {
    setState({ status: "idle", text: "", chunks: [] });
  }, []);

  const prompt = useCallback(
    async (input: ChromeAIPromptInput, options?: { signal?: AbortSignal }) => {
      setState({ status: "prompting", input, text: "", chunks: [] });
      const activeSession = await ensureSession();
      try {
        const text = await activeSession.prompt(input, options);
        setState({ status: "ready", input, text, chunks: [text] });
        if (!reuseSession) {
          destroySession();
        }
        return text;
      } catch (cause) {
        const error = toError(cause);
        setState({ status: error.name === "AbortError" ? "aborted" : "error", input, text: "", chunks: [], error });
        throw error;
      }
    },
    [destroySession, ensureSession, reuseSession]
  );

  const promptStructured = useCallback(
    async (input: ChromeAIPromptInput, options?: ChromeAIReflectionOptions<TData> & { signal?: AbortSignal }) => {
      setState({ status: "prompting", input, text: "", chunks: [] });
      const activeSession = await ensureSession();
      try {
        const result = await promptWithReflection(activeSession, input, {
          ...reflection,
          ...options,
        });
        setState({ status: "ready", input, text: result.text, data: result.data, chunks: [result.text] });
        if (!reuseSession) {
          destroySession();
        }
        return result;
      } catch (cause) {
        const error = toError(cause);
        setState({ status: error.name === "AbortError" ? "aborted" : "error", input, text: "", chunks: [], error });
        throw error;
      }
    },
    [destroySession, ensureSession, reflection, reuseSession]
  );

  return {
    ...state,
    prompt,
    promptStructured,
    reset,
    session,
    progress,
  };
}

export interface UseChromeAIStreamResult {
  status: "idle" | "streaming" | "ready" | "aborted" | "error";
  text: string;
  chunks: string[];
  error?: Error;
  streamPrompt: (input: ChromeAIPromptInput, options?: { signal?: AbortSignal }) => Promise<string>;
  reset: () => void;
}

export function useChromeAIStream(
  session: ChromeAILanguageModelSession | null
): UseChromeAIStreamResult {
  const [state, setState] = useState<Omit<UseChromeAIStreamResult, "streamPrompt" | "reset">>({
    status: "idle",
    text: "",
    chunks: [],
  });

  const reset = useCallback(() => {
    setState({ status: "idle", text: "", chunks: [] });
  }, []);

  const streamPrompt = useCallback(
    async (input: ChromeAIPromptInput, options?: { signal?: AbortSignal }) => {
      if (!session) {
        throw new Error("Chrome AI session is not ready.");
      }

      setState({ status: "streaming", text: "", chunks: [] });
      try {
        const chunks: string[] = [];
        for await (const chunk of toAsyncIterable(session.promptStreaming(input, options))) {
          chunks.push(chunk);
          setState({ status: "streaming", text: chunks.join(""), chunks: [...chunks] });
        }
        const text = chunks.join("");
        setState({ status: "ready", text, chunks });
        return text;
      } catch (cause) {
        const error = toError(cause);
        setState({ status: error.name === "AbortError" ? "aborted" : "error", text: "", chunks: [], error });
        throw error;
      }
    },
    [session]
  );

  return useMemo(() => ({ ...state, streamPrompt, reset }), [reset, state, streamPrompt]);
}

export interface UseChromeAIAppendResult {
  status: "idle" | "appending" | "ready" | "unsupported" | "aborted" | "error";
  error?: Error;
  append: (messages: ChromeAIMessage[], options?: { signal?: AbortSignal }) => Promise<void>;
  reset: () => void;
}

export function useChromeAIAppend(
  session: ChromeAILanguageModelSession | null
): UseChromeAIAppendResult {
  const [state, setState] = useState<Omit<UseChromeAIAppendResult, "append" | "reset">>({
    status: "idle",
  });

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const append = useCallback(
    async (messages: ChromeAIMessage[], options?: { signal?: AbortSignal }) => {
      if (!session?.append) {
        const error = new Error("Chrome AI session.append() is not supported in this browser.");
        setState({ status: "unsupported", error });
        throw error;
      }

      setState({ status: "appending" });
      try {
        await session.append(messages, options);
        setState({ status: "ready" });
      } catch (cause) {
        const error = toError(cause);
        setState({ status: error.name === "AbortError" ? "aborted" : "error", error });
        throw error;
      }
    },
    [session]
  );

  return useMemo(() => ({ ...state, append, reset }), [append, reset, state]);
}

export interface UseChromeAICloneResult {
  status: "idle" | "cloning" | "ready" | "unsupported" | "aborted" | "error";
  clone: ChromeAILanguageModelSession | null;
  error?: Error;
  cloneSession: (options?: { signal?: AbortSignal }) => Promise<ChromeAILanguageModelSession>;
  destroyClone: () => void;
}

export function useChromeAIClone(
  session: ChromeAILanguageModelSession | null
): UseChromeAICloneResult {
  const cloneRef = useRef<ChromeAILanguageModelSession | null>(null);
  const [state, setState] = useState<Omit<UseChromeAICloneResult, "cloneSession" | "destroyClone">>({
    status: "idle",
    clone: null,
  });

  const destroyClone = useCallback(() => {
    cloneRef.current?.destroy();
    cloneRef.current = null;
    setState({ status: "idle", clone: null });
  }, []);

  const cloneSession = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!session?.clone) {
        const error = new Error("Chrome AI session.clone() is not supported in this browser.");
        setState({ status: "unsupported", clone: null, error });
        throw error;
      }

      setState((current) => ({ ...current, status: "cloning", error: undefined }));
      try {
        const nextClone = await session.clone(options);
        cloneRef.current?.destroy();
        cloneRef.current = nextClone;
        setState({ status: "ready", clone: nextClone });
        return nextClone;
      } catch (cause) {
        const error = toError(cause);
        setState({ status: error.name === "AbortError" ? "aborted" : "error", clone: null, error });
        throw error;
      }
    },
    [session]
  );

  useEffect(() => {
    return () => {
      cloneRef.current?.destroy();
      cloneRef.current = null;
    };
  }, []);

  return {
    ...state,
    cloneSession,
    destroyClone,
  };
}

export interface UseChromeAIContextResult {
  contextUsage?: number;
  contextWindow?: number;
  overflowed: boolean;
  refresh: () => void;
  resetOverflow: () => void;
}

export function useChromeAIContext(
  session: ChromeAILanguageModelSession | null,
  options: { pollIntervalMs?: number } = {}
): UseChromeAIContextResult {
  const [contextUsage, setContextUsage] = useState<number | undefined>(session?.contextUsage);
  const [contextWindow, setContextWindow] = useState<number | undefined>(session?.contextWindow);
  const [overflowed, setOverflowed] = useState(false);

  const refresh = useCallback(() => {
    setContextUsage(session?.contextUsage);
    setContextWindow(session?.contextWindow);
  }, [session]);

  const resetOverflow = useCallback(() => {
    setOverflowed(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const onOverflow = () => setOverflowed(true);
    session.addEventListener("contextoverflow", onOverflow);
    return () => session.removeEventListener("contextoverflow", onOverflow);
  }, [session]);

  useEffect(() => {
    if (!session || !options.pollIntervalMs) {
      return;
    }
    const id = window.setInterval(refresh, options.pollIntervalMs);
    return () => window.clearInterval(id);
  }, [options.pollIntervalMs, refresh, session]);

  return {
    contextUsage,
    contextWindow,
    overflowed,
    refresh,
    resetOverflow,
  };
}

export interface UseChromeAITaskAvailabilityOptions {
  apiName: ChromeAITaskAPIName;
  options?: Record<string, unknown>;
  autoCheck?: boolean;
}

export function useChromeAITaskAvailability({
  apiName,
  options,
  autoCheck = true,
}: UseChromeAITaskAvailabilityOptions) {
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "unavailable" | "error">("idle");
  const [availability, setAvailability] = useState<ChromeAIAvailability>();
  const [error, setError] = useState<Error>();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refresh = useCallback(async () => {
    setStatus("checking");
    setError(undefined);
    try {
      const result = await readChromeAITaskAvailability(apiName, optionsRef.current);
      setAvailability(result);
      setStatus(result === "unavailable" ? "unavailable" : "ready");
      return result;
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      setStatus("error");
      throw nextError;
    }
  }, [apiName]);

  useEffect(() => {
    if (autoCheck) {
      void refresh();
    }
  }, [autoCheck, refresh]);

  return {
    apiName,
    supported: isChromeAITaskSupported(apiName),
    status,
    availability,
    userActivation: getUserActivation(),
    error,
    refresh,
  };
}

export interface UseChromeAITaskSessionOptions<TSession = ChromeAITaskSession> {
  apiName: ChromeAITaskAPIName;
  createOptions?: ChromeAITaskCreateOptions;
  autoCreate?: boolean;
  destroyOnUnmount?: boolean;
  onSession?: (session: TSession) => void;
}

export function useChromeAITaskSession<TSession = ChromeAITaskSession>({
  apiName,
  createOptions = {},
  autoCreate = false,
  destroyOnUnmount = true,
  onSession,
}: UseChromeAITaskSessionOptions<TSession>) {
  const [status, setStatus] = useState<ChromeAISessionState["status"]>("idle");
  const [session, setSession] = useState<TSession | null>(null);
  const [availability, setAvailability] = useState<ChromeAIAvailability>();
  const [progress, setProgress] = useState<ChromeAIDownloadProgress>();
  const [error, setError] = useState<Error>();
  const sessionRef = useRef<TSession | null>(null);
  const createOptionsRef = useRef(createOptions);
  createOptionsRef.current = createOptions;

  const destroySession = useCallback(() => {
    void destroyChromeAITaskSession(sessionRef.current);
    sessionRef.current = null;
    setSession(null);
    setStatus("idle");
  }, []);

  const createSession = useCallback(async (overrideOptions?: ChromeAITaskCreateOptions) => {
    const options = overrideOptions ?? createOptionsRef.current;
    setStatus("checking");
    setError(undefined);
    setProgress(undefined);
    const nextAvailability = await readChromeAITaskAvailability(apiName, options);
    setAvailability(nextAvailability);
    setStatus(nextAvailability === "available" ? "ready" : nextAvailability);

    try {
      const nextSession = await createChromeAITaskSession<TSession>(apiName, options, undefined, (nextProgress) => {
        setProgress(nextProgress);
        setStatus(nextProgress.completed ? "preparing" : "downloading");
      });
      await destroyChromeAITaskSession(sessionRef.current);
      sessionRef.current = nextSession;
      setSession(nextSession);
      setStatus("ready");
      setAvailability("available");
      onSession?.(nextSession);
      return nextSession;
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      setStatus(nextError.name === "AbortError" ? "aborted" : "error");
      throw nextError;
    }
  }, [apiName, onSession]);

  useEffect(() => {
    if (autoCreate) {
      void createSession();
    }
  }, [autoCreate, createSession]);

  useEffect(() => {
    if (!destroyOnUnmount) {
      return;
    }
    return () => {
      void destroyChromeAITaskSession(sessionRef.current);
      sessionRef.current = null;
    };
  }, [destroyOnUnmount]);

  return {
    apiName,
    supported: isChromeAITaskSupported(apiName),
    status,
    session,
    availability,
    progress,
    error,
    createSession,
    destroySession,
  };
}

export interface UseChromeAITaskOperationOptions<TSession = ChromeAITaskSession> extends UseChromeAITaskSessionOptions<TSession> {
  methodName: string;
  streaming?: boolean;
  reuseSession?: boolean;
}

export function useChromeAITaskOperation<TResult = unknown, TSession = ChromeAITaskSession>({
  methodName,
  streaming = false,
  reuseSession = true,
  ...sessionOptions
}: UseChromeAITaskOperationOptions<TSession>) {
  const task = useChromeAITaskSession<TSession>(sessionOptions);
  const [state, setState] = useState<ChromeAITaskOperationState<TResult>>({
    status: "idle",
    text: "",
    chunks: [],
  });

  const run = useCallback(async (...args: unknown[]) => {
    setState({ status: streaming ? "streaming" : "prompting", text: "", chunks: [] });
    const activeSession = task.session ?? await task.createSession();
    try {
      const method = assertTaskMethod(activeSession, methodName);
      const result = method(...args);

      if (streaming) {
        const chunks: string[] = [];
        for await (const chunk of toAsyncIterable(await result as ReadableStream<string> | AsyncIterable<string>)) {
          chunks.push(chunk);
          setState({ status: "streaming", text: chunks.join(""), chunks: [...chunks] });
        }
        const text = chunks.join("");
        setState({ status: "ready", result: text as TResult, text, chunks });
        if (!reuseSession) {
          task.destroySession();
        }
        return text as TResult;
      }

      const awaited = await result as TResult;
      const text = typeof awaited === "string" ? awaited : "";
      setState({ status: "ready", result: awaited, text, chunks: text ? [text] : [] });
      if (!reuseSession) {
        task.destroySession();
      }
      return awaited;
    } catch (cause) {
      const error = toError(cause);
      setState({ status: error.name === "AbortError" ? "aborted" : "error", text: "", chunks: [], error });
      throw error;
    }
  }, [methodName, reuseSession, streaming, task]);

  const reset = useCallback(() => {
    setState({ status: "idle", text: "", chunks: [] });
  }, []);

  return {
    ...task,
    ...state,
    run,
    reset,
  };
}

export function useChromeAISummarizer(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName"> = {}) {
  return useChromeAITaskOperation<string>({
    ...options,
    apiName: "Summarizer",
    methodName: options.streaming ? "summarizeStreaming" : "summarize",
  });
}

export function useChromeAITranslator(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName"> = {}) {
  return useChromeAITaskOperation<string>({
    ...options,
    apiName: "Translator",
    methodName: options.streaming ? "translateStreaming" : "translate",
  });
}

export function useChromeAILanguageDetector(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName" | "streaming"> = {}) {
  return useChromeAITaskOperation<unknown>({
    ...options,
    apiName: "LanguageDetector",
    methodName: "detect",
  });
}

export function useChromeAIWriter(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName"> = {}) {
  return useChromeAITaskOperation<string>({
    ...options,
    apiName: "Writer",
    methodName: options.streaming ? "writeStreaming" : "write",
  });
}

export function useChromeAIRewriter(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName"> = {}) {
  return useChromeAITaskOperation<string>({
    ...options,
    apiName: "Rewriter",
    methodName: options.streaming ? "rewriteStreaming" : "rewrite",
  });
}

export function useChromeAIProofreader(options: Omit<UseChromeAITaskOperationOptions, "apiName" | "methodName" | "streaming"> = {}) {
  return useChromeAITaskOperation<unknown>({
    ...options,
    apiName: "Proofreader",
    methodName: "proofread",
  });
}
