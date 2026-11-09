import { type ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem("jas-sidebar") !== "collapsed";
    } catch {
      return true;
    }
  });
  return (
    <TooltipProvider>
      <SidebarProvider
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          try {
            localStorage.setItem(
              "jas-sidebar",
              next ? "expanded" : "collapsed",
            );
          } catch {
            // Navigation remains usable when browser storage is unavailable.
          }
        }}
      >
        {children}
      </SidebarProvider>
    </TooltipProvider>
  );
}
