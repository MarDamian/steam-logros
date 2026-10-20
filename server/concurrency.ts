/** Recorre una lista llamando a `task`, con como máximo `limit` en vuelo a la vez. */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index] as T;
      results[index] = await task(item, index);
    }
  });

  await Promise.all(workers);
  return results;
}
