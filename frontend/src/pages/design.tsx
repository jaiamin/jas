import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { DesignComposer } from "@/components/design-composer";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import type { Analysis, Catalog } from "@/lib/types";

export default function DesignPage() {
  const location = useLocation();
  const catalog = useApi<Catalog>("/catalog");
  const plans = useApi<Analysis[]>("/analyses", true);
  return (
    <>
      <section className="design-intro">
        <PageHeading
          title="Design an experiment"
          description="Start with a question. Review the protocol before any agent runs."
        >
          <Button variant="outline" asChild>
            <Link to="/new">Configure manually</Link>
          </Button>
        </PageHeading>
        <DesignComposer
          initialQuestion={
            typeof location.state?.question === "string"
              ? location.state.question
              : ""
          }
        />
      </section>
      <div className="design-starters">
        {catalog.data?.templates.slice(0, 3).map((template) => (
          <Button key={template.id} variant="outline" size="sm" asChild>
            <Link to={`/new?template=${template.id}`}>
              {template.design.title}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        ))}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/environments">
            All environments
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      {plans.error && (
        <div className="design-history">
          <ErrorState error={plans.error} />
        </div>
      )}
      {!!plans.data?.length && (
        <Disclosure className="disclosure design-history">
          <DisclosureTrigger>Recent AI designs</DisclosureTrigger>
          <DisclosureContent>
            <div className="plan-history">
              {plans.data.toReversed().map((p) => (
                <Link to={`/new?plan=${p.id}`} key={p.id}>
                  {p.question}
                  <span>{p.status}</span>
                </Link>
              ))}
            </div>
          </DisclosureContent>
        </Disclosure>
      )}
    </>
  );
}
