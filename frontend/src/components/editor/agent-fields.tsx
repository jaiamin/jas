import { Alert } from "@/components/feedback";
import { Plus, Trash2 } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { removeProfile } from "@/lib/design";
import { modelLabel } from "@/lib/format";
import type { Catalog, Design, ModelId, Profile } from "@/lib/types";

export function AgentFields({
  design,
  catalog,
  onChange,
  hidden,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  hidden: boolean;
}) {
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
    <section className="mb-6 flex flex-col gap-6" hidden={hidden}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold">
            Agents{" "}
            <span className="text-muted-foreground">
              {design.profiles.length}
            </span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={design.profiles.length >= 12}
          onClick={() => {
            let n = design.profiles.length + 1;
            while (design.profiles.some((p) => p.key === `agent-${n}`)) n++;
            update("profiles", [
              ...design.profiles,
              {
                key: `agent-${n}`,
                name: `Agent ${n}`,
                role: "Participant",
                model: null,
                goal: "Pursue your goals under the environment's rules.",
              },
            ]);
          }}
        >
          <Plus data-icon="inline-start" />
          Add agent
        </Button>
      </div>
      <Accordion type="multiple">
        {design.profiles.map((p, i) => (
          <AccordionItem value={p.key} key={p.key}>
            <AccordionTrigger className="w-full justify-start gap-3">
              <Avatar>
                <AvatarFallback>{p.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col items-start gap-1 [&>span]:text-xs [&>span]:text-muted-foreground">
                <strong>{p.name || "Unnamed agent"}</strong>
                <span>{p.role}</span>
              </span>
              <span className="ml-auto hidden truncate sm:inline">
                {p.model ? modelLabel(p.model) : "Condition model"}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex items-start gap-3 p-4">
                <FieldGroup className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`agent-${p.key}-name`}>
                      Name
                    </FieldLabel>
                    <Input
                      id={`agent-${p.key}-name`}
                      value={p.name}
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
                      onChange={(e) => profile(i, { role: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Model</FieldLabel>
                    <Select
                      label={`Model for ${p.name}`}
                      value={p.model ?? "inherit"}
                      onValueChange={(value) =>
                        profile(i, {
                          model:
                            value === "inherit" ? null : (value as ModelId),
                        })
                      }
                      options={[
                        {
                          value: "inherit",
                          label: "Condition default",
                        },
                        ...catalog.models.map((m) => ({
                          value: m.id,
                          label: modelLabel(m.id),
                        })),
                      ]}
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
                      onChange={(e) => profile(i, { goal: e.target.value })}
                    />
                  </Field>
                </FieldGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${p.name}`}
                  disabled={design.profiles.length <= 2}
                  onClick={() => onChange(removeProfile(design, p.key))}
                >
                  <Trash2 />
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
