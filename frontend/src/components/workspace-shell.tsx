import {
  FlaskConical,
  Layers2,
  MessageCircle,
  MessageSquare,
  Moon,
  PanelLeft,
  Play,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { Component, Fragment, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
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
import { Separator } from "@/components/ui/separator";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApi } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";

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

export default function WorkspaceShell() {
  const { setOpenMobile, state, isMobile, toggleSidebar } = useSidebar();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const location = useLocation();
  const isAgent = location.pathname === "/agent";
  const runs = useApi<RunSummary[]>("/runs", true);
  const active =
    runs.data?.filter((r) =>
      ["running", "queued", "pausing"].includes(r.status),
    ) ?? [];
  const studies = useApi<StudySummary[]>("/studies", true);
  const links = [
    { to: "/studies", label: "Experiments", icon: FlaskConical },
    { to: "/runs", label: "Runs", icon: Play },
  ];
  function changeTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("jas-theme", next ? "dark" : "light");
    } catch {
      /* Storage can be unavailable in private contexts. */
    }
  }
  const section =
    [
      { prefix: "/new", label: "Experiment design" },
      { prefix: "/studies", label: "Experiments" },
      { prefix: "/runs", label: "Runs" },
      { prefix: "/environments", label: "Environments" },
      { prefix: "/settings", label: "Settings" },
      { prefix: "/compare", label: "Compare runs" },
      { prefix: "/design", label: "Agent" },
      { prefix: "/agent", label: "Agent" },
    ].find(({ prefix }) => location.pathname.startsWith(prefix))?.label ??
    "Workspace";
  const runId = location.pathname.match(/^\/runs\/([^/]+)$/)?.[1];
  const studyId = location.pathname.match(/^\/studies\/([^/]+)$/)?.[1];
  const selectedRun = runs.data?.find((r) => r.id === runId);
  const selectedStudy = studies.data?.find((study) => study.id === studyId);
  function breadcrumbs(): { label: string; to?: string }[] {
    if (runId)
      return [
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
      ];
    if (studyId)
      return [
        { label: "Experiments", to: "/studies" },
        { label: selectedStudy?.title ?? "Experiment" },
      ];
    if (location.pathname === "/new")
      return [
        { label: "Experiments", to: "/studies" },
        {
          label: params.has("study") ? "Tune experiment" : "New experiment",
        },
      ];
    if (location.pathname === "/compare")
      return [{ label: "Runs", to: "/runs" }, { label: "Compare" }];
    return [{ label: section }];
  }
  const crumbs = breadcrumbs();
  useEffect(() => {
    if (params.has("assistant") || params.get("tab") === "research") {
      const context = runId
        ? `run:${runId}`
        : studyId
          ? `study:${studyId}`
          : "general";
      navigate(`/agent?context=${encodeURIComponent(context)}`, {
        replace: true,
      });
    }
  }, [params, runId, studyId, navigate]);
  const pageTitle =
    runId || studyId || location.pathname === "/new"
      ? (crumbs.at(-1)?.label ?? section)
      : section;
  useEffect(() => {
    document.title = `${pageTitle} | JAS`;
  }, [pageTitle]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            to="/studies"
            className="brand brand-home"
            hidden={state === "collapsed" && !isMobile}
            aria-label="JAS home"
            onClick={() => setOpenMobile(false)}
          >
            <img
              className="brand-mark"
              src="/logo.svg"
              width={24}
              height={24}
              alt=""
            />
            <span className="brand-wordmark">jas</span>
          </Link>
          <Button
            data-sidebar="trigger"
            variant="ghost"
            size="icon"
            className={
              state === "collapsed" && !isMobile
                ? "brand brand-toggle"
                : "sidebar-toggle"
            }
            aria-label={
              isMobile
                ? "Close menu"
                : state === "collapsed"
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            title={
              isMobile
                ? "Close menu"
                : `${state === "collapsed" ? "Expand" : "Collapse"} sidebar (Ctrl/⌘ B)`
            }
            onClick={toggleSidebar}
          >
            {state === "collapsed" && !isMobile && (
              <img
                className="brand-mark"
                src="/logo.svg"
                width={24}
                height={24}
                alt=""
              />
            )}
            <PanelLeft
              className={
                state === "collapsed" && !isMobile
                  ? "brand-toggle-icon"
                  : undefined
              }
              aria-hidden="true"
            />
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {links.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.to}
                        title={state === "collapsed" ? item.label : undefined}
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon aria-hidden="true" />
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
          <Separator className="sidebar-separator" />
          <SidebarGroup>
            <SidebarMenu>
              {[
                { to: "/agent", label: "Agent", icon: MessageCircle },
                {
                  to: "/environments",
                  label: "Environments",
                  icon: Layers2,
                },
              ].map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink to={item.to} onClick={() => setOpenMobile(false)}>
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {!!studies.data?.length && (
            <SidebarGroup className="recent-navigation">
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              <SidebarMenu>
                {studies.data.slice(0, 5).map((study) => (
                  <SidebarMenuItem key={study.id}>
                    <SidebarMenuButton asChild isActive={studyId === study.id}>
                      <Link
                        to={`/studies/${study.id}`}
                        title={study.title}
                        onClick={() => setOpenMobile(false)}
                      >
                        <span className="recent-mark" />
                        <span>{study.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink to="/settings" onClick={() => setOpenMobile(false)}>
                  <SlidersHorizontal aria-hidden="true" />
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
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="shell-body">
        <header className="shell-header">
          <div className="header-path">
            {isMobile && <SidebarTrigger />}
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
          {(runId || studyId) && (
            <Button variant="outline" size="sm" asChild>
              <Link
                to={`/agent?context=${encodeURIComponent(runId ? `run:${runId}` : `study:${studyId}`)}`}
              >
                <MessageSquare data-icon="inline-start" />
                Ask Agent
              </Link>
            </Button>
          )}
        </header>
        <main
          id="main"
          className={isAgent ? "page page-agent" : "page"}
          tabIndex={-1}
        >
          <Suspense fallback={<Loading />}>
            <PageBoundary key={location.pathname}>
              <Outlet />
            </PageBoundary>
          </Suspense>
        </main>
      </SidebarInset>
    </>
  );
}
