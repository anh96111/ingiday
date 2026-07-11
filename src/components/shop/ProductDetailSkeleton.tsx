export default function ProductDetailSkeleton() {
  return (
    <main
      className="sf-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(380px,0.96fr)]"
      aria-label="Đang tải chi tiết sản phẩm"
    >
      <div className="aspect-square animate-pulse rounded-[34px] border border-[rgba(88,63,80,0.06)] bg-[linear-gradient(100deg,#f5eff2_18%,#fff_34%,#f5eff2_50%)] bg-[length:260%_100%]" />

      <div className="space-y-5 rounded-[34px] border border-[rgba(88,63,80,0.07)] bg-white p-6 shadow-[0_18px_48px_rgba(86,53,74,0.08)] sm:p-8">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--sf-pink-soft)]" />
        <div className="h-10 w-full animate-pulse rounded-full bg-[#f0e9ed]" />
        <div className="h-10 w-3/4 animate-pulse rounded-full bg-[#f0e9ed]" />
        <div className="h-8 w-40 animate-pulse rounded-full bg-[#eee5ff]" />
        <div className="h-20 w-full animate-pulse rounded-[22px] bg-[#faf5f7]" />
        <div className="h-14 w-full animate-pulse rounded-full bg-[var(--sf-pink-soft)]" />
        <div className="h-14 w-full animate-pulse rounded-full bg-[#f1ebee]" />
      </div>
    </main>
  );
}
