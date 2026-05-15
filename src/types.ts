export type ChromeAIAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

export type ChromeAIModelStatus =
  | "idle"
  | "checking"
  | "unsupported"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "preparing"
  | "ready"
  | "prompting"
  | "streaming"
  | "aborted"
  | "error";

export type ChromeAIMessageRole = "system" | "user" | "assistant";
export type ChromeAIModality = "text" | "image" | "audio";
export type ChromeAILanguage = "en" | "ja" | "es" | (string & {});

export type ChromeAIMediaValue =
  | AudioBuffer
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | HTMLImageElement
  | SVGImageElement
  | HTMLVideoElement
  | HTMLCanvasElement
  | ImageBitmap
  | OffscreenCanvas
  | VideoFrame
  | ImageData;

export interface ChromeAIPromptPart {
  type: ChromeAIModality;
  value: string | ChromeAIMediaValue;
}

export interface ChromeAIMessage {
  role: ChromeAIMessageRole;
  content: string | ChromeAIPromptPart[];
  prefix?: boolean;
}

export type ChromeAIPromptInput = string | ChromeAIMessage[];

export interface ChromeAIExpected {
  type: ChromeAIModality;
  languages?: ChromeAILanguage[];
}

export interface ChromeAIParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

export interface ChromeAIDownloadEventLike {
  loaded?: number;
  total?: number;
}

export interface ChromeAIDownloadProgress {
  loaded?: number;
  total?: number;
  progress?: number;
  percent?: number;
  indeterminate: boolean;
  completed: boolean;
}

export interface ChromeAIMonitorEventTarget extends EventTarget {
  addEventListener(
    type: "downloadprogress",
    listener: (event: Event & ChromeAIDownloadEventLike) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export interface ChromeAISessionPromptOptions {
  signal?: AbortSignal;
  responseConstraint?: unknown;
  omitResponseConstraintInput?: boolean;
}

export interface ChromeAISessionCloneOptions {
  signal?: AbortSignal;
}

export interface ChromeAIContextUsageOptions {
  responseConstraint?: unknown;
  omitResponseConstraintInput?: boolean;
}

export interface ChromeAILanguageModelSession extends EventTarget {
  readonly contextUsage?: number;
  readonly contextWindow?: number;
  prompt(input: ChromeAIPromptInput, options?: ChromeAISessionPromptOptions): Promise<string>;
  promptStreaming(
    input: ChromeAIPromptInput,
    options?: ChromeAISessionPromptOptions
  ): ReadableStream<string> | AsyncIterable<string>;
  append?(input: ChromeAIMessage[], options?: { signal?: AbortSignal }): Promise<void>;
  clone?(options?: ChromeAISessionCloneOptions): Promise<ChromeAILanguageModelSession>;
  destroy(): void;
  measureContextUsage?(
    input?: ChromeAIPromptInput,
    options?: ChromeAIContextUsageOptions
  ): Promise<number>;
}

export interface ChromeAICreateOptions {
  initialPrompts?: ChromeAIMessage[];
  expectedInputs?: ChromeAIExpected[];
  expectedOutputs?: ChromeAIExpected[];
  topK?: number;
  temperature?: number;
  signal?: AbortSignal;
  monitor?: (monitor: ChromeAIMonitorEventTarget) => void;
}

export type ChromeAIAvailabilityOptions = Pick<
  ChromeAICreateOptions,
  "expectedInputs" | "expectedOutputs" | "topK" | "temperature" | "initialPrompts"
>;

export interface ChromeAILanguageModelAPI {
  availability(options?: ChromeAIAvailabilityOptions): Promise<ChromeAIAvailability>;
  create(options?: ChromeAICreateOptions): Promise<ChromeAILanguageModelSession>;
  params?(): Promise<ChromeAIParams>;
}

export interface ChromeAIRuntime {
  LanguageModel?: ChromeAILanguageModelAPI;
  ai?: {
    languageModel?: ChromeAILanguageModelAPI;
  };
}

export interface ChromeAIDiagnostic {
  status: ChromeAIModelStatus;
  supported: boolean;
  availability?: ChromeAIAvailability;
  progress?: ChromeAIDownloadProgress;
  userActivation?: boolean;
  contextUsage?: number;
  contextWindow?: number;
  error?: Error;
}

export interface ChromeAISessionState {
  status: ChromeAIModelStatus;
  session: ChromeAILanguageModelSession | null;
  availability?: ChromeAIAvailability;
  progress?: ChromeAIDownloadProgress;
  error?: Error;
}

export interface ChromeAIPromptState<TData = unknown> {
  status: ChromeAIModelStatus;
  input?: ChromeAIPromptInput;
  text: string;
  data?: TData;
  chunks: string[];
  error?: Error;
}

export interface ChromeAIReflectionOptions<TData = unknown> {
  schema?: unknown;
  format?: "json" | "text";
  instructions?: string;
  reflect?: boolean;
  reflectionPrompt?: (draft: string) => ChromeAIPromptInput;
  parse?: (text: string) => TData;
}

export type ChromeAITaskAPIName =
  | "LanguageModel"
  | "Summarizer"
  | "Translator"
  | "LanguageDetector"
  | "Writer"
  | "Rewriter"
  | "Proofreader";

export interface ChromeAITaskAPI<TSession = unknown> {
  availability(options?: Record<string, unknown>): Promise<ChromeAIAvailability>;
  create(options?: Record<string, unknown>): Promise<TSession>;
}

export interface ChromeAITaskSession {
  destroy?: () => void;
  [method: string]: unknown;
}

export interface ChromeAITaskCreateOptions {
  signal?: AbortSignal;
  monitor?: (monitor: ChromeAIMonitorEventTarget) => void;
  [key: string]: unknown;
}

export interface ChromeAITaskOperationState<TResult = unknown> {
  status: ChromeAIModelStatus;
  result?: TResult;
  text: string;
  chunks: string[];
  error?: Error;
}
