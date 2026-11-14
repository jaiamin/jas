import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/types";

function saved(key: string) {
  try {
    return localStorage.getItem(`jas:onboarding:${key}`) === "true";
  } catch {
    return false;
  }
}

export function FirstRunStrip({
  settings,
  hasRun,
}: {
  settings?: Settings;
  hasRun: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => saved("dismissed"));
  const [error, setError] = useState("");
  const steps = [
    {
      label: "Watch a run",
      to: "/watch/commons-messages",
      done: saved("watched"),
    },
    {
      label: "Add a model",
      to: "/settings",
      done: Object.values(settings?.providers ?? {}).some(Boolean),
    },
    {
      label: "Run a starter",
      to: "/new?starter=commons-messages",
      done: hasRun,
    },
    { label: "Publish", to: "/experiments", done: saved("published") },
  ];
  if (dismissed || steps.every((step) => step.done)) return null;
  return (
    <section
      aria-label="Get started"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2"
    >
      <span className="text-xs font-medium">Get started</span>
      <ol className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
        {steps.map((step, index) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {step.done ? (
                <Check className="size-3" aria-label="Complete" />
              ) : (
                <span className="tabular-nums">{index + 1}.</span>
              )}
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss getting started"
        onClick={() => {
          try {
            localStorage.setItem("jas:onboarding:dismissed", "true");
            setDismissed(true);
          } catch {
            setError("Could not save this preference.");
          }
        }}
      >
        <X />
      </Button>
      {error && (
        <p role="status" className="w-full text-xs text-muted-foreground">
          {error}
        </p>
      )}
    </section>
  );
}
