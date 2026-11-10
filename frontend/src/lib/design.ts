import type {
  ArtifactRules,
  Design,
  Environment,
  ParticipantHarness,
  ResourcePrimitive,
  TaskDefinition,
} from "./types";

export function participantHarness(
  kind: ParticipantHarness["kind"],
): ParticipantHarness {
  return {
    kind,
    version: "1.0.0",
    max_requests: kind === "direct_action" ? 1 : 4,
    max_tool_operations: kind === "direct_action" ? 0 : 3,
    tools:
      kind === "direct_action" ? [] : ["observe", "rules", "legal_options"],
  };
}

export function removeProfile(design: Design, key: string): Design {
  return {
    ...design,
    profiles: design.profiles.filter((profile) => profile.key !== key),
    conditions: design.conditions.map((condition) => ({
      ...condition,
      profile_overrides: condition.profile_overrides.filter(
        (profile) => profile.key !== key,
      ),
      parameters: {
        ...condition.parameters,
        composition: condition.parameters.composition
          ? {
              ...condition.parameters.composition,
              resources: condition.parameters.composition.resources.map(
                (resource) => ({
                  ...resource,
                  controllers: resource.controllers.filter(
                    (controller) => controller !== key,
                  ),
                }),
              ),
            }
          : null,
        institution: {
          ...condition.parameters.institution,
          authorities: condition.parameters.institution.authorities.filter(
            (authority) => authority !== key,
          ),
        },
        artifacts: condition.parameters.artifacts
          ? {
              ...condition.parameters.artifacts,
              objects: condition.parameters.artifacts.objects.map((obj) => ({
                ...obj,
                owner: obj.owner === key ? null : obj.owner,
                readers: obj.readers.filter((reader) => reader !== key),
                writers: obj.writers.filter((writer) => writer !== key),
              })),
            }
          : null,
      },
    })),
  };
}

export function removeTask(
  tasks: TaskDefinition[],
  key: string,
): TaskDefinition[] {
  return tasks
    .filter((task) => task.key !== key)
    .map((task) => ({
      ...task,
      dependencies: task.dependencies.filter(
        (dependency) => dependency !== key,
      ),
    }));
}

export function changeEnvironment(
  design: Design,
  environment: Environment,
): Design {
  return {
    ...design,
    environment: environment.key,
    environment_source: null,
    measures: environment.measures.slice(0, 3),
    tasks: environment.key === "coordination" ? design.tasks : [],
    conditions: design.conditions.map((condition) => ({
      ...condition,
      harness: {
        ...condition.harness,
        tools: condition.harness.tools.filter(
          (tool) =>
            environment.key === "artifact_workspace" ||
            tool !== "read_artifact",
        ),
      },
      parameters: {
        ...condition.parameters,
        artifacts:
          environment.key === "artifact_workspace"
            ? (condition.parameters.artifacts ??
              newArtifactRules(design.profiles[0].key))
            : null,
        composition:
          environment.key === "composed"
            ? (condition.parameters.composition ?? {
                controllers_first: true,
                resources: [newResource()],
              })
            : null,
        resource_schedule: ["commons", "trust_exchange"].includes(
          environment.key,
        )
          ? condition.parameters.resource_schedule
          : [],
      },
    })),
  };
}

export function minimumParticipants(environment: Design["environment"]) {
  return ["commons", "trust_exchange", "institution", "bargaining"].includes(
    environment,
  )
    ? 2
    : 1;
}

export function newArtifactRules(owner: string): ArtifactRules {
  return {
    write_limit: 3,
    objects: [
      {
        key: "measurement",
        name: "Measurement",
        owner: null,
        readers: [owner],
        writers: [],
        content: { reading: 17 },
      },
      {
        key: "report",
        name: "Report",
        owner,
        readers: [],
        writers: [],
        content: { reading: 0 },
      },
    ],
    requirements: [
      {
        artifact: "report",
        field: "reading",
        source: "measurement",
        source_field: "reading",
      },
    ],
  };
}

export function newResource(index = 1): ResourcePrimitive {
  return {
    key: `resource-${index}`,
    name: `Resource ${index}`,
    capacity: 60,
    initial_stock: 24,
    replenishment: 0,
    controllers: [],
    action_limit: 12,
    need: 1,
    consumption_value: 2,
    shortfall_penalty: 3,
    terminal_value: 1,
    stock_visibility: "public",
    allocation_visibility: "public",
    transfers: true,
  };
}
