import { AgentIcon } from "@/components/icons";

export function AgentWelcomeHeading({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <h2
      className={
        compact
          ? "flex items-center gap-1.5 pl-[15px] text-lg font-semibold tracking-tight"
          : "flex items-center justify-center gap-1.5 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
      }
    >
      <AgentIcon
        aria-hidden="true"
        className={
          compact
            ? "size-5.5 shrink-0 text-primary"
            : "size-7.5 shrink-0 text-primary sm:size-8.5"
        }
      />
      <span>What can we explore?</span>
    </h2>
  );
}
