import type {
  ChromeAILanguageModelSession,
  ChromeAIPromptInput,
  ChromeAIReflectionOptions,
} from "./types";

export function safeParseJSON<T = unknown>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!match?.[1]) {
      return undefined;
    }
    try {
      return JSON.parse(match[1]) as T;
    } catch {
      return undefined;
    }
  }
}

export function createStructuredPrompt(
  input: ChromeAIPromptInput,
  options: Pick<ChromeAIReflectionOptions, "format" | "instructions"> = {}
): ChromeAIPromptInput {
  const suffix = [
    options.instructions,
    options.format === "json"
      ? "Return only valid JSON. Do not include Markdown fences or explanatory text."
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  if (!suffix) {
    return input;
  }

  if (typeof input === "string") {
    return `${input}\n\n${suffix}`;
  }

  return [
    ...input,
    {
      role: "user",
      content: suffix,
    },
  ];
}

export function defaultReflectionPrompt(draft: string): ChromeAIPromptInput {
  return [
    {
      role: "user",
      content:
        "Review the previous answer for instruction-following, unsupported claims, and formatting errors. Return the corrected final answer only.",
    },
    {
      role: "assistant",
      content: draft,
    },
  ];
}

export async function promptWithReflection<TData = unknown>(
  session: ChromeAILanguageModelSession,
  input: ChromeAIPromptInput,
  options: ChromeAIReflectionOptions<TData> & { signal?: AbortSignal } = {}
): Promise<{ text: string; data?: TData; draft?: string }> {
  const promptInput = createStructuredPrompt(input, options);
  const promptOptions = {
    signal: options.signal,
    responseConstraint: options.schema,
  };
  const draft = await session.prompt(promptInput, promptOptions);
  const text = options.reflect
    ? await session.prompt((options.reflectionPrompt ?? defaultReflectionPrompt)(draft), promptOptions)
    : draft;

  const data = options.parse
    ? options.parse(text)
    : options.format === "json"
      ? safeParseJSON<TData>(text)
      : undefined;

  return { text, data, draft: options.reflect ? draft : undefined };
}
