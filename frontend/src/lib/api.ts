import { type QueryClient, useQuery } from "@tanstack/react-query";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * GET when body is omitted; otherwise POST JSON. Success responses must contain JSON.
 * HTTP failures reject with ApiError; transport, serialization and successful-response
 * parsing failures propagate their original errors.
 */
export async function api<T>(
  path: string,
  body?: unknown,
  method?: "POST" | "PUT" | "DELETE",
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    method: method ?? (body === undefined ? "GET" : "POST"),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const detail =
      error && typeof error === "object" && "detail" in error
        ? error.detail
        : null;
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((entry: unknown) => {
        if (
          !entry ||
          typeof entry !== "object" ||
          !("msg" in entry) ||
          typeof entry.msg !== "string"
        )
          return [];
        const location =
          "loc" in entry && Array.isArray(entry.loc)
            ? entry.loc
                .slice(1)
                .filter(
                  (part: unknown) =>
                    typeof part === "string" || typeof part === "number",
                )
                .join(" → ")
            : "";
        return [location ? `${location}: ${entry.msg}` : entry.msg];
      });
      if (messages.length)
        throw new ApiError(messages.join(". "), response.status);
    }
    throw new ApiError(
      typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
export function useApi<T>(
  path: string,
  poll: boolean | ((data: T | undefined) => boolean) = false,
) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api<T>(path),
    refetchInterval: (query) =>
      (typeof poll === "function" ? poll(query.state.data) : poll)
        ? 1500
        : false,
    refetchOnWindowFocus: true,
  });
}

export function invalidateResources(client: QueryClient, paths: string[]) {
  return client.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      paths.includes(query.queryKey[0].split("?")[0] ?? ""),
  });
}
