import { Play } from "@/components/icons";
import { RecordListHeading } from "@/components/record-list-heading";
import { RunTable } from "@/components/run-table";
import { ErrorState } from "@/components/shared";
import { useRecordFilters } from "@/hooks/use-record-filters";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";

export default function Runs() {
  const runs = useApi<RunSummary[]>("/runs", true);
  const filters = useRecordFilters();
  return (
    <>
      <RecordListHeading
        title="Runs"
        icon={Play}
        search={filters.search}
        onSearchChange={filters.setSearch}
      />
      {runs.error && <ErrorState error={runs.error} onRetry={runs.refetch} />}
      {(!runs.error || runs.data !== undefined) && (
        <RunTable runs={runs.data} filters={filters} selectable />
      )}
    </>
  );
}
