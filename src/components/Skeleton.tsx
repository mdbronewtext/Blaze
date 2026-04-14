import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("relative overflow-hidden bg-zinc-900/50 rounded-md", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row-reverse" : "")}>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className={cn("space-y-2 max-w-[70%]", i % 2 === 0 ? "items-end" : "")}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
