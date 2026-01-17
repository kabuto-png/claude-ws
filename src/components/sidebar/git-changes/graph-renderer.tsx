'use client';

/**
 * Graph Renderer Component
 * Renders SVG visualization for git graph
 */

import { LaneAssignment } from '@/lib/git/lane-calculator';
import { PathSegment, GRAPH_CONSTANTS } from '@/lib/git/path-generator';

const { LANE_WIDTH, ROW_HEIGHT, DOT_RADIUS } = GRAPH_CONSTANTS;

interface GraphRendererProps {
  lanes: LaneAssignment[];
  paths: PathSegment[];
  maxLane: number;
  highlightedCommit?: string;
  onCommitClick?: (hash: string) => void;
}

export function GraphRenderer({
  lanes,
  paths,
  maxLane,
  highlightedCommit,
  onCommitClick,
}: GraphRendererProps) {
  const offsetX = 10;
  const width = (maxLane + 1) * LANE_WIDTH + offsetX + 4;
  const height = lanes.length * ROW_HEIGHT;

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
      style={{ minWidth: width }}
    >
      {/* Render paths first (below dots) */}
      {paths.map((path, idx) => {
        // Parse and adjust path coordinates
        let d = path.d;

        // Replace M (move), L (line), C (curve) X coordinates
        d = d.replace(/M ([\d.]+) ([\d.]+)/g, (_, x, y) => `M ${parseFloat(x) + offsetX} ${y}`);
        d = d.replace(/L ([\d.]+) ([\d.]+)/g, (_, x, y) => `L ${parseFloat(x) + offsetX} ${y}`);
        d = d.replace(/C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)/g,
          (_, x1, y1, x2, y2, x3, y3) =>
            `C ${parseFloat(x1) + offsetX} ${y1}, ${parseFloat(x2) + offsetX} ${y2}, ${parseFloat(x3) + offsetX} ${y3}`
        );

        return (
          <path
            key={`path-${idx}`}
            d={d}
            stroke={path.color}
            strokeWidth={2}
            fill="none"
            opacity={1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Render commit dots */}
      {lanes.map((lane, idx) => {
        const isHighlighted = lane.commitHash === highlightedCommit;
        const isMerge = lane.inLanes.length > 1;

        return (
          <g key={lane.commitHash}>
            {/* Outer circle (border) */}
            <circle
              cx={lane.lane * LANE_WIDTH + offsetX}
              cy={idx * ROW_HEIGHT + ROW_HEIGHT / 2}
              r={DOT_RADIUS}
              fill={lane.color}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={1}
              className="cursor-pointer transition-all"
              onClick={() => onCommitClick?.(lane.commitHash)}
            />
            {/* Inner highlight circle */}
            {isHighlighted && (
              <circle
                cx={lane.lane * LANE_WIDTH + offsetX}
                cy={idx * ROW_HEIGHT + ROW_HEIGHT / 2}
                r={DOT_RADIUS + 2}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                className="animate-pulse"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
