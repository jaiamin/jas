import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { OptionSelect } from "@/components/option-select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { label } from "@/lib/format";
import type { WorkflowRules } from "@/lib/types";

export function WorkflowAssumptions({ rules }: { rules: WorkflowRules }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm break-words">
      <p>
        {rules.resource_stock} materials initially ·{" "}
        {rules.timing === "sequential" ? "Sequential" : "Phased simultaneous"} ·{" "}
        {rules.delivery_delay} ticks of message delay
      </p>
      {rules.work_items.map((work) => (
        <div key={work.key} className="flex flex-col gap-1">
          <p>
            {label(work.key)} · {work.resource_cost} materials · {work.duration}{" "}
            ticks
          </p>
          <p className="text-muted-foreground">
            Workers: {work.workers.join(", ")} · Handoff to:{" "}
            {work.handoff_to.join(", ")}
          </p>
          {work.dependencies.length > 0 && (
            <p>
              {work.key} depends on {work.dependencies.join(", ")}
            </p>
          )}
        </div>
      ))}
      <p>Activation order: {rules.turn_order.join(" → ")}</p>
      <p>Conflict priority: {rules.conflict_order.join(" → ")}</p>
      <p>
        Addressed routes:{" "}
        {rules.routes
          .map((route) => `${route.sender} → ${route.recipient}`)
          .join("; ") || "None"}
      </p>
      <p className="text-muted-foreground">
        Only the selected recipient can accept a handoff. Starts consume
        materials and a write together. Provider speed and participant prose
        cannot change work rules.
      </p>
    </div>
  );
}

export function WorkflowFields({
  rules,
  id,
  onChange,
}: {
  rules: WorkflowRules;
  id: string;
  onChange: (rules: WorkflowRules) => void;
}) {
  return (
    <FieldSet className="min-w-0">
      <FieldLegend>Owned work and handoffs</FieldLegend>
      <FieldDescription>
        Work starts require ownership, accepted prerequisites and enough
        materials. Edit work bindings, permissions, activation order and message
        routes in Specification.
      </FieldDescription>
      <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-materials`}>Initial materials</FieldLabel>
          <Input
            id={`${id}-materials`}
            type="number"
            min={0}
            max={12000}
            value={rules.resource_stock}
            onChange={(e) =>
              onChange({ ...rules, resource_stock: Number(e.target.value) })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-workflow-timing`}>
            Logical timing
          </FieldLabel>
          <OptionSelect
            id={`${id}-workflow-timing`}
            label="Logical timing"
            value={rules.timing}
            options={[
              { value: "sequential", label: "Sequential" },
              { value: "phased_simultaneous", label: "Phased simultaneous" },
            ]}
            onValueChange={(timing) => onChange({ ...rules, timing })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-workflow-delay`}>
            Message delay in logical ticks
          </FieldLabel>
          <Input
            id={`${id}-workflow-delay`}
            type="number"
            min={1}
            max={12}
            value={rules.delivery_delay}
            onChange={(e) =>
              onChange({ ...rules, delivery_delay: Number(e.target.value) })
            }
          />
        </Field>
      </FieldGroup>
      {rules.work_items.map((work, index) => (
        <Disclosure key={work.key} defaultOpen={index === 0}>
          <DisclosureTrigger>{label(work.key)} work rules</DisclosureTrigger>
          <DisclosureContent className="pt-3">
            <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-${work.key}-cost`}>
                  {label(work.key)} material cost
                </FieldLabel>
                <Input
                  id={`${id}-${work.key}-cost`}
                  type="number"
                  min={1}
                  max={1000}
                  value={work.resource_cost}
                  onChange={(e) =>
                    onChange({
                      ...rules,
                      work_items: rules.work_items.map((w, i) =>
                        i === index
                          ? { ...w, resource_cost: Number(e.target.value) }
                          : w,
                      ),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-${work.key}-duration`}>
                  {label(work.key)} work duration
                </FieldLabel>
                <Input
                  id={`${id}-${work.key}-duration`}
                  type="number"
                  min={1}
                  max={1200}
                  value={work.duration}
                  onChange={(e) =>
                    onChange({
                      ...rules,
                      work_items: rules.work_items.map((w, i) =>
                        i === index
                          ? { ...w, duration: Number(e.target.value) }
                          : w,
                      ),
                    })
                  }
                />
              </Field>
            </FieldGroup>
          </DisclosureContent>
        </Disclosure>
      ))}
      <Disclosure>
        <DisclosureTrigger>
          Dependencies, permissions and timing
        </DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <WorkflowAssumptions rules={rules} />
        </DisclosureContent>
      </Disclosure>
    </FieldSet>
  );
}
