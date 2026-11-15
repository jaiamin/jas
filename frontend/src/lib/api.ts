import { type QueryClient, useQuery } from "@tanstack/react-query";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * GET when body is omitted; otherwise POST JSON.
 * HTTP failures reject with ApiError. Transport and response parsing failures
 * retain their cause with a readable message. Serialization
 * failures propagate unchanged. No request is automatically repeated.
 */
export async function apiResponse(
  path: string,
  body?: unknown,
  method?: "POST" | "PUT" | "DELETE",
): Promise<Response> {
  const request = {
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    method: method ?? (body === undefined ? "GET" : "POST"),
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  let response: Response;
  try {
    response = await fetch(`/api${path}`, request);
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new ApiError(
      "Couldn’t reach JAS. Check your connection and try again.",
      0,
      { cause },
    );
  }
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
    const fallback: Record<number, string> = {
      401: "Sign in to continue.",
      403: "You don’t have permission to do this.",
      404: "This item is no longer available.",
      429: "Too many requests. Wait a moment and try again.",
    };
    throw new ApiError(
      typeof detail === "string"
        ? detail
        : (fallback[response.status] ??
            "JAS couldn’t complete this request. Try again shortly."),
      response.status,
    );
  }
  return response;
}

/** JSON API requests share transport and HTTP errors with binary downloads. */
export async function api<T>(
  path: string,
  body?: unknown,
  method?: "POST" | "PUT" | "DELETE",
): Promise<T> {
  const response = await apiResponse(path, body, method);
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new ApiError(
      "JAS returned an unreadable response. Try again.",
      response.status,
      { cause },
    );
  }
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
