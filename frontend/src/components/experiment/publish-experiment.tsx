import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { OptionSelect } from "@/components/option-select";
import { Json } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import type {
  PublicationCard,
  PublicationDescription,
  PublicationReview,
  PublishingStatus,
} from "@/lib/publication";
import type { Settings, StudyDetail } from "@/lib/types";

export function PublishExperiment({ study }: { study: StudyDetail }) {
  const settings = useApi<Settings>("/settings");
  const status = useApi<PublishingStatus>("/publishing");
  const receipt = useApi<PublicationCard | null>(
    `/studies/${study.id}/publication?revision=${study.revision}`,
  );
  const storageKey = `jas:publication-draft:${study.id}:${study.revision}`;
  const touched = useRef(false);
  const [storageError, setStorageError] = useState(false);
  const [description, setDescription] = useState<PublicationDescription>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        touched.current = true;
        return JSON.parse(saved) as PublicationDescription;
      }
    } catch {
      /* The form remains usable when browser storage is unavailable. */
    }
    return {
      title: study.design.title.slice(0, 120),
      finding: "",
      tags: [],
      featured_run:
        study.runs.find((run) => run.status === "complete")?.id ?? "",
      visibility: settings.data?.preferences.default_visibility ?? "unlisted",
      notes: "",
      email_reviews: {},
    };
  });
  const [tagsText, setTagsText] = useState(description.tags.join(", "));
  useEffect(() => {
    if (!touched.current && settings.data) {
      setDescription((previous) => ({
        ...previous,
        visibility: settings.data.preferences.default_visibility,
      }));
    }
  }, [settings.data]);
  useEffect(() => {
    if (!touched.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(description));
    } catch {
      setStorageError(true);
    }
  }, [description, storageKey]);
  const [reviewed, setReviewed] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [snapshot, setSnapshot] = useState("");
  const review = useMutation({
    mutationFn: (draft: PublicationDescription) =>
      api<PublicationReview>(`/studies/${study.id}/publication/review`, {
        revision: study.revision,
        description: draft,
      }),
    onSuccess: (_result, draft) => {
      setSnapshot(JSON.stringify(draft));
      setReviewed(false);
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      api<PublicationCard>(`/studies/${study.id}/publication`, {
        revision: study.revision,
        description,
        reviewed,
        sha256: review.data?.sha256,
      }),
    onSuccess: () => {
      receipt.refetch();
      try {
        localStorage.setItem("jas:onboarding:published", "true");
      } catch {
        /* The published link still works without storage. */
      }
    },
  });
  const complete = study.runs.filter((run) => run.status === "complete");
  const current = snapshot === JSON.stringify(description);
  const blocked =
    !review.data || !current || review.data.scan.some((hit) => !hit.resolved);
  const card = publish.data ?? receipt.data;
  const verified =
    review.data?.verification.filter((run) => run.verified).length ?? 0;
  function update(value: Partial<PublicationDescription>) {
    touched.current = true;
    setDescription({ ...description, ...value });
    setReviewed(false);
  }
  return (
    <section aria-label="Publish experiment" className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">Share a replayable result</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Publish this frozen version and its runs. Agent prompts, outputs and
          private observations become readable by anyone with the link.
          Assistant conversations and provider keys stay here.
        </p>
      </div>
      {card && (
        <Alert>
          <a
            className="underline underline-offset-4"
            href={card.url}
            target="_blank"
            rel="noreferrer"
          >
            Open published version {card.version}
          </a>
          . Publishing again creates a new immutable version.
        </Alert>
      )}
      {!complete.length ? (
        <Alert>
          Finish a run to publish its evidence.{" "}
          <Link className="underline" to={`/experiments/${study.id}?tab=runs`}>
            View runs
          </Link>
        </Alert>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            review.mutate(description);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="publication-title">Title</FieldLabel>
              <Input
                id="publication-title"
                value={description.title}
                maxLength={120}
                required
                onChange={(event) => update({ title: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publication-finding">
                One-sentence finding
              </FieldLabel>
              <Textarea
                id="publication-finding"
                value={description.finding}
                maxLength={400}
                required
                onChange={(event) => update({ finding: event.target.value })}
                placeholder="What did this experiment show? Include its scope."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publication-tags">Tags</FieldLabel>
              <Input
                id="publication-tags"
                value={tagsText}
                onChange={(event) => {
                  setTagsText(event.target.value);
                  update({
                    tags: event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  });
                }}
                placeholder="communication, memory"
              />
              <FieldDescription>
                Up to three, separated by commas.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Featured run</FieldLabel>
              <OptionSelect
                label="Featured run"
                value={description.featured_run}
                onValueChange={(value) => update({ featured_run: value })}
                options={complete.map((run) => ({
                  value: run.id,
                  label: `${run.condition} · seed ${run.seed} · repeat ${run.repetition}`,
                }))}
              />
            </Field>
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <OptionSelect
                label="Publication visibility"
                value={description.visibility}
                onValueChange={(value) =>
                  update({ visibility: value as "public" | "unlisted" })
                }
                options={[
                  {
                    value: "unlisted",
                    label: "Unlisted · anyone with the link",
                  },
                  { value: "public", label: "Public · listed in the gallery" },
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publication-notes">
                Limits or notes
              </FieldLabel>
              <Textarea
                id="publication-notes"
                value={description.notes}
                maxLength={4000}
                onChange={(event) => update({ notes: event.target.value })}
              />
              <FieldDescription>
                The protocol's limits and check notes are included
                automatically.
              </FieldDescription>
            </Field>
            <div>
              <Button
                variant="outline"
                disabled={review.isPending || description.tags.length > 3}
              >
                {review.isPending
                  ? "Scanning and verifying…"
                  : "Review public record"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
      {review.error && <Alert variant="error">{review.error.message}</Alert>}
      {storageError && (
        <Alert>
          Browser storage is unavailable. Keep this page open until you finish
          or copy your description.
        </Alert>
      )}
      {review.data && (
        <div className="space-y-4">
          <p className="text-sm">
            {(review.data.bytes / 1024).toFixed(0)} KB · Replay verified{" "}
            {verified} of {review.data.verification.length} runs · No model
            calls
          </p>
          {!current && (
            <Alert>
              The description changed. Review the record again before
              publishing.
            </Alert>
          )}
          {review.data.verification
            .filter((run) => !run.verified)
            .map((run) => (
              <p key={run.run_id} className="text-sm text-muted-foreground">
                Run {run.run_id.slice(0, 6)}: {run.reason}. This version can
                publish with that limitation and without the verified badge.
              </p>
            ))}
          {review.data.scan.map((hit) => (
            <div
              key={hit.fingerprint}
              className="rounded-lg border p-3 text-sm"
            >
              <p>
                {hit.resolved
                  ? "Reviewed synthetic email"
                  : `Blocked: ${hit.rule.replaceAll("_", " ")}`}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {hit.path}
              </p>
              {hit.reviewable && (
                <Field className="mt-3">
                  <FieldLabel htmlFor={hit.fingerprint}>
                    Why is this a demonstrable false positive?
                  </FieldLabel>
                  <Input
                    id={hit.fingerprint}
                    value={description.email_reviews[hit.fingerprint] ?? ""}
                    onChange={(event) =>
                      update({
                        email_reviews: {
                          ...description.email_reviews,
                          [hit.fingerprint]: event.target.value,
                        },
                      })
                    }
                  />
                  <FieldDescription>
                    Only synthetic or example email addresses may be reviewed.
                    Explain, then scan again.
                  </FieldDescription>
                </Field>
              )}
              {!hit.reviewable && (
                <p className="mt-2 text-muted-foreground">
                  Correct editable text, or create a clean version/run if frozen
                  evidence contains the leak. The local original is preserved.
                </p>
              )}
            </div>
          ))}
          <Disclosure>
            <DisclosureTrigger>Everything that goes public</DisclosureTrigger>
            <DisclosureContent className="pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(review.data.record, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "jas-public-record.json";
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Download reviewed record
              </Button>
              <Json value={review.data.record} />
            </DisclosureContent>
          </Disclosure>
          <Field orientation="horizontal">
            <Checkbox
              id="publication-reviewed"
              checked={reviewed}
              disabled={blocked}
              onCheckedChange={(checked) => setReviewed(checked === true)}
            />
            <FieldLabel htmlFor="publication-reviewed">
              I reviewed this record, including agent-private evidence, and
              agree to the gallery terms.
            </FieldLabel>
          </Field>
          <p className="text-xs text-muted-foreground">
            Unpublishing removes JAS pages and files. It cannot recall copies
            already downloaded.{" "}
            <a
              href={`${status.data?.origin ?? ""}/terms`}
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Read terms
            </a>
          </p>
          {!status.data?.identity && (
            <p className="text-sm">
              <Link to="/settings#publishing" className="underline">
                Sign in with GitHub in Settings
              </Link>{" "}
              to publish. Watching, running and forking need no account.
            </p>
          )}
          <Button
            disabled={
              blocked ||
              !reviewed ||
              !status.data?.identity ||
              publish.isPending
            }
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Publishing…" : "Publish this version"}
          </Button>
          {publish.error && (
            <Alert variant="error">{publish.error.message}</Alert>
          )}
          {publish.data && (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={publish.data.url}
                className="break-all text-sm underline"
              >
                {publish.data.url}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publish.data.url);
                    setCopyNotice("Link copied.");
                  } catch {
                    setCopyNotice("Copy the link above.");
                  }
                }}
              >
                Copy link
              </Button>
              <span role="status" className="text-xs">
                {copyNotice}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
