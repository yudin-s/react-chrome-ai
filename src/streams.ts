export async function* readableStreamToAsyncIterable<T>(stream: ReadableStream<T>): AsyncIterable<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function toAsyncIterable<T>(source: ReadableStream<T> | AsyncIterable<T>): AsyncIterable<T> {
  if (typeof (source as AsyncIterable<T>)[Symbol.asyncIterator] === "function") {
    return source as AsyncIterable<T>;
  }

  return readableStreamToAsyncIterable(source as ReadableStream<T>);
}

export async function collectAsyncIterable<T>(source: ReadableStream<T> | AsyncIterable<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of toAsyncIterable(source)) {
    chunks.push(chunk);
  }
  return chunks;
}
