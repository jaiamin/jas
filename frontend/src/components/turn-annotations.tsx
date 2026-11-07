import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
}: {
  runId: string;
  turn: number;
}) {
  const [annotation, setAnnotation] = useState("");
  const notes = useApi<Annotation[]>(`/runs/${runId}/annotations`);
  const client = useQueryClient();
  const note = useMutation({
    mutationFn: () =>
      api(`/runs/${runId}/annotations`, {
        turn,
        label: "Observation",
        note: annotation,
      }),
    onSuccess: () => {
      setAnnotation("");
      client.invalidateQueries({ queryKey: [`/runs/${runId}/annotations`] });
    },
  });
  return (
    <Disclosure className="disclosure">
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
              onChange={(e) => setAnnotation(e.target.value)}
              maxLength={4000}
            />
          </Field>
        </FieldGroup>
        <Button
          variant="outline"
          size="sm"
          disabled={!annotation.trim() || note.isPending}
          onClick={() => note.mutate()}
        >
          Save observation
        </Button>
        {note.error && <Alert variant="error">{note.error.message}</Alert>}
      </DisclosureContent>
    </Disclosure>
  );
}
