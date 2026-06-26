import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/common/ScrollToTop";
import Footer from "../components/shop/Footer";
import AdTrackingBridge from "../features/ads/AdTrackingBridge";
import Header from "../components/shop/Header";

export default function ShopLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#091d2e]">
      <AdTrackingBridge />
      <Header />
      <main>
        <ScrollToTop />
      <Outlet />
      </main>
      <Footer />
    </div>
  );
}
