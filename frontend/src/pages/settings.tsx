import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Check, Database, KeyRound } from "@/components/icons";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/lib/api";
import { modelLabel, money } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const settings = useApi<Settings>("/settings", true);
  if (settings.error)
    return <ErrorState error={settings.error} onRetry={settings.refetch} />;
  if (!settings.data) return <Loading />;
  const s = settings.data;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading title="Settings" />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model providers</CardTitle>
            <CardDescription>
              Set provider keys in <code>.env</code> and restart JAS.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ItemGroup>
              {Object.entries(s.providers).map(([provider, configured]) => (
                <Item key={provider} variant="outline">
                  <ItemMedia variant="icon">
                    <KeyRound />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {provider === "openai" ? "OpenAI" : "Anthropic"}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="secondary">
                      {configured && <Check />}
                      {configured ? "Configured" : "Not configured"}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Protocol designer</dt>
                <dd className="mt-1">{modelLabel(s.planner_model)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Evidence assistant</dt>
                <dd className="mt-1">{modelLabel(s.assistant_model)}</dd>
              </div>
            </dl>
            <Disclosure>
              <DisclosureTrigger>Model pricing</DisclosureTrigger>
              <DisclosureContent className="pt-3">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Input / 1M</TableHead>
                        <TableHead className="text-right">
                          Output / 1M
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.models.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{modelLabel(m.id)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(m.input_per_million)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(m.output_per_million)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Token estimates before credits, cache discounts or web search.
                </p>
              </DisclosureContent>
            </Disclosure>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usage & budget</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>Committed cost</span>
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
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              {[
                ["Requests", s.usage.requests.toLocaleString()],
                ["Input tokens", s.usage.input_tokens.toLocaleString()],
                ["Output tokens", s.usage.output_tokens.toLocaleString()],
              ].map(([name, value]) => (
                <div key={name}>
                  <dt className="text-muted-foreground">{name}</dt>
                  <dd className="mt-1 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <Disclosure>
              <DisclosureTrigger>How spending is controlled</DisclosureTrigger>
              <DisclosureContent className="pt-3 text-sm leading-relaxed text-muted-foreground">
                Each request reserves its upper allowance before sending.
                Unknown usage retains that reservation. Adjust{" "}
                <code>JAS_BUDGET_USD</code> in <code>.env</code> for the
                workspace ceiling.
              </DisclosureContent>
            </Disclosure>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Local workspace</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Item variant="outline">
              <ItemMedia variant="icon">
                <Database />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle>Storage</ItemTitle>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {s.storage}
                </p>
              </ItemContent>
            </Item>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Concurrent runs</dt>
                <dd className="mt-1">{s.concurrent_runs}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Concurrent provider requests
                </dt>
                <dd className="mt-1">{s.concurrent_requests}</dd>
              </div>
            </dl>
            <Separator />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Data stays in the local database. Model requests send selected
              evidence to the configured provider. Public hosting requires
              authentication.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
