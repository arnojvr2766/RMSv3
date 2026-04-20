import React from 'react';

// ── Primitives ────────────────────────────────────────────────────────────────

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-700 rounded ${className}`} />
  );
}

// ── Page-level skeletons ──────────────────────────────────────────────────────

/** Generic table-row skeleton — pass rows prop to control count */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-3">
          <Bone className="h-8 w-8 rounded-full flex-shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, colIdx) => (
            <Bone
              key={colIdx}
              className={`h-3 flex-1 ${colIdx === cols - 2 ? 'max-w-[80px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-grid skeleton */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <Bone className="h-4 w-1/2" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-3 w-3/4" />
          <Bone className="h-3 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Bone className="h-7 flex-1 rounded-lg" />
            <Bone className="h-7 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stat-card row skeleton (for dashboards) */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-8 rounded-lg" />
          </div>
          <Bone className="h-7 w-16" />
          <Bone className="h-2 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Full page loader — header bar + content skeleton */
export function PageLoader({
  title,
  variant = 'table',
}: {
  title?: string;
  variant?: 'table' | 'cards';
}) {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          {title && <Bone className="h-4 w-32" />}
        </div>
        <Bone className="h-9 w-28 rounded-lg" />
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Bone className="h-9 flex-1 max-w-xs rounded-lg" />
        <Bone className="h-9 w-32 rounded-lg" />
        <Bone className="h-9 w-32 rounded-lg" />
      </div>
      {/* Content */}
      {variant === 'table' ? <TableSkeleton /> : <CardGridSkeleton />}
    </div>
  );
}

/** Inline spinner — for smaller loading states inside a page */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary-500 ${s}`} />
    </div>
  );
}
