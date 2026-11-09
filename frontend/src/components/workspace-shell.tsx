import {
  Component,
  Fragment,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Empty } from "@/components/feedback";
import { FlaskConical, Layers2, MessageSquare, Play } from "@/components/icons";
import { LocalWorkspaceMenu } from "@/components/local-workspace-menu";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApi } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const { openMobile, setOpenMobile, state, isMobile } = useSidebar();
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const wasOpenMobile = useRef(openMobile);
  useEffect(() => {
    if (wasOpenMobile.current && !openMobile) menuTrigger.current?.focus();
    wasOpenMobile.current = openMobile;
  }, [openMobile]);
  const [params] = useSearchParams();
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
    { to: "/environments", label: "Environments", icon: Layers2 },
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
  const pageTitle =
    runId || studyId || location.pathname === "/new"
      ? (crumbs.at(-1)?.label ?? section)
      : section;
  useEffect(() => {
    document.title = `${pageTitle} | JAS`;
  }, [pageTitle]);
  return (
    <>
      <Button
        asChild
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        <a href="#main">Skip to content</a>
      </Button>
      <Sidebar collapsible="icon">
        <SidebarHeader
          className={isMobile ? undefined : "h-14 justify-center py-1"}
        >
          {isMobile && (
            <SidebarTrigger className="ml-auto" aria-label="Close menu" />
          )}
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Button
                variant="link"
                asChild
                className="h-auto w-fit gap-2 border-0 p-0 hover:no-underline active:not-aria-[haspopup]:translate-y-0"
              >
                <Link
                  to="/studies"
                  aria-label="JAS home"
                  title="JAS home"
                  onClick={() => setOpenMobile(false)}
                >
                  <img
                    src="/logo.svg"
                    width={20}
                    height={20}
                    className="size-5 shrink-0 object-contain"
                    alt=""
                  />
                  <span className="font-brand text-[22px] font-extrabold leading-none tracking-[-0.04em] group-data-[collapsible=icon]:hidden">
                    jas
                  </span>
                </Link>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {links.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={
                        !isMobile && state === "collapsed"
                          ? item.label
                          : undefined
                      }
                      isActive={
                        location.pathname.startsWith(item.to) ||
                        (item.to === "/studies" &&
                          location.pathname === "/new") ||
                        (item.to === "/runs" &&
                          location.pathname === "/compare")
                      }
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {item.to === "/runs" && active.length > 0 && (
                      <SidebarMenuBadge>{active.length}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Assistant</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={
                    !isMobile && state === "collapsed" ? "Agent" : undefined
                  }
                  isActive={isAgent}
                >
                  <NavLink to="/agent" onClick={() => setOpenMobile(false)}>
                    <MessageSquare />
                    <span>Agent</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <LocalWorkspaceMenu dark={dark} onThemeChange={changeTheme} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b pr-4 pl-3 sm:pr-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger
              ref={menuTrigger}
              aria-label={
                isMobile
                  ? "Open menu"
                  : state === "collapsed"
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
            />
            <Separator
              orientation="vertical"
              className="h-4 data-vertical:self-center"
            />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                {crumbs.map((crumb, i) => (
                  <Fragment key={crumb.to ?? "current"}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem className="min-w-0" title={crumb.label}>
                      {crumb.to ? (
                        <BreadcrumbLink asChild>
                          <Link className="truncate" to={crumb.to}>
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="truncate">
                          {crumb.label}
                        </BreadcrumbPage>
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
        <div
          id="main"
          className={cn(
            "min-w-0 w-full",
            isAgent
              ? "h-[calc(100svh-3.5rem)] min-h-0"
              : "mx-auto max-w-7xl p-4 pb-10 sm:p-6 lg:p-8",
          )}
          tabIndex={-1}
        >
          <Suspense fallback={<Loading />}>
            <PageBoundary key={location.pathname}>
              <Outlet />
            </PageBoundary>
          </Suspense>
        </div>
      </SidebarInset>
    </>
  );
}
