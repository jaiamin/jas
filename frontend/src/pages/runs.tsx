import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { Plus } from "@/components/icons";
import { RunTable } from "@/components/run-table";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import type { RunSummary } from "@/lib/types";

export default function Runs() {
  const runs = useApi<RunSummary[]>("/runs", true);
  return (
    <>
      <PageHeading title="Runs">
        <Button variant="outline" asChild>
          <Link to="/new">
            <Plus data-icon="inline-start" />
            New experiment
          </Link>
        </Button>
      </PageHeading>
      {runs.error ? (
        <ErrorState error={runs.error} onRetry={runs.refetch} />
      ) : !runs.data ? (
        <Loading />
      ) : runs.data.length ? (
        <RunTable runs={runs.data} selectable />
      ) : (
        <Empty
          title="No runs yet"
          description="Create an experiment to define the agents, conditions, and rules."
        >
          <Button asChild>
            <Link to="/new">Create experiment</Link>
          </Button>
        </Empty>
      )}
    </>
  );
}
