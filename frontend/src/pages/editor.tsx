import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlanningProgress } from "@/components/agent/planning-progress";
import { DesignEditor } from "@/components/editor/design-editor";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty } from "@/components/ui/data";
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
    refetchOnWindowFocus: false,
  });
  const catalog = useApi<Catalog>("/catalog");
  const setupId = params.get("setup");
  const setup = useQuery({
    queryKey: ["setup", setupId],
    enabled: !!setupId && !!catalog.data,
    queryFn: async () => {
      const saved = await api<SavedEnvironment>(`/environments/${setupId}`);
      const environment = catalog.data?.environments.find(
        (item) => item.key === saved.design.environment,
      );
      if (!environment || saved.rules !== environment.rule_version)
        throw new Error(
          "This setup uses incompatible environment rules. Create a fresh setup.",
        );
      const design = await api<Design>("/design/validate", {
        design: saved.design,
      });
      return { design, revision: saved.revision };
    },
  });
  const planId = params.get("plan");
  const studyId = params.get("study");
  const plan = useQuery({
    queryKey: ["/analyses", planId],
    queryFn: () => api<Analysis>(`/analyses/${planId}`),
    enabled: !!planId,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  const previous = useQuery({
    queryKey: [
      `/studies/${studyId}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`,
    ],
    queryFn: () =>
      api<StudyDetail>(
        `/studies/${studyId}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`,
      ),
    enabled: !!studyId,
  });
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
  if (catalog.error || plan.error || previous.error || setup.error)
    return (
      <ErrorState
        error={
          (catalog.error ||
            plan.error ||
            previous.error ||
            setup.error) as Error
        }
        onRetry={() =>
          Promise.all(
            [catalog, plan, previous, setup]
              .filter((query) => query.error)
              .map((query) => query.refetch()),
          )
        }
      />
    );
  if (
    !catalog.data ||
    draft.isPending ||
    (studyId && !previous.data) ||
    (setupId && !setup.data)
  )
    return <Loading />;
  if (draft.data?.error && !recoverDraft)
    return (
      <>
        <PageHeading title="Recover your draft" />
        <Alert variant="error">{draft.data.error.message}</Alert>
        {discardError && <Alert variant="error">{discardError}</Alert>}
        <div className="actions">
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
  if (plan.data?.status === "failed")
    return (
      <>
        <PageHeading title="Design request stopped" />
        <Alert variant="error">{plan.data.error}</Alert>
        <Button variant="outline" asChild>
          <Link
            to="/agent?context=new"
            state={{ question: plan.data.question }}
          >
            Back to Agent
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
    previous.data?.design ??
    setup.data?.design ??
    catalog.data.templates.find((t) => t.id === params.get("template"))
      ?.design ??
    catalog.data.templates[0]?.design;
  if (!initial) return <Loading />;
  return (
    <DesignEditor
      key={draftPath}
      initial={initial}
      setupId={setupId}
      setupRevision={setup.data?.revision}
      initialStep={
        params.get("step") === "conditions" ? "conditions" : "question"
      }
      catalog={catalog.data}
      studyId={studyId}
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
              json:
                draft.data.saved.mode === "json"
                  ? draft.data.saved.json
                  : JSON.stringify(draft.data.saved.design, null, 2),
            }
          : draft.data?.saved
      }
    />
  );
}
