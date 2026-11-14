import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api";
import type { AnalysisLensKey, Settings } from "@/lib/types";

type Submission = {
  question: string;
  context: string;
  lens?: AnalysisLensKey;
  source_analysis_id?: string;
  revision?: number;
  through_turn?: number;
};
type ChatCreated = { id: string; chat_id: string };

export function useAgentComposer({
  context,
  chatId = null,
  draftKey,
  initialQuestion,
  busy = false,
  onSent,
  scope,
  onCreated,
}: {
  context: string;
  chatId?: string | null;
  draftKey: string;
  initialQuestion?: string;
  busy?: boolean;
  onSent: (result: ChatCreated) => void;
  scope?: { revision: number; through_turn?: number };
  onCreated?: (result: ChatCreated) => void;
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
  const client = useQueryClient();
  const submitting = useRef(false);
  const pendingSends = useIsMutating({ mutationKey: ["agent-send", draftKey] });
  const send = useMutation({
    mutationKey: ["agent-send", draftKey],
    mutationFn: (submission: Submission) =>
      api<ChatCreated>("/chats", { ...submission, chat_id: chatId }),
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: (result, submitted) => {
      onCreated?.(result);
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
  function submit() {
    if (
      question.trim() &&
      !busy &&
      !pendingSends &&
      !send.isPending &&
      !submitting.current &&
      !unavailable &&
      settings.data
    ) {
      submitting.current = true;
      // Per-call callbacks stop with their observer when this composer unmounts.
      // Cache and draft settlement above still runs for the accepted request.
      send.mutate({ question, context, ...scope }, { onSuccess: onSent });
    }
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
    estimate:
      settings.data?.assistant_estimates?.[
        context === "new"
          ? "design"
          : context === "general"
            ? "general"
            : "analysis"
      ],
    unavailable,
    send,
    submit,
    blocked: busy || pendingSends > 0 || send.isPending || !settings.data,
    disabled:
      busy ||
      pendingSends > 0 ||
      send.isPending ||
      !settings.data ||
      !!unavailable,
  };
}
