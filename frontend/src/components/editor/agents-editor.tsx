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
import type { Catalog, EnvironmentId, Profile } from "@/lib/types";
import { modelLabel } from "@/lib/utils";
export function AgentsEditor({
  hidden,
  profiles,
  environment,
  models,
  onChange,
  onRemove,
}: {
  hidden: boolean;
  profiles: Profile[];
  environment: EnvironmentId;
  models: Catalog["models"];
  onChange: (profiles: Profile[]) => void;
  onRemove: (key: string) => void;
}) {
  function updateProfile(index: number, patch: Partial<Profile>) {
    onChange(
      profiles.map((profile, i) =>
        i === index ? { ...profile, ...patch } : profile,
      ),
    );
  }
  return (
    <section className="form-section" hidden={hidden}>
      <div className="section-heading">
        <div>
          <h2>
            Agents <span className="muted">{profiles.length}</span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={profiles.length >= 12}
          onClick={() => {
            let n = profiles.length + 1;
            while (profiles.some((p) => p.key === `agent-${n}`)) n++;
            onChange([
              ...profiles,
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
        {profiles.map((p, i) => (
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
                      onChange={(e) =>
                        updateProfile(i, { name: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`agent-${p.key}-role`}>
                      Role
                    </FieldLabel>
                    <Input
                      id={`agent-${p.key}-role`}
                      value={p.role}
                      onChange={(e) =>
                        updateProfile(i, { role: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Model</FieldLabel>
                    <Select
                      label={`Model for ${p.name}`}
                      value={p.model ?? "inherit"}
                      onValueChange={(value) =>
                        updateProfile(i, {
                          model: value === "inherit" ? null : value,
                        })
                      }
                      options={[
                        {
                          value: "inherit",
                          label: "Condition default",
                        },
                        ...models.map((m) => ({
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
                      onChange={(e) =>
                        updateProfile(i, { goal: e.target.value })
                      }
                    />
                  </Field>
                </FieldGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${p.name}`}
                  disabled={profiles.length <= 2}
                  onClick={() => onRemove(p.key)}
                >
                  <Trash2 />
                </Button>
              </div>
            </DisclosureContent>
          </Disclosure>
        ))}
      </div>
      {environment === "trust_exchange" && profiles.length % 2 !== 0 && (
        <Alert variant="error">
          Trust exchange needs an even number of agents for pairs. Add or remove
          one agent before saving.
        </Alert>
      )}
    </section>
  );
}
