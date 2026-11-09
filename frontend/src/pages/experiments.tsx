import { ExperimentIcon } from "@/components/icons";
import { RecordListHeading } from "@/components/record-list-heading";
import { ErrorState } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { useRecordFilters } from "@/hooks/use-record-filters";
import { useApi } from "@/lib/api";
import type { Catalog, StudySummary } from "@/lib/types";

export default function Experiments() {
  const filters = useRecordFilters();
  const catalog = useApi<Catalog>("/catalog");
  const studies = useApi<StudySummary[]>("/studies", true);
  return (
    <>
      <RecordListHeading
        title="Experiments"
        icon={ExperimentIcon}
        search={filters.search}
        onSearchChange={filters.setSearch}
      />
      {studies.error || catalog.error ? (
        <ErrorState
          error={(studies.error || catalog.error) as Error}
          onRetry={() => Promise.all([studies.refetch(), catalog.refetch()])}
        />
      ) : (
        <StudyTable
          studies={studies.data}
          environments={catalog.data?.environments}
          filters={filters}
        />
      )}
    </>
  );
}
