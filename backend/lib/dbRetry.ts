/** Neon / serverless Postgres sometimes drops idle connections; long requests (e.g. uploads) make the next query fail. */

function isTransientDbError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e ?? "");
  const code = (e as { code?: string })?.code;
  return (
    code === "P1017" ||
    msg.includes("Server has closed the connection") ||
    msg.includes("Connection terminated") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  );
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < retries && isTransientDbError(e)) {
        await new Promise((r) => setTimeout(r, 75 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw last;
}
