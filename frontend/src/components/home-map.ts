import type { EnvironmentId } from "@/lib/types";

type Point = readonly [number, number];
type Building = {
  environment: EnvironmentId;
  x: number;
  y: number;
  size: number;
  tone: "blue" | "green" | "amber" | "violet";
};

const locations: Building[] = [
  { environment: "commons", x: 120, y: 65, size: 90, tone: "green" },
  { environment: "trust_exchange", x: 342, y: 62, size: 76, tone: "blue" },
  { environment: "coordination", x: 562, y: 35, size: 92, tone: "amber" },
  { environment: "institution", x: 824, y: 74, size: 110, tone: "violet" },
  { environment: "bargaining", x: 1082, y: 42, size: 80, tone: "blue" },
  { environment: "information", x: 1318, y: 82, size: 96, tone: "blue" },
  { environment: "renewable_resource", x: 48, y: 224, size: 82, tone: "green" },
  { environment: "composed", x: 270, y: 198, size: 68, tone: "green" },
  {
    environment: "artifact_workspace",
    x: 610,
    y: 186,
    size: 94,
    tone: "amber",
  },
  {
    environment: "distributed_coordination",
    x: 948,
    y: 170,
    size: 76,
    tone: "blue",
  },
  {
    environment: "institutional_workflow",
    x: 1194,
    y: 230,
    size: 108,
    tone: "amber",
  },
  {
    environment: "reliance_commitments",
    x: 172,
    y: 332,
    size: 104,
    tone: "violet",
  },
  { environment: "sealed_relay", x: 734, y: 316, size: 84, tone: "violet" },
  {
    environment: "reviewed_finite",
    x: 1380,
    y: 326,
    size: 100,
    tone: "violet",
  },
];

const avenues = [126, 288];
const crossroads = [210, 432, 704, 1008, 1248];
const avenue = (building: Building) =>
  Math.abs(building.y - avenues[0]) < Math.abs(building.y - avenues[1])
    ? avenues[0]
    : avenues[1];

// Decorative traffic only. Roads and routes share these same coordinates;
// visiting a building never reads an experiment or dispatches a participant.
export function createHomeMap(seed: number) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const buildings = locations.map((building) => ({
    ...building,
    x: building.x + Math.round(random() * 16 - 8),
    y: building.y + Math.round(random() * 12 - 6),
  }));
  const roads = [
    ...avenues.map((y) => `M0 ${y}H1440`),
    ...crossroads.map((x) => `M${x} 0V360`),
    ...buildings.map(
      (building) => `M${building.x} ${building.y}V${avenue(building)}`,
    ),
  ].join(" ");
  const agents = Array.from({ length: 36 }, (_, id) => {
    const stops = [...buildings];
    const pick = () => stops.splice(Math.floor(random() * stops.length), 1)[0];
    const visits = [pick(), pick(), pick()];
    const points: Point[] = [[visits[0].x, visits[0].y]];
    const lengths: number[] = [];
    for (let leg = 0; leg < visits.length; leg++) {
      const from = visits[leg];
      const to = visits[(leg + 1) % visits.length];
      const fromAvenue = avenue(from);
      const toAvenue = avenue(to);
      const junction = crossroads[Math.floor(random() * crossroads.length)];
      const segment: Point[] = [
        [from.x, fromAvenue],
        ...(fromAvenue === toAvenue
          ? []
          : ([
              [junction, fromAvenue],
              [junction, toAvenue],
            ] as Point[])),
        [to.x, toAvenue],
        [to.x, to.y],
      ];
      let length = 0;
      for (const point of segment) {
        const previous = points[points.length - 1];
        const distance = Math.hypot(
          point[0] - previous[0],
          point[1] - previous[1],
        );
        if (distance === 0) continue;
        length += distance;
        points.push(point);
      }
      lengths.push(length);
    }
    const distance = lengths.reduce((sum, length) => sum + length, 0);
    const speed = 24 + random() * 12;
    const stay = 1.5 + random() * 2;
    const duration = distance / speed + stay * visits.length;
    const keyPoints = [0];
    const keyTimes = [0];
    let traveled = 0;
    let elapsed = 0;
    for (const length of lengths) {
      traveled += length;
      elapsed += length / speed;
      keyPoints.push(traveled / distance, traveled / distance);
      keyTimes.push(elapsed / duration, (elapsed + stay) / duration);
      elapsed += stay;
    }
    return {
      id,
      points,
      path: points
        .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
        .join(" "),
      duration,
      begin: -random() * duration,
      keyPoints: keyPoints.map((point) => point.toFixed(6)).join(";"),
      keyTimes: keyTimes.map((time) => time.toFixed(6)).join(";"),
    };
  });
  return { buildings, roads, agents };
}
