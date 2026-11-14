import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlanningProgress } from "@/components/agent/planning-progress";
import { DesignEditor } from "@/components/editor/design-editor";
import { EditorLoading } from "@/components/editor/editor-layout";
import { Alert, Empty } from "@/components/feedback";
import { ArrowRight } from "@/components/icons";
import { ErrorState, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ApiError, api, useApi } from "@/lib/api";
import {
  type Draft,
  editorDraftPath,
  readDraft,
  removeDraft,
} from "@/lib/drafts";

import type {
  Analysis,
  Catalog,
  Design,
  SavedEnvironment,
  Starter,
  StudyDetail,
} from "@/lib/types";

class DraftReadError extends Error {}

export default function Editor() {
  const [params] = useSearchParams();
  const draftPath = editorDraftPath(params);
  const [discardError, setDiscardError] = useState("");
  const [recoverDraft, setRecoverDraft] = useState(false);
  const draft = useQuery({
    queryKey: ["draft", draftPath],
    queryFn: async () => {
      let saved: Draft | null;
      try {
        saved = readDraft(draftPath);
      } catch (cause) {
        throw new DraftReadError((cause as Error).message, { cause });
      }
      if (!saved) return null;
      try {
        const design = await api<Design>("/design/validate", {
          design: saved.design,
        });
        return { saved, design, error: null };
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 422) throw error;
        return { saved, design: null, error };
      }
    },
    gcTime: 0,
    // Local edits can change while this query is cached during route transitions.
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const catalog = useApi<Catalog>("/catalog");
  const starterId = params.get("starter");
  const starters = useQuery({
    queryKey: ["/starters"],
    queryFn: () => api<Starter[]>("/starters"),
    enabled: !!starterId,
  });
  const setupId = params.get("setup");
  const environmentId = params.get("environment");
  const hasSourceDraft = Boolean(
    draft.data?.saved && (setupId || environmentId),
  );
  const setup = useQuery({
    queryKey: ["setup", setupId, environmentId],
    enabled:
      !!(setupId || environmentId) &&
      !!catalog.data &&
      draft.isFetchedAfterMount &&
      !hasSourceDraft,
    queryFn: async () => {
      const saved = setupId
        ? await api<SavedEnvironment>(`/environments/${setupId}`)
        : catalog.data?.environments.find((item) => item.key === environmentId)
            ?.source;
      if (!saved) throw new Error("Unknown reusable environment.");
      const design = await api<Design>("/design/use-environment", {
        source: saved,
        example: saved.definition.examples[0].key,
      });
      return { design, revision: saved.revision };
    },
  });
  const planId = params.get("plan");
  const studyId = params.get("study");
  const copyId = params.get("copy");
  const sourceId = studyId ?? copyId;
  const plan = useQuery({
    queryKey: ["/analyses", planId],
    queryFn: () => api<Analysis>(`/analyses/${planId}`),
    enabled: !!planId,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  const previous = useQuery({
    queryKey: [
      `/studies/${sourceId}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`,
    ],
    queryFn: () =>
      api<StudyDetail>(
        `/studies/${sourceId}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`,
      ),
    enabled: !!sourceId,
  });
  const deletedSource = Boolean(
    draft.data?.saved &&
      previous.error instanceof ApiError &&
      previous.error.status === 404,
  );
  const previousError = deletedSource ? null : previous.error;
  const setupError = hasSourceDraft ? null : setup.error;
  function discardDraft() {
    try {
      removeDraft(draftPath);
      setDiscardError("");
      void draft.refetch();
    } catch (error) {
      setDiscardError((error as Error).message);
    }
  }
  if (draft.error)
    return (
      <>
        <ErrorState error={draft.error} onRetry={draft.refetch} />
        {discardError && <Alert variant="error">{discardError}</Alert>}
        {draft.error instanceof DraftReadError && (
          <Button variant="outline" onClick={discardDraft}>
            Discard unreadable draft
          </Button>
        )}
      </>
    );
  if (
    catalog.error ||
    plan.error ||
    previousError ||
    setupError ||
    starters.error
  )
    return (
      <ErrorState
        error={
          (catalog.error ||
            plan.error ||
            previousError ||
            setupError ||
            starters.error) as Error
        }
        onRetry={() =>
          Promise.all(
            [catalog, plan, previous, setup, starters]
              .filter((query) => query.error)
              .map((query) => query.refetch()),
          )
        }
      />
    );
  if (
    !catalog.data ||
    draft.isPending ||
    !draft.isFetchedAfterMount ||
    (starterId && !starters.data) ||
    (sourceId && !previous.data && !deletedSource) ||
    ((setupId || environmentId) && !hasSourceDraft && !setup.data)
  )
    return <EditorLoading revision={!!studyId} fromAgent={!!planId} />;
  if (draft.data?.error && !recoverDraft)
    return (
      <>
        <PageHeading title="Recover your draft" />
        <Alert variant="error">{draft.data.error.message}</Alert>
        {discardError && <Alert variant="error">{discardError}</Alert>}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onClick={() => setRecoverDraft(true)}>
            Edit specification
          </Button>
          <Button variant="outline" onClick={discardDraft}>
            Discard draft
          </Button>
        </div>
      </>
    );
  if (planId && (!plan.data || plan.data.status === "pending"))
    return (
      <>
        <PageHeading title="Designing your experiment" />
        <PlanningProgress plan={plan.data} />
      </>
    );
  if (
    starterId &&
    !draft.data?.saved &&
    !starters.data?.some((starter) => starter.id === starterId)
  )
    return (
      <Alert variant="error" title="Starter not found">
        Choose a starter from{" "}
        <Link className="underline" to="/">
          Home
        </Link>
        .
      </Alert>
    );
  if (plan.data?.status === "failed")
    return (
      <>
        <PageHeading title="Design request stopped" />
        <Alert variant="error">{plan.data.error}</Alert>
        <Button variant="outline" asChild>
          <Link to="/assistant" state={{ question: plan.data.question }}>
            Back to Assistant
          </Link>
        </Button>
      </>
    );
  if (plan.data?.output?.supported === false)
    return (
      <>
        <PageHeading title="This question needs different capabilities" />
        <Alert title="No experiment was invented">
          {plan.data.output.explanation}
        </Alert>
        <Empty
          title="Keep the question. Change the method."
          description="Explore the supported mechanics, or start a custom study with an explicit scope."
        >
          <Button variant="outline" asChild>
            <Link to="/environments">
              Explore environments
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </Empty>
      </>
    );
  const initial =
    draft.data?.design ??
    plan.data?.output?.design ??
    (copyId && previous.data
      ? {
          ...previous.data.design,
          title: `${previous.data.design.title.slice(0, 93)} (copy)`,
        }
      : previous.data?.design) ??
    setup.data?.design ??
    starters.data?.find((starter) => starter.id === starterId)?.design ??
    catalog.data.templates.find((t) => t.id === params.get("template"))
      ?.design ??
    catalog.data.templates[0]?.design;
  if (!initial)
    return <EditorLoading revision={!!studyId} fromAgent={!!planId} />;
  return (
    <>
      {deletedSource && (
        <Alert title="Original experiment deleted">
          Your draft is safe. It will save as a new experiment.
        </Alert>
      )}
      <DesignEditor
        key={draftPath}
        initial={initial}
        initialMode={
          params.get("mode") === "advanced" || params.has("step")
            ? "visual"
            : "quick"
        }
        setupId={setupId}
        setupRevision={setup.data?.revision}
        initialStep={
          planId
            ? "review"
            : params.get("step") === "review"
              ? "review"
              : params.get("step") === "conditions"
                ? "conditions"
                : "question"
        }
        catalog={catalog.data}
        studyId={deletedSource ? null : studyId}
        planId={planId}
        agentChatId={plan.data?.chat_id}
        explanation={plan.data?.output?.explanation}
        planning={plan.data?.output?.planning}
        draftPath={draftPath}
        draft={
          recoverDraft && draft.data
            ? {
                ...draft.data.saved,
                mode: "json",
                jsonDirty: true,
                json:
                  draft.data.saved.mode === "json"
                    ? draft.data.saved.json
                    : JSON.stringify(draft.data.saved.design, null, 2),
              }
            : draft.data?.saved
        }
      />
    </>
  );
}
