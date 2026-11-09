import { useId } from "react";

// Sparse cells echo the block logo. CSS animates opacity without timers or renders.
const cells = [
  [1, 2],
  [3, 5],
  [5, 1],
  [7, 6],
  [9, 3],
  [11, 0],
  [13, 7],
  [15, 2],
  [17, 5],
  [19, 1],
  [21, 6],
  [23, 3],
  [25, 0],
  [27, 5],
  [29, 2],
  [2, 7],
  [6, 4],
  [10, 6],
  [18, 0],
  [22, 7],
  [26, 4],
  [28, 7],
];

export function HomeGrid() {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 size-full text-foreground"
      viewBox="0 0 1200 360"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="1200" height="360" fill={`url(#${id})`} />
      {cells.map(([x, y], index) => (
        <rect
          key={`${x}-${y}`}
          x={x * 40}
          y={y * 40}
          width="40"
          height="40"
          fill="currentColor"
          className="home-grid-cell"
          style={{
            animationDelay: `-${index * 3.7}s`,
            animationDuration: `${14 + (index % 5) * 3}s`,
          }}
        />
      ))}
    </svg>
  );
}
