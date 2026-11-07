import {
  Activity,
  Layers3,
  LayoutGrid,
  MessageSquare,
  Moon,
  Plus,
  Settings2,
  Sparkles,
  Sun,
} from "lucide-react";
import { Component, Fragment, lazy, Suspense, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";

const AgentPanel = lazy(() => import("@/components/agent-panel"));

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
  const studies = useApi<StudySummary[]>("/studies", true);
  const links = [
    { to: "/studies", label: "Experiments", icon: Layers3 },
    { to: "/runs", label: "Runs", icon: Activity },
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
              : location.pathname.startsWith("/design")
                ? "Design with AI"
                : "Workspace";
  const runId = location.pathname.match(/^\/runs\/([^/]+)$/)?.[1];
  const studyId = location.pathname.match(/^\/studies\/([^/]+)$/)?.[1];
  const selectedRun = runs.data?.find((r) => r.id === runId);
  const selectedStudy = studies.data?.find((study) => study.id === studyId);
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
          { label: selectedStudy?.title ?? "Experiment" },
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
            to="/studies"
            className="brand"
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
            <span className="brand-name">JAS</span>
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
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
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
          <SidebarGroup>
            <SidebarGroupLabel>Build</SidebarGroupLabel>
            <SidebarMenu>
              {[
                { to: "/design", label: "Design with AI", icon: Sparkles },
                {
                  to: "/environments",
                  label: "Environments",
                  icon: LayoutGrid,
                },
              ].map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink to={item.to} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {!!studies.data?.length && (
            <SidebarGroup className="recent-navigation">
              <SidebarGroupLabel>Recent experiments</SidebarGroupLabel>
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
        <main id="main" className="page" tabIndex={-1}>
          <Suspense fallback={<Loading />}>
            <PageBoundary key={location.pathname}>
              <Outlet />
            </PageBoundary>
          </Suspense>
        </main>
      </SidebarInset>
      <Sheet modal={agentModal} open={agentOpen} onOpenChange={setAgentOpen}>
        <SheetContent
          className="agent-panel"
          showCloseButton
          onInteractOutside={(event) => {
            if (!agentModal) event.preventDefault();
          }}
        >
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
