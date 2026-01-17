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
  const width = (maxLane + 1) * LANE_WIDTH + 8; // Add padding
  const height = lanes.length * ROW_HEIGHT;

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
      style={{ minWidth: width }}
    >
      {/* Render paths first (below dots) */}
      {paths.map((path, idx) => (
        <path
          key={`path-${idx}`}
          d={path.d}
          stroke={path.color}
          strokeWidth={path.type === 'merge' ? 2 : 1.5}
          fill="none"
          opacity={0.8}
          strokeLinecap="round"
        />
      ))}

      {/* Render commit dots */}
      {lanes.map((lane, idx) => {
        const isHighlighted = lane.commitHash === highlightedCommit;
        const isMerge = lane.inLanes.length > 1;

        return (
          <circle
            key={lane.commitHash}
            cx={lane.lane * LANE_WIDTH}
            cy={idx * ROW_HEIGHT + ROW_HEIGHT / 2}
            r={isMerge ? DOT_RADIUS + 1 : DOT_RADIUS}
            fill={lane.color}
            stroke={isHighlighted ? '#fff' : 'none'}
            strokeWidth={isHighlighted ? 2 : 0}
            className="cursor-pointer hover:stroke-white hover:stroke-2 transition-all"
            onClick={() => onCommitClick?.(lane.commitHash)}
          />
        );
      })}
    </svg>
  );
}
