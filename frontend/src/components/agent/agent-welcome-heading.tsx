import { AgentTarget } from "@/components/agent/agent-target";

export function AgentWelcomeHeading() {
  return (
    <h1 className="flex items-center justify-center gap-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
      <AgentTarget
        motion="intro"
        aria-hidden="true"
        className="size-7.5 sm:size-8.5"
      />
      <span>What can we explore?</span>
    </h1>
  );
}
