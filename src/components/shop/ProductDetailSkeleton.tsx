export default function ProductDetailSkeleton() {
  return (
    <section
      className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-2 lg:px-16"
      aria-label="Đang tải chi tiết sản phẩm"
    >
      <div className="aspect-square animate-pulse rounded-[32px] bg-[#eaf0f6]" />
      <div className="space-y-5 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-[#dbe8f5]" />
        <div className="h-10 w-full animate-pulse rounded bg-[#eaf0f6]" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-[#eaf0f6]" />
        <div className="h-8 w-40 animate-pulse rounded bg-[#dbe8f5]" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-[#eaf0f6]" />
        <div className="h-14 w-full animate-pulse rounded-2xl bg-[#dbe8f5]" />
      </div>
    </section>
  );
}