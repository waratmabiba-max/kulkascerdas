export function LoadingSkeleton() {
  return (
    <div className="max-w-md mx-auto p-4">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-16 bg-gray-200 rounded-xl animate-pulse col-span-2"></div>
      </div>

      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded-xl animate-pulse mb-4"></div>

      {/* Item list skeleton */}
      <div className="space-y-2">
        <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}
