import {
  Activity,
  ArrowUpRight,
  FlaskConical,
  Home as HomeIcon,
  Layers3,
  LayoutGrid,
  Menu,
  Moon,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { Component, lazy, Suspense, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Home, Studies } from "@/pages/home";

const Editor = lazy(() => import("@/pages/editor"));
const Study = lazy(() => import("@/pages/study"));
const Run = lazy(() => import("@/pages/run"));
const Library = lazy(() => import("@/pages/library"));
const Compare = lazy(() => import("@/pages/compare"));

class PageBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h1>This view could not load</h1>
        <p>Your runs continue on the server. Reload to reconnect.</p>
        <Button onClick={() => location.reload()}>Reload workspace</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Shell() {
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const location = useLocation();
  const runs = useApi<RunSummary[]>("/runs", true);
  const active =
    runs.data?.filter((r) =>
      ["running", "queued", "pausing"].includes(r.status),
    ) ?? [];
  const links = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/studies", label: "Experiments", icon: Layers3 },
    { to: "/runs", label: "Runs", icon: Activity },
    { to: "/environments", label: "Environments", icon: LayoutGrid },
  ];
  function changeTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ass-theme", next ? "dark" : "light");
    } catch {
      /* Storage can be unavailable in private contexts. */
    }
  }
  const section = location.pathname.startsWith("/new")
    ? "Experiment design"
    : location.pathname.startsWith("/studies")
      ? "Experiments"
      : location.pathname.startsWith("/runs")
        ? "Runs"
        : location.pathname.startsWith("/environments")
          ? "Environments"
          : location.pathname.startsWith("/settings")
            ? "Settings"
            : location.pathname.startsWith("/compare")
              ? "Compare runs"
              : "Home";
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {menu && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={cn("sidebar", menu && "sidebar-open")}>
        <Link to="/" className="brand" onClick={() => setMenu(false)}>
          <div className="brand-mark">
            <FlaskConical />
          </div>
          <span>
            ASS
            <span className="brand-subtitle">Agent Simulation Environment</span>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">L</span>
          <div>
            <strong>Local workspace</strong>
            <span>Your data, on your machine</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                cn("nav-link", isActive && "nav-link-active")
              }
            >
              <item.icon />
              <span>{item.label}</span>
              {item.to === "/runs" && active.length > 0 && (
                <span className="nav-count">{active.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {active.length > 0 && (
            <Link className="active-runs" to="/runs">
              <span className="live-dot" />
              {active.length} active run{active.length !== 1 && "s"}
              <ArrowUpRight />
            </Link>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn("nav-link", isActive && "nav-link-active")
            }
            onClick={() => setMenu(false)}
          >
            <Settings2 />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
      <div className="shell-body">
        <header className="shell-header">
          <div className="header-path">
            <Button
              variant="ghost"
              size="icon"
              className="menu-button"
              aria-label={menu ? "Close menu" : "Open menu"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
            <Link to="/">Workspace</Link>
            <span>/</span>
            <span>{section}</span>
          </div>
          <div className="actions">
            <span className="local-label">
              <span className="status-dot" />
              Local
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={changeTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <main id="main" className="page">
          <Suspense fallback={<Loading />}>
            <PageBoundary key={location.pathname}>
              <Outlet />
            </PageBoundary>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="studies" element={<Studies />} />
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
            <div className="empty">
              <h1>Page not found</h1>
              <Link to="/">Return home</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
