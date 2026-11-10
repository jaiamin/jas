import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api";
import type {
  AnalysisLensKey,
  GenerationAuthorization,
  InvestigationAllowance,
  Settings,
} from "@/lib/types";

type Submission = {
  question: string;
  context: string;
  lens?: AnalysisLensKey;
  source_analysis_id?: string;
  investigation?: InvestigationAllowance;
  generation?: GenerationAuthorization;
};
type ChatCreated = { id: string; chat_id: string };

export function useAgentComposer({
  context,
  chatId = null,
  draftKey,
  initialQuestion,
  busy = false,
  onSent,
}: {
  context: string;
  chatId?: string | null;
  draftKey: string;
  initialQuestion?: string;
  busy?: boolean;
  onSent: (result: ChatCreated) => void;
}) {
  const [question, setQuestion] = useState<string>(() => {
    if (initialQuestion !== undefined) return initialQuestion;
    try {
      return sessionStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const composer = useRef<HTMLTextAreaElement>(null);
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  useEffect(() => {
    try {
      if (question) sessionStorage.setItem(draftKey, question);
      else sessionStorage.removeItem(draftKey);
      setDraftUnavailable(false);
    } catch {
      setDraftUnavailable(true);
    }
  }, [draftKey, question]);
  const settings = useApi<Settings>("/settings");
  const plannerModel = settings.data?.planner_model ?? "";
  const assistantModel = settings.data?.assistant_model ?? "";
  const provider = (context === "new" ? plannerModel : assistantModel).split(
    ":",
  )[0];
  const unavailable = settings.data?.providers[provider] === false;
  const investigationUnavailable = settings.data?.providers.openai === false;
  const client = useQueryClient();
  const submitting = useRef(false);
  const send = useMutation({
    mutationFn: (submission: Submission) =>
      submission.investigation
        ? api<ChatCreated>("/investigations", {
            ...submission.investigation,
            question: submission.question,
            chat_id: chatId,
          })
        : api<ChatCreated>("/chats", { ...submission, chat_id: chatId }),
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: (result, submitted) => {
      setQuestion((current) => (current === submitted.question ? "" : current));
      try {
        if (sessionStorage.getItem(draftKey) === submitted.question)
          sessionStorage.removeItem(draftKey);
      } catch {
        setDraftUnavailable(true);
      }
      client.invalidateQueries({ queryKey: ["/chats"] });
      client.invalidateQueries({ queryKey: [`/chats/${result.chat_id}`] });
    },
  });
  function chooseSuggestion(text: string) {
    setQuestion(text);
    composer.current?.focus();
  }
  function dispatch(authority: {
    investigation?: InvestigationAllowance;
    generation?: GenerationAuthorization;
  }) {
    if (
      question.trim() &&
      !busy &&
      !send.isPending &&
      !submitting.current &&
      !(authority.investigation || authority.generation
        ? investigationUnavailable
        : unavailable) &&
      settings.data
    ) {
      submitting.current = true;
      // Per-call callbacks stop with their observer when this composer unmounts.
      // Cache and draft settlement above still runs for the accepted request.
      send.mutate({ question, context, ...authority }, { onSuccess: onSent });
    }
  }
  function submit(investigation?: InvestigationAllowance) {
    dispatch(investigation ? { investigation } : {});
  }
  function generate(generation: GenerationAuthorization) {
    dispatch({ generation });
  }
  return {
    question,
    setQuestion,
    composer,
    chooseSuggestion,
    draftUnavailable,
    settings,
    plannerModel,
    assistantModel,
    provider,
    unavailable,
    investigationUnavailable,
    send,
    submit,
    generate,
    blocked: busy || send.isPending || !settings.data,
    disabled: busy || send.isPending || !settings.data || !!unavailable,
    investigationDisabled:
      busy || send.isPending || !settings.data || investigationUnavailable,
  };
}
