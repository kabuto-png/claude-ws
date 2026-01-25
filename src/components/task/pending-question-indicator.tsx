'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Question {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
}

interface PendingQuestionIndicatorProps {
  questions: Question[];
  onOpen: () => void;
}

export function PendingQuestionIndicator({ questions, onOpen }: PendingQuestionIndicatorProps) {
  const firstQuestion = questions[0];

  return (
    <div className="my-4 p-3 bg-muted/50 border border-border/50 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <ExternalLink className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {firstQuestion.header}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {questions.length} question{questions.length > 1 ? 's' : ''} pending
              </span>
            </div>
            <p className="text-sm text-foreground truncate">
              {firstQuestion.question}
            </p>
            {questions.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{questions.length - 1} more question{questions.length - 1 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onOpen}
          className="shrink-0"
        >
          Open
        </Button>
      </div>
    </div>
  );
}
