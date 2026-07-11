export default function ProductGridSkeleton({
  count = 8,
}: {
  count?: number;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Đang tải sản phẩm"
    >
      {Array.from({ length: count }).map((_item, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-[rgba(88,63,80,0.06)] bg-white shadow-[0_14px_36px_rgba(86,53,74,0.06)]"
          aria-hidden="true"
        >
          <div className="aspect-square animate-pulse bg-[linear-gradient(100deg,#f5eff2_18%,#fff_34%,#f5eff2_50%)] bg-[length:260%_100%]" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-[var(--sf-pink-soft)]" />
            <div className="h-5 animate-pulse rounded-full bg-[#f0e9ed]" />
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-[#f0e9ed]" />
            <div className="mt-4 h-6 w-2/5 animate-pulse rounded-full bg-[#eee5ff]" />
          </div>
        </div>
      ))}
    </div>
  );
}
