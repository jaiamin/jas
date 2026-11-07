import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/data";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import type { Annotation } from "@/lib/types";
export function TurnAnnotations({
  runId,
  turn,
  onInteract,
  drafts,
  setDrafts,
}: {
  runId: string;
  turn: number;
  onInteract: () => void;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const draftKey = `${runId}:${turn}`;
  const annotation = drafts[draftKey] ?? "";
  const notes = useApi<Annotation[]>(`/runs/${runId}/annotations`);
  const client = useQueryClient();
  const note = useMutation({
    mutationFn: (draft: { runId: string; turn: number; note: string }) =>
      api(`/runs/${draft.runId}/annotations`, {
        turn: draft.turn,
        label: "Observation",
        note: draft.note,
      }),
    onSuccess: (_, draft) => {
      setDrafts((current) => {
        const key = `${draft.runId}:${draft.turn}`;
        if (current[key] !== draft.note) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
      client.invalidateQueries({
        queryKey: [`/runs/${draft.runId}/annotations`],
      });
    },
  });
  return (
    <Disclosure
      className="disclosure"
      onOpenChange={(open) => {
        if (open) onInteract();
      }}
    >
      <DisclosureTrigger>Researcher observations</DisclosureTrigger>
      <DisclosureContent>
        {notes.error && (
          <ErrorState error={notes.error} onRetry={notes.refetch} />
        )}
        {notes.data
          ?.filter((n) => n.turn === turn)
          .map((n) => (
            <div className="annotation" key={n.id}>
              <Badge>{n.label}</Badge>
              <p>{n.note}</p>
            </div>
          ))}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="annotation">
              Add an observation at turn {turn}
            </FieldLabel>
            <Textarea
              id="annotation"
              rows={3}
              value={annotation}
              onChange={(e) => {
                onInteract();
                const text = e.target.value;
                setDrafts((current) => ({ ...current, [draftKey]: text }));
              }}
              maxLength={4000}
            />
          </Field>
        </FieldGroup>
        <Button
          variant="outline"
          size="sm"
          disabled={!annotation.trim() || note.isPending}
          onClick={() => note.mutate({ runId, turn, note: annotation })}
        >
          Save observation
        </Button>
        {note.error && <Alert variant="error">{note.error.message}</Alert>}
      </DisclosureContent>
    </Disclosure>
  );
}
