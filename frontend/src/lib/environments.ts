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
