import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, vi } from "vitest";

const clients = new Set<QueryClient>();
afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
  vi.unstubAllGlobals();
});

export function renderWithQueries(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.add(client);
  return render(element, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

export function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}
