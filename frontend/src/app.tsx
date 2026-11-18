import { lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
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
const Examples = lazy(() => import("@/pages/examples"));
const Matched = lazy(() => import("@/pages/matched"));
const Gallery = lazy(() => import("@/pages/gallery"));

export default function WorkspaceApp() {
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
        <Route path="examples" element={<Examples />} />
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
