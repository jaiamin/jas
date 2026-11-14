import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { agentSuggestions } from "@/lib/agent-suggestions";

const ideas = agentSuggestions({ context: "new" });
const illustrations = ["communication", "memory", "oversight", "resources"];
const titles = [
  "Can conversation build cooperation?",
  "Does memory change reciprocity?",
  "Does evidence access improve reports?",
  "Can teams finish with less budget?",
];
const descriptions = [
  "Compare contributions to a shared pool with public messages on or off.",
  "Compare return rates with private notes versus the same recorded history.",
  "Vary source access and compare report accuracy against the same records.",
  "Vary a team's material budget and compare completed work and handoffs.",
];

export function StarterExperiments({
  onChoose,
  disabled,
}: {
  onChoose: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <section aria-labelledby="starter-title" className="flex flex-col gap-3">
      <h2 id="starter-title" className="text-sm font-medium">
        Experiment ideas
      </h2>
      <ItemGroup className="gap-0 overflow-hidden rounded-xl border xl:flex-row">
        {ideas.map(({ prompt }, index) => (
          <Fragment key={illustrations[index]}>
            <Button
              variant="ghost"
              className="h-auto w-full min-w-0 flex-1 items-center justify-start gap-3 rounded-none border-0 p-4 whitespace-normal text-left focus-visible:ring-inset has-data-[icon=inline-start]:pl-4 xl:flex-col xl:items-start"
              disabled={disabled}
              onClick={() => onChoose(prompt)}
            >
              <img
                src={`/illustrations/suggestions/${illustrations[index]}.webp`}
                alt=""
                width={32}
                height={32}
                className="m-0.5 size-8 shrink-0 object-contain object-left saturate-50 contrast-90"
                data-icon="inline-start"
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col gap-1.5 xl:w-full">
                <span className="text-[0.9375rem] leading-[1.1875rem] font-semibold">
                  {titles[index]}
                </span>
                <span className="text-[0.8125rem] leading-4.5 font-normal text-foreground/60">
                  {descriptions[index]}
                </span>
              </span>
            </Button>
            {index < ideas.length - 1 && (
              <>
                <Separator className="xl:hidden" />
                <Separator orientation="vertical" className="hidden xl:block" />
              </>
            )}
          </Fragment>
        ))}
      </ItemGroup>
    </section>
  );
}
