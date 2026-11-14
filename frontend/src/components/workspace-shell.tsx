import {
  Component,
  Fragment,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Empty } from "@/components/feedback";
import {
  AgentIcon,
  BookOpen,
  FlaskConical,
  Github,
  Globe,
  House,
  Layers2,
  Moon,
  Play,
  Settings,
  Sun,
} from "@/components/icons";
import { Loading } from "@/components/shared";
import { SidebarBudget } from "@/components/sidebar-budget";
import { Button } from "@/components/ui/button";
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
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";
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
  const [brandHovered, setBrandHovered] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const location = useLocation();
  const isAgent = location.pathname === "/assistant";
  const isHome = location.pathname === "/";
  const isRecordList = ["/experiments", "/runs"].includes(location.pathname);
  const runs = useApi<RunSummary[]>("/runs", true);
  const active =
    runs.data?.filter((r) =>
      ["running", "queued", "pausing"].includes(r.status),
    ) ?? [];
  const primaryLinks = [
    { to: "/", label: "Home", icon: House },
    {
      to: "/assistant",
      label: "Assistant",
      icon: AgentIcon,
    },
  ];
  const links = [
    {
      to: "/experiments",
      label: "Experiments",
      icon: FlaskConical,
    },
    { to: "/runs", label: "Runs", icon: Play },
    {
      to: "/environments",
      label: "Environments",
      icon: Layers2,
    },
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
  return (
    <>
      <Button
        asChild
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        <a href="#main">Skip to content</a>
      </Button>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-(--workspace-header-height) shrink-0 justify-center border-b py-1">
          <SidebarMenu>
            <SidebarMenuItem className="relative flex h-7 items-center justify-between pr-0.5 pl-1.5">
              <Button
                variant="link"
                asChild
                className={cn(
                  "h-auto w-fit gap-2 border-0 p-0 text-foreground transition-none hover:no-underline active:not-aria-[haspopup]:translate-y-0",
                  state === "collapsed" && brandHovered && "opacity-0",
                )}
              >
                <Link
                  to="/"
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
              {isMobile ? (
                <SidebarTrigger className="shrink-0" aria-label="Close menu" />
              ) : (
                <SidebarTrigger
                  aria-label={
                    state === "collapsed"
                      ? "Expand sidebar"
                      : "Collapse sidebar"
                  }
                  onPointerEnter={() => {
                    if (state === "collapsed") setBrandHovered(true);
                  }}
                  onPointerLeave={(event) =>
                    setBrandHovered(
                      event.currentTarget.matches(":focus-visible"),
                    )
                  }
                  onFocus={(event) =>
                    setBrandHovered(
                      event.currentTarget.matches(":focus-visible"),
                    )
                  }
                  onBlur={() => setBrandHovered(false)}
                  onClick={(event) =>
                    setBrandHovered(
                      event.currentTarget.matches(":focus-visible"),
                    )
                  }
                  className={cn(
                    "shrink-0 transition-colors group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:left-0.5 group-data-[collapsible=icon]:bg-sidebar",
                    state === "collapsed" && !brandHovered && "opacity-0",
                  )}
                />
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Main navigation">
            {[
              { label: null, items: primaryLinks },
              { label: "Workspace", items: links },
              {
                label: "Community",
                items: [
                  {
                    to: "/gallery",
                    label: "Gallery",
                    icon: Globe,
                  },
                  {
                    to: "/published",
                    label: "My published",
                    icon: BookOpen,
                  },
                ],
              },
            ].map((group, index) => (
              <Fragment key={group.label ?? "primary"}>
                {index > 0 && (
                  <SidebarSeparator className="mx-4 group-data-[collapsible=icon]:mx-3" />
                )}
                <SidebarGroup>
                  {group.label && (
                    <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  )}
                  <SidebarMenu className="gap-0.75">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          tooltip={
                            !isMobile && state === "collapsed"
                              ? item.label
                              : undefined
                          }
                          isActive={
                            location.pathname === item.to ||
                            (item.to !== "/" &&
                              location.pathname.startsWith(item.to)) ||
                            (item.to === "/experiments" &&
                              location.pathname === "/new") ||
                            (item.to === "/runs" &&
                              location.pathname === "/compare")
                          }
                        >
                          <NavLink
                            to={item.to}
                            end={item.to === "/"}
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
                </SidebarGroup>
              </Fragment>
            ))}
          </nav>
        </SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarFooter className="group-data-[collapsible=icon]:gap-1">
          <SidebarBudget />
          <nav aria-label="Workspace settings">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                  tooltip={
                    !isMobile && state === "collapsed" ? "Settings" : undefined
                  }
                >
                  <NavLink to="/settings" onClick={() => setOpenMobile(false)}>
                    <Settings aria-hidden="true" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </nav>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header
          className="flex h-(--workspace-header-height) shrink-0 items-center gap-2 border-b bg-background px-2.5"
          data-slot="workspace-header"
        >
          {isMobile && (
            <SidebarTrigger ref={menuTrigger} aria-label="Open menu" />
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={changeTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
              <a
                href="https://github.com/jaiamin/jas"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub repository"
              >
                <Github />
              </a>
            </Button>
          </div>
        </header>
        <div
          key={location.pathname}
          data-slot="workspace-content"
          className={cn(
            "min-h-0 flex-1",
            isAgent
              ? "overflow-hidden"
              : "overflow-x-hidden overflow-y-auto overscroll-contain scroll-py-4 [scrollbar-gutter:stable]",
          )}
        >
          <div
            id="main"
            className={cn(
              "min-w-0 w-full",
              isAgent
                ? "h-full min-h-0"
                : isHome
                  ? "pb-10"
                  : isRecordList
                    ? "pb-10"
                    : "mx-auto max-w-7xl p-4 pb-10 sm:p-6 lg:p-8",
            )}
            tabIndex={-1}
          >
            <Suspense
              fallback={
                isAgent ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner aria-label="Loading Assistant" />
                  </div>
                ) : (
                  <Loading />
                )
              }
            >
              <PageBoundary key={location.pathname}>
                <Outlet />
              </PageBoundary>
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
