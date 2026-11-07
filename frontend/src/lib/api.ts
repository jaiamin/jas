import { useQuery } from "@tanstack/react-query";

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const detail =
      error && typeof error === "object" && "detail" in error
        ? error.detail
        : null;
    if (Array.isArray(detail))
      throw new Error(
        detail
          .map(
            (e: { loc: string[]; msg: string }) =>
              `${e.loc.slice(1).join(" → ")}: ${e.msg}`,
          )
          .join(". "),
      );
    throw new Error(
      typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}
export function useApi<T>(path: string, poll = false) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api<T>(path),
    refetchInterval: poll ? 1500 : false,
    refetchOnWindowFocus: true,
  });
}
