import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateLanes } from './lane-calculator';
import { generatePaths } from './path-generator';

function makeCommit(hash: string, parents: string[]): any {
  return {
    hash,
    shortHash: hash.substring(0, 7),
    message: `Commit ${hash}`,
    author: 'Author',
    date: new Date().toISOString(),
    parents,
    refs: []
  };
}

describe('path-generator', () => {
  it('generates straight lines for linear history', () => {
    const commits = [
      makeCommit('c', ['b']),
      makeCommit('b', ['a']),
      makeCommit('a', [])
    ];
    const { lanes } = calculateLanes(commits);
    const paths = generatePaths(lanes, commits);

    // Should have 2 path segments (c->b, b->a)
    assert.strictEqual(paths.length, 2);
    assert.strictEqual(paths[0].type, 'line');
    assert.strictEqual(paths[1].type, 'line');
  });

  it('generates curved paths for merges', () => {
    const commits = [
      makeCommit('d', ['b', 'c']),
      makeCommit('c', ['a']),
      makeCommit('b', ['a']),
      makeCommit('a', [])
    ];
    const { lanes } = calculateLanes(commits);
    const paths = generatePaths(lanes, commits);

    // Connections:
    // d -> b (same lane)
    // d -> c (different lane)
    // c -> a (different lane)
    // b -> a (same lane)

    const mergePaths = paths.filter(p => p.type === 'merge');
    assert.ok(mergePaths.length >= 1, 'Should have at least one merge path');
    assert.ok(mergePaths[0].d.includes('C'), 'Merge path should be a Cubic Bezier curve');
  });
});
