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
  isLocal?: boolean;
  isMerge?: boolean;
}

interface GitCommitItemProps {
  commit: GitCommit;
  isHead: boolean;
  color: string;
  isMerge: boolean;
  showLine: boolean;
  onClick?: () => void;
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

// Parse conventional commit message to highlight prefix
function parseCommitMessage(message: string): { prefix: string | null; scope: string | null; subject: string } {
  const conventionalCommitRegex = /^(feat|fix|docs|refactor|chore|style|test|perf|ci|build|revert)(\(.+?\))?:\s*(.+)$/;
  const match = message.match(conventionalCommitRegex);

  if (match) {
    return {
      prefix: match[1],
      scope: match[2] || null,
      subject: match[3],
    };
  }

  return {
    prefix: null,
    scope: null,
    subject: message,
  };
}

// Get color for conventional commit type
function getCommitTypeColor(type: string): string {
  const colors: Record<string, string> = {
    feat: 'text-green-400',
    fix: 'text-red-400',
    docs: 'text-blue-400',
    refactor: 'text-purple-400',
    chore: 'text-gray-400',
    style: 'text-pink-400',
    test: 'text-yellow-400',
    perf: 'text-orange-400',
    ci: 'text-cyan-400',
    build: 'text-indigo-400',
    revert: 'text-red-400',
  };
  return colors[type] || 'text-muted-foreground';
}

export function GitCommitItem({
  commit,
  isHead,
  color,
  isMerge,
  showLine,
  onClick,
}: GitCommitItemProps) {
  const { prefix, scope, subject } = parseCommitMessage(commit.message);
  const { branches, tags } = parseRefs(commit.refs);

  // Find current branch (has "HEAD -> " in refs)
  const currentBranchRef = commit.refs.find(ref => ref.startsWith('HEAD -> '));
  const currentBranch = currentBranchRef?.replace('HEAD -> ', '') || null;

  // Separate local and remote branches
  const localBranches = branches.filter(b => !b.includes('/'));
  const remoteBranches = branches.filter(b => b.includes('/'));

  return (
    <div
      className="flex-1 min-w-0 pl-0 pr-2 flex items-center gap-1.5 hover:bg-accent/30 cursor-pointer group rounded-sm transition-colors"
      onClick={onClick}
      title={`${commit.message}\n${commit.author} • ${commit.date} • ${commit.shortHash}`}
    >
      {/* Commit message - single line only */}
      <div className="text-[12px] leading-tight truncate flex-1 min-w-0">
        {prefix && (
          <>
            <span className={cn('font-semibold', getCommitTypeColor(prefix))}>
              {prefix}
            </span>
            {scope && (
              <span className="text-muted-foreground/70">{scope}</span>
            )}
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span>{subject}</span>
      </div>

      {/* Branch badges */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Local branches - color matches lane color */}
        {localBranches.slice(0, 1).map((branch) => (
          <span
            key={branch}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            @{branch}
          </span>
        ))}

        {/* Tags - color matches lane color */}
        {tags.slice(0, 1).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {tag}
          </span>
        ))}

        {/* Remote branches - cloud icon */}
        {remoteBranches.length > 0 && (
          <svg
            className="size-3.5"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ color: color }}
          >
            <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/>
          </svg>
        )}
      </div>
    </div>
  );
}
