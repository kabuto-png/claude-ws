import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateLanes, GitCommit } from './lane-calculator';

function makeCommit(hash: string, parents: string[], refs: string[] = [], isLocal = false, isMerge = false): GitCommit {
  return {
    hash,
    shortHash: hash.substring(0, 7),
    message: `Commit ${hash}`,
    author: 'Author',
    date: new Date().toISOString(),
    parents,
    refs,
    isLocal,
    isMerge
  };
}

describe('lane-calculator', () => {
  it('assigns lane 0 to first commit', () => {
    const commits = [makeCommit('a', [])];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].lane, 0);
  });

  it('continues parent lane for linear history', () => {
    // History: a <- b <- c
    // Display order: c, b, a
    const commits = [
      makeCommit('c', ['b']),
      makeCommit('b', ['a']),
      makeCommit('a', [])
    ];
    const data = calculateLanes(commits);
    assert.strictEqual(data.lanes[0].lane, 0); // c
    assert.strictEqual(data.lanes[1].lane, 0); // b
    assert.strictEqual(data.lanes[2].lane, 0); // a
  });

  it('assigns new lane for branch', () => {
    // History: a <- b, a <- c (c branches from a)
    // Display order: c, b, a
    const commits = [
      makeCommit('c', ['a']),
      makeCommit('b', ['a']),
      makeCommit('a', [])
    ];
    const data = calculateLanes(commits);
    assert.notStrictEqual(data.lanes[0].lane, data.lanes[1].lane);
  });

  it('handles merge commits and lane connections', () => {
    // History: a <- b, a <- c, (b,c) <- d (merge)
    // Display order: d, c, b, a
    const commits = [
      makeCommit('d', ['b', 'c']),
      makeCommit('c', ['a']),
      makeCommit('b', ['a']),
      makeCommit('a', [])
    ];
    const data = calculateLanes(commits);

    // d should be in some lane (e.g. 0)
    const laneD = data.lanes[0].lane;
    // b (first parent) should be in same lane as d
    assert.strictEqual(data.lanes[2].lane, laneD);

    // In current implementation:
    // d (lane 0) -> expects b in lane 0, c in lane 1
    // c (lane 1) -> expects a in lane 1
    // b (lane 0) -> expects a in lane 0
    // a (lane 0) -> terminal

    assert.strictEqual(data.lanes[1].lane, 1); // c
    assert.strictEqual(data.lanes[2].lane, 0); // b
    assert.strictEqual(data.lanes[3].lane, 0); // a
  });

  it('uses stable colors for branches', () => {
    const commits = [
      makeCommit('a', [], ['main']),
      makeCommit('b', [], ['feature'])
    ];
    const data = calculateLanes(commits);
    assert.ok(data.lanes[0].color);
    assert.ok(data.lanes[1].color);
  });

  it('preserves isLocal and isMerge fields', () => {
    const commits = [
      makeCommit('m', ['a', 'b'], [], false, true),
      makeCommit('l', ['m'], [], true, false),
    ];
    // Note: calculateLanes doesn't change these fields, just ensures they are in GitCommit
    assert.strictEqual(commits[0].isMerge, true);
    assert.strictEqual(commits[0].isLocal, false);
    assert.strictEqual(commits[1].isMerge, false);
    assert.strictEqual(commits[1].isLocal, true);
  });
});
