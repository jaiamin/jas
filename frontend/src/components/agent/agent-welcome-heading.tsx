export function AgentWelcomeHeading({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <h2
      className={
        compact
          ? "flex items-center gap-2 text-xl font-semibold tracking-tight"
          : "flex items-center justify-center gap-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
      }
    >
      <img
        src="/logo.svg"
        width={28}
        height={28}
        alt=""
        aria-hidden="true"
        className={
          compact
            ? "size-6 shrink-0 object-contain"
            : "size-7.5 shrink-0 object-contain sm:size-8.5"
        }
      />
      <span>What can we explore?</span>
    </h2>
  );
}
