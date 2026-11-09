import { ExperimentIcon } from "@/components/icons";
import { RecordListHeading } from "@/components/record-list-heading";
import { RecordTableLoading } from "@/components/record-table-loading";
import { ErrorState } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { useRecordFilters } from "@/hooks/use-record-filters";
import { useApi } from "@/lib/api";
import type { StudySummary } from "@/lib/types";

export default function Experiments() {
  const filters = useRecordFilters();
  const studies = useApi<StudySummary[]>("/studies", true);
  return (
    <>
      <RecordListHeading
        title="Experiments"
        icon={ExperimentIcon}
        search={filters.search}
        onSearchChange={filters.setSearch}
      />
      {studies.error ? (
        <ErrorState error={studies.error} onRetry={studies.refetch} />
      ) : studies.data ? (
        <StudyTable studies={studies.data} filters={filters} />
      ) : (
        <RecordTableLoading columns={4} />
      )}
    </>
  );
}
