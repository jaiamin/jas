import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { api, useApi } from "@/lib/api";
import type { Settings } from "@/lib/types";

export function DesignComposer({
  initialQuestion = "",
  suggestions = false,
}: {
  initialQuestion?: string;
  suggestions?: boolean;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const settings = useApi<Settings>("/settings");
  const unavailable =
    settings.data && !Object.values(settings.data.providers).some(Boolean);
  const navigate = useNavigate();
  const plan = useMutation({
    mutationFn: () => api<{ id: string }>("/plan", { question }),
    onSuccess: (result) => navigate(`/new?plan=${result.id}`),
  });
  function submit() {
    if (question.trim() && !plan.isPending && !unavailable) plan.mutate();
  }
  return (
    <>
      {suggestions && (
        <div className="agent-suggestions">
          {[
            "When does cooperation break down?",
            "Does communication improve teamwork?",
            "How does oversight change decisions?",
          ].map((text) => (
            <Button
              key={text}
              variant="outline"
              onClick={() => setQuestion(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      )}
      <form
        className="question-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            aria-label="Your research question"
            placeholder="When do agents choose themselves over the group?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={4000}
            rows={4}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <InputGroupAddon align="block-end">
            <span>Review first. Run when ready.</span>
            <Button
              type="submit"
              disabled={!question.trim() || plan.isPending || !!unavailable}
            >
              {plan.isPending ? (
                <LoaderCircle className="spin" data-icon="inline-start" />
              ) : (
                <ArrowUpRight data-icon="inline-start" />
              )}
              {plan.isPending ? "Designing…" : "Design experiment"}
            </Button>
          </InputGroupAddon>
        </InputGroup>
        {plan.error && <Alert variant="error">{plan.error.message}</Alert>}
        {unavailable && (
          <p className="capability-note">
            AI design needs a model provider.{" "}
            <Link to="/settings">Configure a provider</Link> or{" "}
            <Link to="/new">create an experiment manually</Link>.
          </p>
        )}
      </form>
    </>
  );
}
