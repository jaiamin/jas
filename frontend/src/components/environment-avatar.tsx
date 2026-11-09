import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { EnvironmentId } from "@/lib/types";

// Small, stable brand marks: pool, exchange, steps, institution, negotiation,
// signal, regeneration and composition. 0 = grid, 1 = structure, 2 = focal cells.
const grids: Record<EnvironmentId, readonly string[]> = {
  commons: [
    "0011100",
    "0100010",
    "1002001",
    "1022201",
    "1002001",
    "0100010",
    "0011100",
  ],
  trust_exchange: [
    "0000000",
    "1100011",
    "1210121",
    "0111110",
    "1210121",
    "1100011",
    "0000000",
  ],
  coordination: [
    "0000111",
    "0000121",
    "0011111",
    "0012100",
    "1111100",
    "1210000",
    "1110000",
  ],
  institution: [
    "0002000",
    "0011100",
    "0111110",
    "1001001",
    "1001001",
    "1001001",
    "2222222",
  ],
  bargaining: [
    "1000001",
    "1100011",
    "0110110",
    "0022200",
    "0110110",
    "1100011",
    "1000001",
  ],
  information: [
    "0001000",
    "0010100",
    "0102010",
    "1022201",
    "0102010",
    "0010100",
    "0001000",
  ],
  renewable_resource: [
    "0011100",
    "0100010",
    "1002001",
    "1022201",
    "1002001",
    "0102010",
    "0002000",
  ],
  composed: [
    "1110111",
    "1210121",
    "1110111",
    "0002000",
    "1110111",
    "1210121",
    "1110111",
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

/** Decorative environment identity, always accompanied by its full text name. */
export function EnvironmentAvatar({
  environment,
}: {
  environment: EnvironmentId;
}) {
  return (
    <Avatar className="size-7 rounded-md after:rounded-md" aria-hidden="true">
      <AvatarFallback className="rounded-md">
        <svg
          aria-hidden="true"
          viewBox="0 0 29 29"
          className="size-6"
          data-environment={environment}
        >
          <path
            d={paths[environment][0]}
            className="fill-muted-foreground/15"
          />
          <path
            d={paths[environment][1]}
            className="fill-muted-foreground/70"
          />
          <path d={paths[environment][2]} className="fill-primary" />
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
