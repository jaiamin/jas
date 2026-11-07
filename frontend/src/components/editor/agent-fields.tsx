import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { removeProfile } from "@/lib/design";
import type { Catalog, Design, ModelId, Profile } from "@/lib/types";
import { modelLabel } from "@/lib/utils";

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
    <section className="form-section" hidden={hidden}>
      <div className="section-heading">
        <div>
          <h2>
            Agents <span className="muted">{design.profiles.length}</span>
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
      <div className="profile-list">
        {design.profiles.map((p, i) => (
          <Disclosure className="profile-disclosure" key={p.key}>
            <DisclosureTrigger indicator={false} className="profile-heading">
              <span className="profile-avatar" data-series={i % 6}>
                {p.name.slice(0, 1)}
              </span>
              <span className="profile-summary">
                <strong>{p.name || "Unnamed agent"}</strong>
                <span>{p.role}</span>
              </span>
              <span className="profile-model">
                {p.model ? modelLabel(p.model) : "Condition model"}
              </span>
              <ChevronDown />
            </DisclosureTrigger>
            <DisclosureContent>
              <div className="profile-editor">
                <FieldGroup className="profile-fields">
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
                  <Field className="profile-goal">
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
            </DisclosureContent>
          </Disclosure>
        ))}
      </div>
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
