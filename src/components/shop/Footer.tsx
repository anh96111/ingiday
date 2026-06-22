import { Link } from "react-router-dom";
import { useSettings } from "../../features/settings/SettingsContext";

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="mt-16 bg-[#203243] text-[#e8f2ff]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-3 lg:px-16">
        <div>
          <Link to="/" className="text-3xl font-black text-white">
            {settings.storeName}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[#c9dcf3]">{settings.footerDescription}</p>
        </div>

        <div>
          <h2 className="font-bold text-white">Khám phá</h2>
          <div className="mt-4 grid gap-3 text-sm text-[#c9dcf3]">
            <Link to="/san-pham">Tất cả sản phẩm</Link>
            <Link to="/in-rieng">Yêu cầu in riêng</Link>
            <Link to="/gio-hang">Giỏ hàng</Link>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-white">Liên hệ</h2>
          <div className="mt-4 grid gap-2 text-sm leading-7 text-[#c9dcf3]">
            {settings.phone && <p>Điện thoại: {settings.phone}</p>}
            {settings.email && <p>Email: {settings.email}</p>}
            {settings.address && <p>Địa chỉ: {settings.address}</p>}
            {settings.messengerUrl && <a href={settings.messengerUrl} target="_blank" rel="noreferrer" className="font-bold text-white">Messenger ↗</a>}
            {!settings.phone && !settings.email && !settings.address && !settings.messengerUrl && <p>Thông tin liên hệ sẽ được cập nhật trong trang quản trị.</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-[#c9dcf3]">
        © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
      </div>
    </footer>
  );
}
