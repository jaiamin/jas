import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ModelSettings } from "@/components/settings/model-settings";
import { ProviderForm } from "@/components/settings/provider-form";
import { PublishingSettings } from "@/components/settings/publishing-settings";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/lib/api";
import { money } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const settings = useApi<Settings>("/settings");
  if (settings.error)
    return <ErrorState error={settings.error} onRetry={settings.refetch} />;
  if (!settings.data) return <Loading />;
  const s = settings.data;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title="Settings" />
      <div className="divide-y [&>section]:py-8 [&>section:first-child]:pt-0">
        <section>
          <header className="mb-5 space-y-1">
            <h2 className="text-base font-semibold">Providers</h2>
            <p className="text-sm text-muted-foreground">
              Keys stay on this machine. Local execution needs no account.
            </p>
          </header>
          <div className="flex flex-col gap-5">
            {s.provider_configurations.map((provider) => (
              <Disclosure key={provider.id}>
                <DisclosureTrigger>
                  {provider.id}{" "}
                  <Badge variant="secondary">
                    {provider.configured ? "Configured" : "Add key"}
                  </Badge>
                </DisclosureTrigger>
                <DisclosureContent className="pt-4">
                  <ProviderForm provider={provider} />
                </DisclosureContent>
              </Disclosure>
            ))}
            <Disclosure>
              <DisclosureTrigger>Add a compatible endpoint</DisclosureTrigger>
              <DisclosureContent className="pt-4">
                <ProviderForm />
              </DisclosureContent>
            </Disclosure>
          </div>
        </section>
        <section>
          <header className="mb-5 space-y-1">
            <h2 className="text-base font-semibold">Models</h2>
            <p className="text-sm text-muted-foreground">
              Any model ID, with known or editable prices. Connection tests run
              only after you review their estimate.
            </p>
          </header>
          <div>
            <ModelSettings settings={s} />
          </div>
        </section>
        <section>
          <header className="mb-5 space-y-1">
            <h2 className="text-base font-semibold">Budget & defaults</h2>
          </header>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-sm">
                <span>Committed priced usage</span>
                <span className="tabular-nums">
                  {money(s.charged_usd)} / {money(s.budget_usd)}
                </span>
              </div>
              <Progress
                aria-label="Workspace budget committed"
                value={
                  s.budget_usd > 0
                    ? Math.min(100, (s.charged_usd / s.budget_usd) * 100)
                    : 0
                }
              />
              <p className="text-xs text-muted-foreground">
                {s.usage.requests.toLocaleString()} requests ·{" "}
                {s.committed_tokens.toLocaleString()} committed tokens ·{" "}
                {s.usage.cost_usd == null
                  ? "total dollar cost unknown"
                  : `${money(s.usage.cost_usd)} recorded cost`}
              </p>
            </div>
            <WorkspaceForm settings={s} />
          </div>
        </section>
        <section id="publishing" className="scroll-mt-6">
          <header className="mb-5 space-y-1">
            <h2 className="text-base font-semibold">Publishing</h2>
          </header>
          <div>
            <PublishingSettings settings={s} />
          </div>
        </section>
        <section>
          <header className="mb-5 space-y-1">
            <h2 className="text-base font-semibold">Data</h2>
          </header>
          <div className="flex flex-col gap-3">
            <p className="break-all font-mono text-xs">{s.data_location}</p>
            <Button variant="outline" asChild>
              <a href="/api/data/backup" download>
                Back up all workspace data
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Includes experiments, runs, conversations and saved environments.
              Provider keys are excluded.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
