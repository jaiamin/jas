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
  const error = studies.error || catalog.error;
  return (
    <>
      <RecordListHeading
        title="Experiments"
        icon={ExperimentIcon}
        search={filters.search}
        onSearchChange={filters.setSearch}
      />
      {error && (
        <div className="px-4 sm:px-6 lg:px-8">
          <ErrorState
            error={error}
            onRetry={() => Promise.all([studies.refetch(), catalog.refetch()])}
          />
        </div>
      )}
      {(!error || studies.data !== undefined) && (
        <StudyTable
          studies={studies.data}
          environments={catalog.data?.environments}
          environmentsError={Boolean(catalog.error)}
          filters={filters}
        />
      )}
    </>
  );
}
