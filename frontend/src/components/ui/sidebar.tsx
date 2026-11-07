import { Slot } from "@radix-ui/react-slot";
import { Menu } from "lucide-react";
import type * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SidebarContext = createContext<{
  mobile: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("Sidebar requires SidebarProvider");
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(query.matches);
      setOpen(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <SidebarContext.Provider value={{ mobile, setOpen }}>
      <Sheet open={open} onOpenChange={setOpen}>
        {children}
      </Sheet>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { mobile } = useSidebar();
  return mobile ? (
    <SheetContent>
      <SheetTitle className="sr-only">Navigation</SheetTitle>
      <SheetDescription className="sr-only">
        Experiments, runs, environments and settings.
      </SheetDescription>
      {children}
    </SheetContent>
  ) : (
    <aside className="sidebar">{children}</aside>
  );
}

export function SidebarTrigger() {
  const { mobile } = useSidebar();
  return mobile ? (
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Open menu">
        <Menu />
      </Button>
    </SheetTrigger>
  ) : null;
}

export function SidebarHeader(props: React.ComponentProps<"div">) {
  return <div className="sidebar-header" {...props} />;
}

export function SidebarContent(props: React.ComponentProps<"nav">) {
  return <nav className="sidebar-content" {...props} />;
}

export function SidebarFooter(props: React.ComponentProps<"div">) {
  return <div className="sidebar-footer" {...props} />;
}

export function SidebarMenu(props: React.ComponentProps<"ul">) {
  return <ul className="sidebar-menu" {...props} />;
}

export function SidebarMenuItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

export function SidebarMenuButton({
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className="nav-link" {...props} />;
}
