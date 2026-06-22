export default function ProductGridSkeleton({
  count = 8,
}: {
  count?: number;
}) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Đang tải sản phẩm"
    >
      {Array.from({ length: count }).map(
        (_item, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl bg-white shadow-sm"
          >
            <div className="aspect-square animate-pulse bg-[#eaf0f6]" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-24 animate-pulse rounded bg-[#eaf0f6]" />
              <div className="h-5 w-full animate-pulse rounded bg-[#eaf0f6]" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-[#eaf0f6]" />
              <div className="h-6 w-32 animate-pulse rounded bg-[#dbe8f5]" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}