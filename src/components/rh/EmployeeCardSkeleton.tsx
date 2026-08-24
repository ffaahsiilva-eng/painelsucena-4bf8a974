import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeCardSkeleton = memo(() => (
  <div className="bg-card rounded-xl p-6 border border-border/50">
    <div className="flex items-start gap-4 mb-4">
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-36" />
    </div>
    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  </div>
));

EmployeeCardSkeleton.displayName = "EmployeeCardSkeleton";

export default EmployeeCardSkeleton;
