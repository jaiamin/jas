import { lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Empty } from "@/components/feedback";
import Gallery, { GalleryShell } from "@/pages/gallery";

const PublicExperiment = lazy(() => import("@/pages/public-experiment"));
const GalleryAccount = lazy(() => import("@/pages/gallery-account"));
const GalleryTerms = lazy(() => import("@/pages/gallery-terms"));

export default function GalleryApp() {
  return (
    <Routes>
      <Route element={<GalleryShell />}>
        <Route index element={<Gallery publicSurface />} />
        <Route path="gallery" element={<Gallery publicSurface />} />
        <Route path="gallery/account" element={<GalleryAccount />} />
        <Route path="login" element={<GalleryAccount loginOnly />} />
        <Route path="terms" element={<GalleryTerms />} />
        <Route path="p/:author/:slug/:version" element={<PublicExperiment />} />
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
  );
}
