import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { OptionSelect } from "@/components/option-select";
import { ErrorState, Json } from "@/components/shared";
import { api } from "@/lib/api";
import type { StudyDetail } from "@/lib/types";

export interface ProtocolChange {
  path: string;
  before: unknown;
  after: unknown;
}
export function protocolChanges(
  before: unknown,
  after: unknown,
  path = "protocol",
): ProtocolChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    const old = before as Record<string, unknown>;
    const current = after as Record<string, unknown>;
    return [...new Set([...Object.keys(old), ...Object.keys(current)])].flatMap(
      (key) => protocolChanges(old[key], current[key], `${path}.${key}`),
    );
  }
  return [{ path, before, after }];
}

export function VersionDiff({ study }: { study: StudyDetail }) {
  const versions = study.revisions.filter(
    (version) => version.number !== study.revision,
  );
  const [selected, setSelected] = useState("");
  const number = versions.some((version) => String(version.number) === selected)
    ? selected
    : String(versions[0]?.number ?? "");
  const query = useQuery({
    queryKey: [`/studies/${study.id}?revision=${number}`],
    queryFn: () => api<StudyDetail>(`/studies/${study.id}?revision=${number}`),
    enabled: !!number,
  });
  if (!versions.length)
    return (
      <p className="text-sm text-muted-foreground">
        This experiment has one frozen version. Tune it to create a new version.
      </p>
    );
  const changes = query.data
    ? protocolChanges(query.data.design, study.design)
    : [];
  return (
    <section
      aria-label="Version differences"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium">
          Changes to version {study.revision} from
        </h2>
        <OptionSelect
          label="Compare with version"
          value={number}
          onValueChange={setSelected}
          options={versions.map((version) => ({
            value: String(version.number),
            label: `Version ${version.number}`,
          }))}
        />
      </div>
      {query.error && (
        <ErrorState error={query.error} onRetry={query.refetch} />
      )}
      {query.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading frozen version…
        </p>
      )}
      {query.data &&
        (changes.length ? (
          <ul className="flex min-w-0 flex-col gap-4">
            {changes.map((change) => (
              <li key={change.path} className="min-w-0 rounded-lg border p-3">
                <p className="mb-3 break-all font-mono text-xs">
                  {change.path}
                </p>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Version {number}
                    </p>
                    <Json value={change.before ?? "Absent"} />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Version {study.revision}
                    </p>
                    <Json value={change.after ?? "Absent"} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No protocol differences.
          </p>
        ))}
    </section>
  );
}
