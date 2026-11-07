import { lazy } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/data";
import { SidebarProvider } from "@/components/ui/sidebar";
import WorkspaceShell from "@/components/workspace-shell";
import Experiments from "@/pages/experiments";

const DesignPage = lazy(() => import("@/pages/design"));
const Editor = lazy(() => import("@/pages/editor"));
const Study = lazy(() => import("@/pages/study"));
const Run = lazy(() => import("@/pages/run"));
const Library = lazy(() => import("@/pages/library"));
const Compare = lazy(() => import("@/pages/compare"));

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <SidebarProvider>
            <WorkspaceShell />
          </SidebarProvider>
        }
      >
        <Route index element={<Navigate to="/studies" replace />} />
        <Route path="studies" element={<Experiments />} />
        <Route path="design" element={<DesignPage />} />
        <Route path="studies/:id" element={<Study />} />
        <Route path="new" element={<Editor />} />
        <Route path="runs" element={<Library view="runs" />} />
        <Route path="runs/:id" element={<Run />} />
        <Route path="environments" element={<Library view="environments" />} />
        <Route path="settings" element={<Library view="settings" />} />
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
