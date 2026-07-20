import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/common/ScrollToTop";
import Footer from "../components/shop/Footer";
import Header from "../components/shop/Header";
import AdTrackingBridge from "../features/ads/AdTrackingBridge";
import "../styles/storefront-theme.css";
import "../styles/storefront-a11y.css";
import "../styles/storefront-premium-pages.css";

export default function ShopLayout() {
  return (
    <div className="storefront-shell">
      <a className="sf-skip-link" href="#storefront-content">
        {"B\u1ecf qua \u0111\u1ebfn n\u1ed9i dung ch\u00ednh"}
      </a>
      <ScrollToTop />
      <AdTrackingBridge />
      <Header />
      <div id="storefront-content" className="storefront-main" tabIndex={-1}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
