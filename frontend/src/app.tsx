import {
  Activity,
  Home as HomeIcon,
  Layers3,
  LayoutGrid,
  MessageSquare,
  Moon,
  Plus,
  Settings2,
  Sun,
  Workflow,
} from "lucide-react";
import { Component, Fragment, lazy, Suspense, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useSearchParams,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";
import { Home, Studies } from "@/pages/home";

const AgentPanel = lazy(() => import("@/components/agent-panel"));
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
  const { setOpenMobile, state } = useSidebar();
  const agentModal = useIsMobile(1100);
  const [params, setParams] = useSearchParams();
  const agentOpen = params.has("assistant") || params.get("tab") === "research";
  function setAgentOpen(open: boolean) {
    const next = new URLSearchParams(params);
    if (open) next.set("assistant", "1");
    else {
      next.delete("assistant");
      if (next.get("tab") === "research") next.delete("tab");
    }
    setParams(next, { replace: true });
  }
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
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            to="/"
            className="brand"
            aria-label="ASS home"
            onClick={() => setOpenMobile(false)}
          >
            <span className="brand-mark" aria-hidden="true">
              <Workflow />
            </span>
            <span className="brand-name">
              ASS<span>Agent Simulation Environment</span>
            </span>
          </Link>
        </SidebarHeader>
        <div className="sidebar-create">
          <Button variant="outline" asChild title="New experiment">
            <Link to="/new" onClick={() => setOpenMobile(false)}>
              <Plus data-icon="inline-start" />
              <span>New experiment</span>
            </Link>
          </Button>
        </div>
        <SidebarContent>
          <SidebarGroup>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {links.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        title={state === "collapsed" ? item.label : undefined}
                        onClick={() => setOpenMobile(false)}
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
            </nav>
          </SidebarGroup>
          <SidebarGroup className="recent-navigation">
            <SidebarGroupLabel>Recent experiments</SidebarGroupLabel>
            <SidebarMenu>
              {[
                ...new Map(
                  runs.data?.map((r) => [r.study_id, r.study_title]),
                ).entries(),
              ]
                .slice(0, 5)
                .map(([id, title]) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton asChild isActive={studyId === id}>
                      <Link
                        to={`/studies/${id}`}
                        title={title}
                        onClick={() => setOpenMobile(false)}
                      >
                        <span className="recent-mark" />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink to="/settings" onClick={() => setOpenMobile(false)}>
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
      <SidebarInset className="shell-body" data-assistant-open={agentOpen}>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAgentOpen(true)}
            aria-expanded={agentOpen}
          >
            <MessageSquare data-icon="inline-start" />
            Ask AI
          </Button>
        </header>
        <main id="main" className="page">
          <Suspense fallback={<Loading />}>
            <PageBoundary key={location.pathname}>
              <Outlet />
            </PageBoundary>
          </Suspense>
        </main>
      </SidebarInset>
      <Sheet modal={agentModal} open={agentOpen} onOpenChange={setAgentOpen}>
        <SheetContent className="agent-panel" showCloseButton>
          <SheetHeader>
            <SheetTitle>Research assistant</SheetTitle>
            <SheetDescription className="sr-only">
              Design experiments and investigate recorded evidence.
            </SheetDescription>
          </SheetHeader>
          <Suspense fallback={<Loading />}>
            <AgentPanel
              key={runId ?? studyId ?? "design"}
              studyId={studyId ?? selectedRun?.study_id}
              runId={runId}
            />
          </Suspense>
        </SheetContent>
      </Sheet>
    </>
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
