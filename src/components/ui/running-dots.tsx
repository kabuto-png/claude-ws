'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const SPINNER_FRAMES = ['·', '✻', '✽', '✶', '✳️', '✢'];
const FRAME_INTERVAL = 120;

interface RunningDotsProps {
    className?: string;
}

export function RunningDots({ className }: RunningDotsProps) {
    const [frameIndex, setFrameIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
        }, FRAME_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    return (
        <span className={cn('font-mono inline-block w-[1ch] text-center', className)}>
            {SPINNER_FRAMES[frameIndex]}
        </span>
    );
}
