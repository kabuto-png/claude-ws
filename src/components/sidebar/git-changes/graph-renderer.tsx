'use client';

/**
 * Graph Renderer Component
 * Renders SVG visualization for git graph
 */

import { LaneAssignment } from '@/lib/git/lane-calculator';
import { PathSegment, GRAPH_CONSTANTS } from '@/lib/git/path-generator';
import { cn } from '@/lib/utils';

const { LANE_WIDTH, ROW_HEIGHT, DOT_RADIUS } = GRAPH_CONSTANTS;

interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  refs: string[];
  isLocal?: boolean;
  isMerge?: boolean;
}

interface GraphRendererProps {
  lanes: LaneAssignment[];
  paths: PathSegment[];
  maxLane: number;
  highlightedCommit?: string;
  onCommitClick?: (hash: string) => void;
  commits?: GitCommit[]; // New: for rendering branch badges
}

// Parse refs to extract branch/tag names
function parseRefs(refs: string[]): { branches: string[]; tags: string[] } {
  const branches: string[] = [];
  const tags: string[] = [];

  for (const ref of refs) {
    if (ref.startsWith('HEAD -> ')) {
      branches.push(ref.replace('HEAD -> ', ''));
    } else if (ref.startsWith('tag: ')) {
      tags.push(ref.replace('tag: ', ''));
    } else if (ref.includes('/')) {
      // Remote branch like origin/main
      branches.push(ref.split('/').pop() || ref);
    } else {
      branches.push(ref);
    }
  }

  // Deduplicate
  return {
    branches: [...new Set(branches)],
    tags: [...new Set(tags)],
  };
}

export function GraphRenderer({
  lanes,
  paths,
  maxLane,
  highlightedCommit,
  onCommitClick,
  commits = [],
}: GraphRendererProps) {
  const offsetX = 6; // Reduced offset for more compact layout
  const width = (maxLane + 1) * LANE_WIDTH + offsetX + 150; // Extra space for branch badges
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

      {/* Render commit dots and inline branch badges */}
      {lanes.map((lane, idx) => {
        const isHighlighted = lane.commitHash === highlightedCommit;
        const commit = commits[idx];
        const { branches, tags } = commit ? parseRefs(commit.refs) : { branches: [], tags: [] };
        const dotX = lane.lane * LANE_WIDTH + offsetX;
        const dotY = idx * ROW_HEIGHT + ROW_HEIGHT / 2;

        // Calculate badge position (right of dot with small gap)
        const badgeX = dotX + DOT_RADIUS + 8;
        const badgeY = dotY;

        return (
          <g key={lane.commitHash}>
            {/* Outer circle (border) */}
            <circle
              cx={dotX}
              cy={dotY}
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
                cx={dotX}
                cy={dotY}
                r={DOT_RADIUS + 2}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                className="animate-pulse"
              />
            )}

            {/* Branch badges inline with dot */}
            {(branches.length > 0 || tags.length > 0) && (
              <foreignObject
                x={badgeX}
                y={badgeY - 10}
                width={120}
                height={20}
                className="overflow-visible"
              >
                <div className="flex items-center gap-1" style={{ fontSize: '10px' }}>
                  {/* Show max 2 badges */}
                  {branches.slice(0, 2).map((branch) => (
                    <span
                      key={branch}
                      className={cn(
                        'px-1 py-0.5 rounded shrink-0 leading-none font-medium',
                        branch === 'main' || branch === 'master'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-green-500/20 text-green-400'
                      )}
                      style={{ fontSize: '10px' }}
                    >
                      {branch.length > 12 ? branch.slice(0, 12) + '...' : branch}
                    </span>
                  ))}
                  {tags.slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0 leading-none font-medium"
                      style={{ fontSize: '10px' }}
                    >
                      {tag.length > 8 ? tag.slice(0, 8) + '...' : tag}
                    </span>
                  ))}
                  {/* Overflow indicator */}
                  {branches.length + tags.length > 3 && (
                    <span
                      className="text-muted-foreground/50 text-[9px]"
                      title={`${branches.length + tags.length - 3} more`}
                    >
                      +{branches.length + tags.length - 3}
                    </span>
                  )}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
