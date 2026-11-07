import {
  Activity,
  Home as HomeIcon,
  Layers3,
  LayoutGrid,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";
import { Component, Fragment, lazy, Suspense, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Loading } from "@/components/shared";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge, Empty } from "@/components/ui/data";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";
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
      <Empty
        title="This view could not load"
        description="Reload to reconnect. Your runs continue on the server."
      >
        <Button onClick={() => location.reload()}>Reload workspace</Button>
      </Empty>
    ) : (
      this.props.children
    );
  }
}

function Shell() {
  const { setOpen } = useSidebar();
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
  const runId = location.pathname.match(/^\/runs\/([^/]+)$/)?.[1];
  const studyId = location.pathname.match(/^\/studies\/([^/]+)$/)?.[1];
  const selectedRun = runs.data?.find((r) => r.id === runId);
  const selectedStudy = runs.data?.find((r) => r.study_id === studyId);
  const crumbs: { label: string; to?: string }[] = runId
    ? [
        { label: "Experiments", to: "/studies" },
        ...(selectedRun
          ? [
              {
                label: selectedRun.study_title,
                to: `/studies/${selectedRun.study_id}`,
              },
            ]
          : []),
        { label: selectedRun?.condition ?? "Run" },
      ]
    : studyId
      ? [
          { label: "Experiments", to: "/studies" },
          { label: selectedStudy?.study_title ?? "Experiment" },
        ]
      : location.pathname === "/new"
        ? [
            { label: "Experiments", to: "/studies" },
            {
              label: new URLSearchParams(location.search).has("study")
                ? "Tune experiment"
                : "New experiment",
            },
          ]
        : location.pathname === "/compare"
          ? [{ label: "Runs", to: "/runs" }, { label: "Compare" }]
          : [{ label: section }];
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar>
        <SidebarHeader>
          <Link
            to="/"
            className="brand"
            aria-label="ASS home"
            onClick={() => setOpen(false)}
          >
            <span className="brand-mark" aria-hidden="true" />
            ASS
          </Link>
        </SidebarHeader>
        <SidebarContent aria-label="Main navigation">
          <SidebarMenu>
            {links.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.to === "/runs" && active.length > 0 && (
                      <Badge className="nav-count">{active.length}</Badge>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/settings" onClick={() => setOpen(false)}>
                  <Settings2 />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={changeTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <div className="shell-body">
        <header className="shell-header">
          <div className="header-path">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((crumb, i) => (
                  <Fragment key={crumb.to ?? "current"}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem title={crumb.label}>
                      {crumb.to ? (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.to}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
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
      <Route
        element={
          <SidebarProvider>
            <Shell />
          </SidebarProvider>
        }
      >
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
            <Empty title="Page not found">
              <Button variant="outline" asChild>
                <Link to="/">Return home</Link>
              </Button>
            </Empty>
          }
        />
      </Route>
    </Routes>
  );
}
