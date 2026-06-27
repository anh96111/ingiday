import { useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useSettings } from "../../features/settings/SettingsContext";
import { formatCurrency } from "../../utils/currency";

const navItems = [
  { label: "Trang chủ", to: "/" },
  { label: "Sản phẩm", to: "/san-pham" },
  { label: "Yêu cầu riêng", to: "/in-rieng" },
];

export default function Header() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { settings } = useSettings();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/san-pham?q=${encodeURIComponent(value)}` : "/san-pham");
    setMenuOpen(false);
  }

  return (
    <>
      <div className="bg-[#fe7e4f] px-4 py-2 text-center text-xs font-bold text-[#6b1f00] sm:text-sm">
        Miễn phí vận chuyển cho đơn hàng từ {formatCurrency(settings.freeShippingThreshold)}
      </div>

      <header className="sticky top-0 z-40 border-b border-[#bfc7d2]/40 bg-[#f7f9ff]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-16">
          <Link
            to="/"
            className="flex min-w-0 items-center text-2xl font-black tracking-tight text-[#006397] sm:text-3xl"
            aria-label={settings.storeName}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.storeName}
                className="h-10 max-w-[150px] object-contain sm:h-11 sm:max-w-[190px]"
              />
            ) : (
              settings.storeName
            )}
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive ? "text-[#006397]" : "text-[#3f4850] hover:text-[#a43c12]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="hidden lg:block">
              <label className="flex h-11 w-64 items-center gap-2 rounded-2xl bg-[#edf4ff] px-4 text-[#3f4850] shadow-inner">
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#707881]"
                  placeholder="Tìm món đồ xinh xắn..."
                />
              </label>
            </form>

            <Link
              to="/gio-hang"
              className="relative grid h-11 w-11 place-items-center rounded-full text-xl text-[#091d2e] transition hover:bg-[#d1e4fb]"
              aria-label={`Giỏ hàng có ${itemCount} sản phẩm`}
            >
              🛒
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#fe7e4f] px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="grid h-11 w-11 place-items-center rounded-full text-xl hover:bg-[#d1e4fb] md:hidden"
              aria-label="Mở menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[#bfc7d2]/40 bg-[#f7f9ff] px-5 py-4 md:hidden">
            <form onSubmit={handleSearch} className="mb-4">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#bfc7d2] bg-white px-4 outline-none focus:border-[#006397]"
                placeholder="Tìm sản phẩm..."
              />
            </form>
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 font-semibold ${
                      isActive ? "bg-[#d1e4fb] text-[#006397]" : "text-[#3f4850]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
