import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateLanes, GitCommit, COLOR_SCHEME } from './lane-calculator';

function makeCommit(hash: string, parents: string[], refs: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.substring(0, 7),
    message: `Commit ${hash}`,
    author: 'Author',
    date: new Date().toISOString(),
    parents,
    refs
  };
}

describe('color-scheme', () => {
  it('assigns amber color to main branch', () => {
    const commits = [makeCommit('a', [], ['main'])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.main);
  });

  it('assigns amber color to master branch', () => {
    const commits = [makeCommit('a', [], ['master'])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.master);
  });

  it('assigns amber color to origin/main branch', () => {
    const commits = [makeCommit('a', [], ['origin/main'])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.main);
  });

  it('assigns amber color to HEAD -> main branch', () => {
    const commits = [makeCommit('a', [], ['HEAD -> main'])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.main);
  });

  it('assigns gray color to orphan commits', () => {
    // Orphan: no refs, no parents
    const commits = [makeCommit('a', [])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.orphan);
  });

  it('assigns palette color to other branches', () => {
    const commits = [makeCommit('a', [], ['feature-branch'])];
    const data = calculateLanes(commits);
    assert.ok(COLOR_SCHEME.palette.includes(data.lanes[0].color));
  });

  it('inherits color from parent for linear history', () => {
    const commits = [
      makeCommit('b', ['a']),
      makeCommit('a', [], ['main'])
    ];
    const data = calculateLanes(commits);
    // 'b' should inherit color from 'a' (main)
    assert.strictEqual(data.lanes[0].color, COLOR_SCHEME.main); // b
    assert.strictEqual(data.lanes[1].color, COLOR_SCHEME.main); // a
  });

  it('prioritizes refs over lane position', () => {
    // Force a commit into lane 1, but give it 'main' ref
    const commits = [
      makeCommit('c', ['a'], ['main']),
      makeCommit('b', ['a'], ['feature']),
      makeCommit('a', [])
    ];
    const data = calculateLanes(commits);

    // c should be amber even if it might be in lane 1
    const commitC = data.lanes.find(l => l.commitHash === 'c');
    assert.strictEqual(commitC?.color, COLOR_SCHEME.main);
  });
});
