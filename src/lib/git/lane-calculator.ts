/**
 * Lane Calculator for Git Graph Visualization
 * Assigns horizontal lane positions to commits based on topology
 */

export interface LaneAssignment {
  commitHash: string;
  lane: number;           // Horizontal position (0, 1, 2...)
  inLanes: number[];      // Parent lanes merging in
  outLanes: number[];     // Child lanes branching out
  color: string;          // Assigned branch color
}

export interface GraphData {
  lanes: LaneAssignment[];
  maxLane: number;        // Total lanes needed
  colorMap: Map<number, string>; // Lane → color mapping
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  refs: string[];
}

const BRANCH_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

/**
 * Hash branch name to consistent color
 */
function hashBranchColor(branchName: string): string {
  let hash = 0;
  for (let i = 0; i < branchName.length; i++) {
    hash = ((hash << 5) - hash) + branchName.charCodeAt(i);
  }
  return BRANCH_COLORS[Math.abs(hash) % BRANCH_COLORS.length];
}

/**
 * Assign stable color based on branch refs or commit properties
 */
function assignColor(
  lane: number,
  commit: GitCommit,
  colorMap: Map<number, string>
): void {
  // Priority: branch refs > deterministic hash
  if (commit.refs.length > 0) {
    const branchName = commit.refs[0];
    colorMap.set(lane, hashBranchColor(branchName));
  } else {
    colorMap.set(lane, BRANCH_COLORS[lane % BRANCH_COLORS.length]);
  }
}

/**
 * Calculate lane assignments for commits
 */
export function calculateLanes(commits: GitCommit[]): GraphData {
  const laneAssignments: LaneAssignment[] = [];
  const activeLanes: (string | null)[] = []; // index is lane number, value is expected commit hash
  const colorMap: Map<number, string> = new Map();

  // Process commits in display order (newest to oldest)
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Find lane expecting this commit, or assign new lane
    let lane = activeLanes.indexOf(commit.hash);

    if (lane === -1) {
      // Not expected - start new lane (new branch head)
      lane = activeLanes.findIndex(h => h === null);
      if (lane === -1) lane = activeLanes.length;
      assignColor(lane, commit, colorMap);
    }

    // Calculate parent lane connections for visual display
    const inLanes: number[] = [];
    for (let p = 0; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p];
      const parentLane = activeLanes.indexOf(parentHash);
      if (parentLane !== -1) {
        inLanes.push(parentLane);
      }
    }

    laneAssignments.push({
      commitHash: commit.hash,
      lane,
      inLanes,
      outLanes: [lane],
      color: colorMap.get(lane) || BRANCH_COLORS[0],
    });

    // Update active lanes for this commit's parents
    if (commit.parents.length > 0) {
      // First parent continues in same lane
      activeLanes[lane] = commit.parents[0];

      // Additional parents get new lanes (merge branches)
      for (let p = 1; p < commit.parents.length; p++) {
        let nextFreeLane = activeLanes.indexOf(null);
        if (nextFreeLane === -1) nextFreeLane = activeLanes.length;
        activeLanes[nextFreeLane] = commit.parents[p];
        if (!colorMap.has(nextFreeLane)) {
          colorMap.set(nextFreeLane, BRANCH_COLORS[nextFreeLane % BRANCH_COLORS.length]);
        }
      }
    } else {
      // No parents - terminate lane (initial commit)
      activeLanes[lane] = null;
    }
  }

  // Calculate maxLane from assignments
  const maxLane = laneAssignments.length > 0
    ? Math.max(...laneAssignments.map(a => a.lane))
    : 0;

  return {
    lanes: laneAssignments,
    maxLane,
    colorMap,
  };
}
