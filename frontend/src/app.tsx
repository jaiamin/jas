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

export default function App() {
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
        <Route path="studies" element={<Experiments />} />
        <Route path="agent" element={<AgentPage />} />
        <Route path="studies/:id" element={<Study />} />
        <Route path="new" element={<Editor />} />
        <Route path="runs" element={<Runs />} />
        <Route path="runs/:id" element={<Run />} />
        <Route path="environments" element={<Environments />} />
        <Route path="settings" element={<Settings />} />
        <Route path="compare" element={<Compare />} />
        <Route
          path="*"
          element={
            <Empty
              title="Page not found"
              description="This address does not point to a workspace view."
            >
              <Button variant="outline" asChild>
                <Link to="/studies">Back to experiments</Link>
              </Button>
            </Empty>
          }
        />
      </Route>
    </Routes>
  );
}
