import type {
  ArtifactRules,
  Design,
  DistributedRules,
  Environment,
  ParticipantHarness,
  ResourcePrimitive,
  TaskDefinition,
} from "./types";

export function participantHarness(
  kind: ParticipantHarness["kind"],
): ParticipantHarness {
  if (kind === "direct_action")
    return {
      kind: "direct_action",
      version: "1.0.0",
      max_requests: 1,
      max_tool_operations: 0,
      tools: [],
    };
  return {
    kind: "tool_using",
    version: "2.0.0",
    max_requests: 4,
    max_tool_operations: 3,
    tools: ["observe", "rules", "legal_options"],
    capabilities: {
      planning: "actor_plan_v1",
      memory: "actor_sources_v1",
      investigation: "actor_inspection_v1",
      verification: "legal_evidence_v1",
    },
    max_context_chars: 16000,
    max_memory_items: 8,
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
  const profiles = [...design.profiles];
  if (environment.key === "distributed_coordination") {
    while (profiles.length < 3) {
      let n = profiles.length + 1;
      while (profiles.some((profile) => profile.key === `agent-${n}`)) n++;
      profiles.push({
        key: `agent-${n}`,
        name: `Agent ${n}`,
        role: "Participant",
        model: null,
        goal: "Pursue your goals under the environment's rules.",
      });
    }
  }
  const coordination = distributedMechanics({ ...design, profiles });
  return {
    ...design,
    profiles,
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
            ["artifact_workspace", "distributed_coordination"].includes(
              environment.key,
            ) || tool !== "read_artifact",
        ),
      },
      parameters: {
        ...condition.parameters,
        artifacts:
          environment.key === "distributed_coordination"
            ? coordination.artifacts
            : environment.key === "artifact_workspace"
              ? (condition.parameters.artifacts ??
                newArtifactRules(design.profiles[0].key))
              : null,
        coordination:
          environment.key === "distributed_coordination"
            ? coordination.coordination
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
  if (environment === "distributed_coordination") return 3;
  return ["commons", "trust_exchange", "institution", "bargaining"].includes(
    environment,
  )
    ? 2
    : 1;
}

function distributedMechanics(design: Design): {
  artifacts: ArtifactRules;
  coordination: DistributedRules;
} {
  const keys = design.profiles.slice(0, 3).map((p) => p.key);
  const alternatives = ["cedar", "quartz", "reed"];
  return {
    artifacts: {
      write_limit: 4,
      requirements: [],
      objects: [
        ...keys.map((key, index) => ({
          key: `values_${index + 1}`,
          name: `Values for ${key}`,
          owner: null,
          readers: [key],
          writers: [],
          content: Object.fromEntries(
            alternatives.map((a, i) => [a, i === index ? 9 : 0]),
          ),
        })),
        {
          key: "draft",
          name: "Shared draft",
          owner: null,
          readers: keys,
          writers: keys,
          content: { proposal: "undecided" },
        },
      ],
    },
    coordination: {
      timing: "phased_simultaneous",
      turn_order: keys,
      conflict_order: keys,
      delivery_delay: 2,
      alternatives,
      information: Object.fromEntries(
        keys.map((key, i) => [key, `values_${i + 1}`]),
      ),
      match_bonus: 3,
      routes: keys.flatMap((sender) =>
        keys
          .filter((recipient) => recipient !== sender)
          .map((recipient) => ({ sender, recipient })),
      ),
    },
  };
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
