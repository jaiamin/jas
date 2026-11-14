import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import { useInputModality } from "@/hooks/use-input-modality";
import Experiments from "@/pages/experiments";
import Home from "@/pages/home";
import Runs from "@/pages/runs";

const AgentPage = lazy(() => import("@/pages/agent"));
const Editor = lazy(() => import("@/pages/editor"));
const Study = lazy(() => import("@/pages/study"));
const Run = lazy(() => import("@/pages/run"));
const Environments = lazy(() => import("@/pages/environments"));
const Settings = lazy(() => import("@/pages/settings"));
const Compare = lazy(() => import("@/pages/compare"));
const Watch = lazy(() => import("@/pages/watch"));
const Matched = lazy(() => import("@/pages/matched"));
const Gallery = lazy(() => import("@/pages/gallery"));
const GalleryShell = lazy(() =>
  import("@/pages/gallery").then((module) => ({
    default: module.GalleryShell,
  })),
);
const PublicExperiment = lazy(() => import("@/pages/public-experiment"));
const GalleryAccount = lazy(() => import("@/pages/gallery-account"));
const GalleryTerms = lazy(() => import("@/pages/gallery-terms"));

export default function App() {
  useInputModality();
  if (
    document
      .querySelector('meta[name="jas-surface"]')
      ?.getAttribute("content") === "gallery"
  ) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<GalleryShell />}>
            <Route index element={<Gallery publicSurface />} />
            <Route path="gallery" element={<Gallery publicSurface />} />
            <Route path="gallery/account" element={<GalleryAccount />} />
            <Route path="login" element={<GalleryAccount loginOnly />} />
            <Route path="terms" element={<GalleryTerms />} />
            <Route
              path="p/:author/:slug/:version"
              element={<PublicExperiment />}
            />
            <Route
              path="*"
              element={
                <Empty title="Page not found">
                  <Link to="/gallery">Browse experiments</Link>
                </Empty>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    );
  }
  return (
    <Routes>
      <Route
        element={
          <WorkspaceProvider>
            <WorkspaceShell />
          </WorkspaceProvider>
        }
      >
        <Route index element={<Home />} />
        <Route path="experiments" element={<Experiments />} />
        <Route path="assistant" element={<AgentPage />} />
        <Route path="experiments/:id" element={<Study />} />
        <Route path="experiments/:id/matched" element={<Matched />} />
        <Route path="new" element={<Editor />} />
        <Route path="runs" element={<Runs />} />
        <Route path="runs/:id" element={<Run />} />
        <Route path="environments" element={<Environments />} />
        <Route path="settings" element={<Settings />} />
        <Route path="compare" element={<Compare />} />
        <Route path="watch/:id" element={<Watch />} />
        <Route path="gallery" element={<Gallery />} />
        <Route
          path="*"
          element={
            <Empty
              title="Page not found"
              description="This address does not point to a workspace view."
            >
              <Button variant="outline" asChild>
                <Link to="/experiments">Back to experiments</Link>
              </Button>
            </Empty>
          }
        />
      </Route>
    </Routes>
  );
}
