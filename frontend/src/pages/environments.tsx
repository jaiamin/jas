import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge, Table } from "@/components/ui/data";
import { useApi } from "@/lib/api";
import type { Catalog } from "@/lib/types";

export default function Environments() {
  const catalog = useApi<Catalog>("/catalog");
  return (
    <>
      <PageHeading title="Environments" />
      {catalog.error ? (
        <ErrorState error={catalog.error} onRetry={catalog.refetch} />
      ) : !catalog.data ? (
        <Loading />
      ) : (
        <div className="table-frame environment-catalog">
          <Table className="table">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Measurements</th>
                <th>
                  <span className="sr-only">Create experiment</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.data.environments.map((env) => (
                <tr key={env.key}>
                  <td>
                    <strong>{env.name}</strong>
                    <p className="environment-description">{env.description}</p>
                  </td>
                  <td>
                    <div className="environment-measures">
                      {env.measures.slice(0, 3).map((measure) => (
                        <Badge key={measure} variant="secondary">
                          {measure.replaceAll("_", " ")}
                        </Badge>
                      ))}
                      {env.measures.length > 3 && (
                        <span className="muted">
                          +{env.measures.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/new?template=${env.key}`}>
                        Use template
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      <Disclosure className="disclosure">
        <DisclosureTrigger>Add an environment</DisclosureTrigger>
        <DisclosureContent>
          <p className="muted">
            Implement a Python environment adapter to add new mechanics. AI uses
            the environments installed here.
          </p>
        </DisclosureContent>
      </Disclosure>
    </>
  );
}
