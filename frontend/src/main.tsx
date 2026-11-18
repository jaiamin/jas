import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Loading } from "@/components/shared";
import { useInputModality } from "@/hooks/use-input-modality";
import "./index.css";

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 1000 } },
});
const gallery =
  document
    .querySelector('meta[name="jas-surface"]')
    ?.getAttribute("content") === "gallery";
const Surface = lazy(
  gallery ? () => import("./gallery-app") : () => import("./app"),
);

function App() {
  useInputModality();
  return (
    <Suspense fallback={<Loading />}>
      <Surface />
    </Suspense>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
