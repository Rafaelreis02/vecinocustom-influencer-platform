export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
