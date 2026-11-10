import type { EnvironmentId } from "@/lib/types";

// Fixed 9×9 identities: pooled contributions, paired transfers, dependency steps,
// authority, negotiation, private signals, replenishment and modular resources.
// 0 = quiet grid; 1 = structure; 2 = the mechanism's focal cells.
const grids: Record<EnvironmentId, readonly string[]> = {
  sealed_relay: [
    "111000111",
    "121000121",
    "111000111",
    "010000010",
    "011111110",
    "000010000",
    "001111100",
    "001020100",
    "001111100",
  ],
  distributed_coordination: [
    "111000111",
    "121111121",
    "111010111",
    "000010000",
    "000010000",
    "000111000",
    "000121000",
    "000111000",
    "000000000",
  ],
  artifact_workspace: [
    "111111000",
    "100001000",
    "102101110",
    "101101010",
    "100001210",
    "111111010",
    "001000210",
    "001000010",
    "001111110",
  ],
  commons: [
    "000111000",
    "001000100",
    "010010010",
    "100121001",
    "101222101",
    "100121001",
    "010010010",
    "001000100",
    "000111000",
  ],
  trust_exchange: [
    "000000000",
    "111000111",
    "121010121",
    "111002111",
    "001111100",
    "111200111",
    "121010121",
    "111000111",
    "000000000",
  ],
  coordination: [
    "000000111",
    "000000121",
    "000111111",
    "000121000",
    "111111000",
    "121000000",
    "111111111",
    "000000121",
    "000000111",
  ],
  institution: [
    "000020000",
    "000111000",
    "001111100",
    "011111110",
    "110010011",
    "010010010",
    "010010010",
    "111111111",
    "222222222",
  ],
  bargaining: [
    "110000011",
    "121000121",
    "011101110",
    "001111100",
    "000222000",
    "001111100",
    "011101110",
    "121000121",
    "110000011",
  ],
  information: [
    "000010000",
    "000101000",
    "001000100",
    "010121010",
    "101222101",
    "010121010",
    "001000100",
    "000101000",
    "000010000",
  ],
  renewable_resource: [
    "000111000",
    "001000100",
    "010010010",
    "100121001",
    "101222101",
    "100121001",
    "010020010",
    "001020100",
    "000222000",
  ],
  composed: [
    "111000111",
    "121010121",
    "111010111",
    "000010000",
    "011222110",
    "000010000",
    "111010111",
    "121010121",
    "111000111",
  ],
};

const paths = Object.fromEntries(
  Object.entries(grids).map(([key, rows]) => [
    key,
    ["0", "1", "2"].map((level) =>
      rows
        .flatMap((row, y) =>
          [...row].flatMap((cell, x) =>
            cell === level ? [`M${x * 4 + 1} ${y * 4 + 1}h3v3h-3z`] : [],
          ),
        )
        .join(""),
    ),
  ]),
) as Record<EnvironmentId, string[]>;

/** Decorative brand artwork, never a replacement for the environment's name. */
export function EnvironmentMark({
  environment,
}: {
  environment: EnvironmentId;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-3 -3 43 43"
      className="size-10 shrink-0"
      data-environment={environment}
    >
      <path d={paths[environment][0]} className="fill-muted-foreground/15" />
      <path d={paths[environment][1]} className="fill-muted-foreground/70" />
      <path d={paths[environment][2]} className="fill-primary" />
    </svg>
  );
}
