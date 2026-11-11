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
  { environment: "institution", x: 824, y: 54, size: 110, tone: "violet" },
  { environment: "bargaining", x: 1082, y: 42, size: 80, tone: "blue" },
  { environment: "information", x: 1318, y: 60, size: 96, tone: "blue" },
  { environment: "renewable_resource", x: 48, y: 224, size: 82, tone: "green" },
  { environment: "composed", x: 270, y: 198, size: 68, tone: "green" },
  {
    environment: "artifact_workspace",
    x: 610,
    y: 194,
    size: 94,
    tone: "amber",
  },
  {
    environment: "distributed_coordination",
    x: 948,
    y: 190,
    size: 76,
    tone: "blue",
  },
  {
    environment: "institutional_workflow",
    x: 1172,
    y: 210,
    size: 108,
    tone: "amber",
  },
  {
    environment: "reliance_commitments",
    x: 172,
    y: 354,
    size: 92,
    tone: "violet",
  },
  { environment: "sealed_relay", x: 734, y: 348, size: 84, tone: "violet" },
  {
    environment: "reviewed_finite",
    x: 1380,
    y: 354,
    size: 92,
    tone: "violet",
  },
];

const avenues = [126, 288];
const crossroads = [210, 432, 704, 1008, 1248];
const avenue = (building: Building) =>
  Math.abs(building.y - avenues[0]) < Math.abs(building.y - avenues[1])
    ? avenues[0]
    : avenues[1];

function roundedLeg(points: Point[]) {
  let path = `M${points[0].join(" ")}`;
  let length = 0;
  let previous = points[0];
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const next = points[i + 1];
    const incoming = Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    const outgoing = next
      ? Math.hypot(next[0] - point[0], next[1] - point[1])
      : 0;
    const turn = next
      ? (point[0] - previous[0]) * (next[1] - point[1]) -
        (point[1] - previous[1]) * (next[0] - point[0])
      : 0;
    const radius = turn ? Math.min(7, incoming / 2, outgoing / 2) : 0;
    if (radius && next) {
      const entry = [
        point[0] - ((point[0] - previous[0]) / incoming) * radius,
        point[1] - ((point[1] - previous[1]) / incoming) * radius,
      ];
      const exit: Point = [
        point[0] + ((next[0] - point[0]) / outgoing) * radius,
        point[1] + ((next[1] - point[1]) / outgoing) * radius,
      ];
      path += `L${entry.join(" ")}A${radius} ${radius} 0 0 ${turn > 0 ? 1 : 0} ${exit.join(" ")}`;
      length += incoming - radius + (Math.PI * radius) / 2;
      previous = exit;
    } else {
      path += `L${point.join(" ")}`;
      length += incoming;
      previous = point;
    }
  }
  return { path, length };
}

// Decorative traffic only. Roads and routes share these same coordinates;
// visiting a building never reads an experiment or dispatches a participant.
export function createHomeMap(seed: number) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const buildings = locations.map((location) => {
    const building = {
      ...location,
      x: location.x + Math.round(random() * 16 - 8),
      y: location.y + Math.round(random() * 12 - 6),
    };
    return { ...building, street: avenue(building) };
  });
  const streets = [
    ...avenues.map((y) => `M0 ${y}H1440`),
    ...crossroads.map((x) => `M${x} ${avenues[0]}V${avenues[1]}`),
  ].join(" ");
  const drives = buildings.map((b) => `M${b.x} ${b.y}V${b.street}`).join(" ");
  const crossings = crossroads.flatMap((x, index) =>
    avenues.map((y) => ({ x: x + (index % 2 ? -15 : 15), y })),
  );
  const agents = Array.from({ length: 36 }, (_, id) => {
    const stops = [...buildings];
    const pick = () => stops.splice(Math.floor(random() * stops.length), 1)[0];
    const visits = [pick(), pick(), pick()];
    const points: Point[] = [[visits[0].x, visits[0].y]];
    const lengths: number[] = [];
    const paths: string[] = [];
    for (let leg = 0; leg < visits.length; leg++) {
      const from = visits[leg];
      const to = visits[(leg + 1) % visits.length];
      const fromAvenue = from.street;
      const toAvenue = to.street;
      const junction = crossroads
        .map((x) => ({
          x,
          distance: Math.abs(from.x - x) + Math.abs(to.x - x) + random() * 180,
        }))
        .sort((a, b) => a.distance - b.distance)[0].x;
      const departure =
        fromAvenue +
        Math.sign((fromAvenue === toAvenue ? to.x : junction) - from.x) * 3;
      const arrival = toAvenue + Math.sign(to.x - junction) * 3;
      const crossLane = junction - Math.sign(toAvenue - fromAvenue) * 3;
      const segment: Point[] = [
        [from.x, departure],
        ...(fromAvenue === toAvenue
          ? []
          : ([
              [crossLane, departure],
              [crossLane, arrival],
            ] as Point[])),
        [to.x, fromAvenue === toAvenue ? departure : arrival],
        [to.x, to.y],
      ];
      const legPoints: Point[] = [[from.x, from.y], ...segment];
      const route = roundedLeg(legPoints);
      paths.push(leg === 0 ? route.path : route.path.replace(/^M[^L]+/, ""));
      points.push(...segment);
      lengths.push(route.length);
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
      path: paths.join(" "),
      duration,
      begin: -random() * duration,
      keyPoints: keyPoints.map((point) => point.toFixed(6)).join(";"),
      keyTimes: keyTimes.map((time) => time.toFixed(6)).join(";"),
    };
  });
  return { buildings, streets, drives, crossings, agents };
}
