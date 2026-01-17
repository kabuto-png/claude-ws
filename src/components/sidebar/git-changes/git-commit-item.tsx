'use client';

import { cn } from '@/lib/utils';

interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  refs: string[];
}

interface GitCommitItemProps {
  commit: GitCommit;
  isHead: boolean;
  color: string;
  isMerge: boolean;
  showLine: boolean;
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

export function GitCommitItem({
  commit,
  isHead,
  color,
  isMerge,
  showLine,
}: GitCommitItemProps) {
  const { branches, tags } = parseRefs(commit.refs);

  return (
    <div className="flex-1 min-w-0 py-0.5 px-2 hover:bg-accent/30 cursor-pointer group">
      {/* Commit info only - graph is handled by GraphRenderer */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Commit message */}
        <span className="text-xs truncate flex-1 min-w-0">
          {commit.message}
        </span>

        {/* Branch badges */}
        {branches.map((branch) => (
          <span
            key={branch}
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0',
              branch === 'main' || branch === 'master'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-green-500/20 text-green-400'
            )}
          >
            {branch}
          </span>
        ))}

        {/* Tag badges */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-500/20 text-yellow-400 shrink-0"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Author and date - visible on hover */}
      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {commit.author} • {commit.date}
      </div>
    </div>
  );
}
