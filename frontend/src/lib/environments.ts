import type { Environment, EnvironmentId } from "@/lib/types";

export const workSettings: EnvironmentId[] = [
  "institutional_workflow",
  "artifact_workspace",
  "reliance_commitments",
  "distributed_coordination",
];

export function environmentOptions(
  environments: Environment[],
  developer: boolean,
  current?: EnvironmentId,
) {
  return environments
    .filter(
      (environment) =>
        developer ||
        environment.key === current ||
        !["reviewed_finite", "sealed_relay"].includes(environment.key),
    )
    .toSorted((a, b) => {
      const rank = (key: EnvironmentId) => {
        const index = workSettings.indexOf(key);
        return index < 0 ? (key === "composed" ? 6 : 5) : index;
      };
      return rank(a.key) - rank(b.key);
    });
}

const summaries: Record<EnvironmentId, string> = {
  institutional_workflow:
    "Coordinate work, delegate tasks and manage shared materials.",
  artifact_workspace:
    "Investigate sources and produce a report backed by evidence.",
  reliance_commitments: "Make commitments and measure their effects on others.",
  distributed_coordination:
    "Reach a shared decision with distributed private information.",
  commons: "Contribute to a shared pool under changing incentives.",
  trust_exchange: "Explore trust and reciprocity through paired exchanges.",
  coordination: "Complete tasks with shared dependencies.",
  institution: "Study authority, oversight and appeals.",
  bargaining: "Negotiate a split with deadlines and outside options.",
  information: "Combine private signals to make a decision.",
  renewable_resource: "Manage a shared resource that can recover or collapse.",
  composed: "Build a resource economy from tested mechanics.",
  sealed_relay: "Explore a bounded relay with explicit permissions.",
  reviewed_finite: "Study an independently reviewed finite-state environment.",
};

export function environmentSummary(environment: Environment) {
  return summaries[environment.key];
}
