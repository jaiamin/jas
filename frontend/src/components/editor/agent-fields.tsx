import { useRef, useState } from "react";
import { Alert } from "@/components/feedback";
import { Plus, Trash2 } from "@/components/icons";
import { ModelPicker } from "@/components/model-picker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addProfile,
  canRemoveProfile,
  maximumParticipants,
  removeProfile,
} from "@/lib/design";
import { modelLabel } from "@/lib/format";
import type { Catalog, Design, ModelId, Profile } from "@/lib/types";

export function AgentFields({
  design,
  catalog,
  onChange,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
}) {
  const [open, setOpen] = useState<string[]>([design.profiles[0]?.key ?? ""]);
  const addedInput = useRef<string | null>(null);
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  function profile(index: number, value: Partial<Profile>) {
    update(
      "profiles",
      design.profiles.map((p, i) => (i === index ? { ...p, ...value } : p)),
    );
  }
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">
            Agents{" "}
            <span className="text-muted-foreground">
              {design.profiles.length}
            </span>
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            design.profiles.length >= maximumParticipants(design.environment)
          }
          onClick={() => {
            const next = addProfile(design);
            const key = next.profiles.at(-1)?.key ?? "";
            addedInput.current = `agent-${key}-name`;
            setOpen((open) => [...open, key]);
            onChange(next);
          }}
        >
          <Plus data-icon="inline-start" />
          Add agent
        </Button>
      </div>
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        {design.profiles.map((p, i) => (
          <AccordionItem value={p.key} key={p.key}>
            <AccordionTrigger className="min-w-0 items-center justify-start gap-3 hover:no-underline">
              <Badge variant="outline" className="shrink-0">
                {i + 1}
              </Badge>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span
                  title={p.name}
                  className="max-w-full truncate text-sm font-medium text-foreground"
                >
                  {p.name || "Unnamed agent"}
                </span>
                <span className="max-w-full text-xs font-normal text-muted-foreground break-words">
                  {p.role}
                </span>
              </span>
              <span className="ml-auto hidden max-w-48 truncate text-xs font-normal text-muted-foreground sm:inline">
                {p.model ? modelLabel(p.model) : "Condition model"}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-4 pb-2 pt-2">
                <FieldGroup className="grid min-w-0 grid-cols-1 gap-5">
                  <Field>
                    <FieldLabel htmlFor={`agent-${p.key}-name`}>
                      Name
                    </FieldLabel>
                    <Input
                      id={`agent-${p.key}-name`}
                      ref={(element) => {
                        if (element && addedInput.current === element.id) {
                          addedInput.current = null;
                          element.focus();
                        }
                      }}
                      value={p.name}
                      maxLength={60}
                      onChange={(e) => profile(i, { name: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`agent-${p.key}-role`}>
                      Role
                    </FieldLabel>
                    <Input
                      id={`agent-${p.key}-role`}
                      value={p.role}
                      maxLength={80}
                      onChange={(e) => profile(i, { role: e.target.value })}
                    />
                  </Field>
                  <Field className="col-span-full">
                    <FieldLabel htmlFor={`agent-${p.key}-model`}>
                      Model
                    </FieldLabel>
                    <ModelPicker
                      id={`agent-${p.key}-model`}
                      label={`Model for ${p.name}`}
                      value={p.model ?? "inherit"}
                      onChange={(value) =>
                        profile(i, {
                          model:
                            value === "inherit" ? null : (value as ModelId),
                        })
                      }
                      models={catalog.models}
                      inherit
                    />
                  </Field>
                  <Field className="col-span-full">
                    <FieldLabel htmlFor={`agent-${p.key}-goal`}>
                      Private goal
                    </FieldLabel>
                    <Textarea
                      id={`agent-${p.key}-goal`}
                      rows={2}
                      value={p.goal}
                      maxLength={2000}
                      onChange={(e) => profile(i, { goal: e.target.value })}
                    />
                  </Field>
                </FieldGroup>
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  size="sm"
                  aria-label={`Remove ${p.name}`}
                  disabled={!canRemoveProfile(design, p.key)}
                  onClick={() => onChange(removeProfile(design, p.key))}
                >
                  <Trash2 data-icon="inline-start" />
                  Remove agent
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {design.environment === "trust_exchange" &&
        design.profiles.length % 2 !== 0 && (
          <Alert variant="error">
            Trust exchange needs an even number of agents for pairs. Add or
            remove one agent before saving.
          </Alert>
        )}
    </section>
  );
}
