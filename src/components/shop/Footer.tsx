import { Link } from "react-router-dom";

import { useSettings } from "../../features/settings/SettingsContext";

const policyLinks = [
  {
    label: "Chính sách giao hàng",
    to: "/chinh-sach-giao-hang",
  },
  {
    label: "Chính sách đổi trả",
    to: "/chinh-sach-doi-tra",
  },
  {
    label: "Chính sách bảo hành",
    to: "/chinh-sach-bao-hanh",
  },
  {
    label: "Chính sách bảo mật",
    to: "/chinh-sach-bao-mat",
  },
  {
    label: "Điều khoản sử dụng",
    to: "/dieu-khoan-su-dung",
  },
];

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="mt-20 bg-[#091d2e] text-[#dce8f2]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-16">
        <div>
          <Link
            to="/"
            className="text-2xl font-black text-white"
          >
            {settings.storeName}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[#b8c8d5]">
            {settings.footerDescription}
          </p>
        </div>

        <div>
          <h2 className="font-black text-white">
            Khám phá
          </h2>
          <nav className="mt-4 space-y-3 text-sm">
            <Link
              to="/san-pham"
              className="block hover:text-white"
            >
              Tất cả sản phẩm
            </Link>
            <Link
              to="/in-rieng"
              className="block hover:text-white"
            >
              Yêu cầu in riêng
            </Link>
            <Link
              to="/gio-hang"
              className="block hover:text-white"
            >
              Giỏ hàng
            </Link>
          </nav>
        </div>

        <div>
          <h2 className="font-black text-white">
            Chính sách
          </h2>
          <nav className="mt-4 space-y-3 text-sm">
            {policyLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="font-black text-white">
            Liên hệ
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#b8c8d5]">
            {settings.phone && (
              <p>
                Điện thoại: {settings.phone}
              </p>
            )}
            {settings.email && (
              <p>Email: {settings.email}</p>
            )}
            {settings.address && (
              <p>Địa chỉ: {settings.address}</p>
            )}
            {settings.messengerUrl && (
              <a
                href={settings.messengerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block font-bold text-[#ffd5c4] hover:text-white"
              >
                Messenger ↗
              </a>
            )}
            {!settings.phone &&
              !settings.email &&
              !settings.address &&
              !settings.messengerUrl && (
                <p>
                  Thông tin liên hệ sẽ được cập
                  nhật trong trang quản trị.
                </p>
              )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-[#9fb1bf]">
        © {new Date().getFullYear()}{" "}
        {settings.storeName}. All rights reserved.
      </div>
    </footer>
  );
}