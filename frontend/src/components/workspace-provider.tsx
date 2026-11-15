import { type ReactNode, useState } from "react";
import { AssistantWorkspaceProvider } from "@/components/agent/assistant-workspace";
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
        className="h-dvh min-h-0 overflow-hidden"
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
        <AssistantWorkspaceProvider>{children}</AssistantWorkspaceProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
