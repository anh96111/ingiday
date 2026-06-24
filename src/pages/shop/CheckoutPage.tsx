import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchableAddressSelect from "../../components/address/SearchableAddressSelect";
import { useAdTracking } from "../../features/ads/AdTrackingContext";
import { useCart } from "../../features/cart/CartContext";
import { useCoupons } from "../../features/coupons/CouponsContext";
import { useOrders } from "../../features/orders/OrdersContext";
import { useSettings } from "../../features/settings/SettingsContext";
import type {
  AddressOption,
  VietnamDistrict,
  VietnamProvince,
} from "../../types/address";
import type { CheckoutCustomer, LocalOrder } from "../../types/cart";
import type { Coupon } from "../../types/store";
import { formatCurrency } from "../../utils/currency";
import { calculateShipping } from "../../utils/shipping";

const CHECKOUT_CUSTOMER_STORAGE_KEY = "ingiday-checkout-customer";

const initialCustomer: CheckoutCustomer = {
  fullName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
  note: "",
};

function readSavedCustomer(): CheckoutCustomer {
  try {
    const raw = localStorage.getItem(CHECKOUT_CUSTOMER_STORAGE_KEY);

    if (!raw) {
      return initialCustomer;
    }

    const saved = JSON.parse(raw) as Partial<CheckoutCustomer>;

    return {
      fullName: typeof saved.fullName === "string" ? saved.fullName : "",
      phone: typeof saved.phone === "string" ? saved.phone : "",
      province: typeof saved.province === "string" ? saved.province : "",
      district: typeof saved.district === "string" ? saved.district : "",
      ward: typeof saved.ward === "string" ? saved.ward : "",
      addressDetail:
        typeof saved.addressDetail === "string" ? saved.addressDetail : "",
      note: typeof saved.note === "string" ? saved.note : "",
    };
  } catch {
    return initialCustomer;
  }
}

const collator = new Intl.Collator("vi", {
  sensitivity: "base",
  numeric: true,
});

function stripAdministrativePrefix(name: string) {
  return name.replace(
    /^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã|Thị trấn)\s+/i,
    "",
  );
}

function sortByAdministrativeName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) =>
    collator.compare(
      stripAdministrativePrefix(left.name),
      stripAdministrativePrefix(right.name),
    ),
  );
}

function getPhoneError(phone: string) {
  if (!phone) {
    return "Vui lòng nhập số điện thoại.";
  }

  if (!phone.startsWith("0")) {
    return "Số điện thoại phải bắt đầu bằng số 0.";
  }

  if (phone.length >= 2 && !["3", "5", "7", "8", "9"].includes(phone[1])) {
    return "Đầu số không hợp lệ. Vui lòng dùng đầu số 03, 05, 07, 08 hoặc 09.";
  }

  if (phone.length < 10) {
    return `Số điện thoại còn thiếu ${10 - phone.length} số.`;
  }

  if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) {
    return "Số điện thoại không đúng định dạng.";
  }

  return "";
}

type AddressTouched = {
  province: boolean;
  district: boolean;
  ward: boolean;
};

const initialAddressTouched: AddressTouched = {
  province: false,
  district: false,
  ward: false,
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const {
    trackInitiateCheckout,
    trackPurchase,
  } = useAdTracking();
  const { createOrder } = useOrders();
  const { validateCoupon } = useCoupons();
  const { settings } = useSettings();

  const [customer, setCustomer] = useState<CheckoutCustomer>(readSavedCustomer);
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressLoadError, setAddressLoadError] = useState("");
  const [addressTouched, setAddressTouched] =
    useState<AddressTouched>(initialAddressTouched);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const checkoutTrackingKeyRef = useRef("");

  const shipping = calculateShipping(
    subtotal,
    settings.shippingFee,
    settings.freeShippingThreshold,
  );
  const total = Math.max(0, subtotal - discount) + shipping;
  const phoneError = getPhoneError(customer.phone);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const trackingKey = items
      .map(
        (item) =>
          `${item.key}:${item.quantity}:${item.unitPrice}`,
      )
      .sort()
      .join("|");

    if (checkoutTrackingKeyRef.current === trackingKey) {
      return;
    }

    checkoutTrackingKeyRef.current = trackingKey;
    void trackInitiateCheckout({
      items,
      subtotal,
    });
  }, [items, subtotal, trackInitiateCheckout]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_CUSTOMER_STORAGE_KEY,
        JSON.stringify(customer),
      );
    } catch (storageError) {
      console.warn("Không thể lưu thông tin nhận hàng:", storageError);
    }
  }, [customer]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAddressData() {
      setAddressLoading(true);
      setAddressLoadError("");

      try {
        const response = await fetch("/data/vn-address.json", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as unknown;

        if (!Array.isArray(result)) {
          throw new Error("Sai cấu trúc JSON");
        }

        setProvinces(sortByAdministrativeName(result as VietnamProvince[]));
      } catch (loadError) {
        if (controller.signal.aborted) return;

        console.error(loadError);
        setAddressLoadError(
          "Không tải được danh sách địa chỉ. Vui lòng tải lại trang.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setAddressLoading(false);
        }
      }
    }

    void loadAddressData();

    return () => controller.abort();
  }, []);

  const selectedProvince = useMemo(
    () => provinces.find((province) => province.name === customer.province),
    [customer.province, provinces],
  );

  const districts = useMemo(
    () => sortByAdministrativeName(selectedProvince?.districts ?? []),
    [selectedProvince],
  );

  const selectedDistrict = useMemo<VietnamDistrict | undefined>(
    () => districts.find((district) => district.name === customer.district),
    [customer.district, districts],
  );

  const wards = useMemo(
    () => sortByAdministrativeName(selectedDistrict?.wards ?? []),
    [selectedDistrict],
  );

  const provinceOptions = useMemo<AddressOption[]>(
    () =>
      provinces.map((province) => ({
        name: province.name,
        code: province.code,
      })),
    [provinces],
  );

  const districtOptions = useMemo<AddressOption[]>(
    () =>
      districts.map((district) => ({
        name: district.name,
        code: district.code,
      })),
    [districts],
  );

  const wardOptions = useMemo<AddressOption[]>(
    () =>
      wards.map((ward) => ({
        name: ward.name,
        code: ward.code,
      })),
    [wards],
  );

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  }

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneTouched(true);
    setCustomer((current) => ({ ...current, phone: digitsOnly }));
  }

  function handleProvinceChange(province: string) {
    setCustomer((current) => ({
      ...current,
      province,
      district: "",
      ward: "",
    }));
    setAddressTouched((current) => ({
      ...current,
      province: true,
      district: false,
      ward: false,
    }));
  }

  function handleDistrictChange(district: string) {
    setCustomer((current) => ({
      ...current,
      district,
      ward: "",
    }));
    setAddressTouched((current) => ({
      ...current,
      district: true,
      ward: false,
    }));
  }

  function handleWardChange(ward: string) {
    setCustomer((current) => ({ ...current, ward }));
    setAddressTouched((current) => ({ ...current, ward: true }));
  }

  async function handleApplyCoupon() {
    setCouponMessage("");
    setAppliedCoupon(null);
    setDiscount(0);
    setApplyingCoupon(true);

    const result = await validateCoupon(couponCode, subtotal);

    setApplyingCoupon(false);
    setCouponMessage(result.message);

    if (result.valid && result.coupon) {
      setAppliedCoupon(result.coupon);
      setDiscount(result.discount);
      setCouponCode(result.coupon.code);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (submitting || submitLockRef.current) return;

    setPhoneTouched(true);
    setAddressTouched({
      province: true,
      district: true,
      ward: true,
    });

    if (items.length === 0) {
      setError("Giỏ hàng đang trống.");
      return;
    }

    if (customer.fullName.trim().length < 2) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }

    if (phoneError) {
      setError(phoneError);
      return;
    }

    if (addressLoadError) {
      setError(addressLoadError);
      return;
    }

    if (!customer.province) {
      setError("Vui lòng chọn Tỉnh/Thành phố.");
      return;
    }

    if (!customer.district) {
      setError("Vui lòng chọn Quận/Huyện.");
      return;
    }

    if (!customer.ward) {
      setError("Vui lòng chọn Phường/Xã.");
      return;
    }

    if (!customer.addressDetail.trim()) {
      setError("Vui lòng nhập địa chỉ chi tiết.");
      return;
    }

    const order: LocalOrder = {
      code: "",
      createdAt: new Date().toISOString(),
      paymentMethod: "COD",
      customer: {
        ...customer,
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        addressDetail: customer.addressDetail.trim(),
        note: customer.note.trim(),
      },
      items,
      subtotal,
      discount,
      couponCode: appliedCoupon?.code,
      shipping,
      total,
    };

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      const result = await createOrder(order);

      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }

      void trackPurchase({
        orderCode: result.data.code,
        items,
        subtotal,
        discount,
        shipping,
        total,
      });
      clearCart();
      navigate(
        `/dat-hang-thanh-cong?ma=${encodeURIComponent(
          result.data.code,
        )}`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n hÃ ng. Vui lÃ²ng thá»­ láº¡i.",
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="text-7xl">📦</div>
        <h1 className="mt-5 text-3xl font-black">
          Chưa có sản phẩm để thanh toán
        </h1>
        <Link
          to="/san-pham"
          className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white"
        >
          Chọn sản phẩm
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-16">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
          Thanh toán
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Hoàn tất đơn hàng COD
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-black">Thông tin nhận hàng</h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Họ và tên <span className="text-[#a43c12]">*</span>
              <input
                name="fullName"
                value={customer.fullName}
                onChange={handleChange}
                className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </label>

            <div>
              <label className="block text-sm font-bold">
                Số điện thoại <span className="text-[#a43c12]">*</span>
              </label>
              <input
                name="phone"
                value={customer.phone}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneTouched(true)}
                className={`mt-2 h-12 w-full rounded-2xl border bg-[#f7f9ff] px-4 font-normal outline-none ${
                  phoneTouched && phoneError
                    ? "border-[#d9512c] focus:border-[#d9512c]"
                    : "border-[#bfc7d2] focus:border-[#006397]"
                }`}
                placeholder="0912345678"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="0(3|5|7|8|9)[0-9]{8}"
                aria-invalid={phoneTouched && Boolean(phoneError)}
              />
              <div className="mt-2 flex items-start justify-between gap-3 text-xs">
                <span
                  className={`font-semibold ${
                    phoneTouched && phoneError
                      ? "text-[#a43c12]"
                      : customer.phone.length === 10
                        ? "text-[#14633d]"
                        : "text-[#707881]"
                  }`}
                  role={phoneTouched && phoneError ? "alert" : undefined}
                >
                  {phoneTouched
                    ? phoneError || "Số điện thoại hợp lệ."
                    : "Chỉ nhập 10 chữ số, bắt đầu bằng số 0."}
                </span>
                <span className="shrink-0 text-[#707881]">
                  {customer.phone.length}/10
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SearchableAddressSelect
              label="Tỉnh/Thành phố"
              value={customer.province}
              options={provinceOptions}
              placeholder="Tìm kiếm tỉnh/thành phố"
              loading={addressLoading}
              error={
                addressTouched.province && !customer.province
                  ? "Vui lòng chọn Tỉnh/Thành phố."
                  : ""
              }
              onChange={handleProvinceChange}
              onTouched={() =>
                setAddressTouched((current) => ({
                  ...current,
                  province: true,
                }))
              }
            />

            <SearchableAddressSelect
              label="Quận/Huyện"
              value={customer.district}
              options={districtOptions}
              placeholder="Tìm kiếm quận/huyện"
              disabled={!customer.province}
              loading={addressLoading}
              error={
                addressTouched.district &&
                customer.province &&
                !customer.district
                  ? "Vui lòng chọn Quận/Huyện."
                  : ""
              }
              onChange={handleDistrictChange}
              onTouched={() =>
                setAddressTouched((current) => ({
                  ...current,
                  district: true,
                }))
              }
            />

            <SearchableAddressSelect
              label="Phường/Xã"
              value={customer.ward}
              options={wardOptions}
              placeholder="Tìm kiếm phường/xã"
              disabled={!customer.district}
              loading={addressLoading}
              error={
                addressTouched.ward &&
                customer.district &&
                !customer.ward
                  ? "Vui lòng chọn Phường/Xã."
                  : ""
              }
              onChange={handleWardChange}
              onTouched={() =>
                setAddressTouched((current) => ({
                  ...current,
                  ward: true,
                }))
              }
            />

            <label className="block text-sm font-bold">
              Địa chỉ chi tiết <span className="text-[#a43c12]">*</span>
              <input
                name="addressDetail"
                value={customer.addressDetail}
                onChange={handleChange}
                className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                placeholder="Số nhà, tên đường, thôn/xóm"
                autoComplete="street-address"
              />
            </label>
          </div>

          {addressLoadError && (
            <p
              className="mt-4 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]"
              role="alert"
            >
              {addressLoadError}
            </p>
          )}

          <label className="mt-5 block text-sm font-bold">
            Ghi chú đơn hàng
            <textarea
              name="note"
              value={customer.note}
              onChange={handleChange}
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] p-4 font-normal outline-none focus:border-[#006397]"
              placeholder="Màu mong muốn hoặc lưu ý khi giao hàng..."
            />
          </label>

          <div className="mt-6 rounded-2xl border-2 border-[#006397] bg-[#edf4ff] p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-black text-[#006397]">
                  Thanh toán khi nhận hàng — COD
                </p>
                <p className="mt-1 text-sm leading-6 text-[#3f4850]">
                  Khách thanh toán trực tiếp cho đơn vị giao hàng khi nhận sản
                  phẩm.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p
              className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <aside className="h-fit rounded-3xl bg-white p-6 shadow-[0_15px_40px_-25px_rgba(0,99,151,0.45)] lg:sticky lg:top-28">
          <h2 className="text-xl font-black">Tóm tắt đơn hàng</h2>

          <div className="mt-5 max-h-72 space-y-4 overflow-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex gap-3">
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-3xl"
                  style={{ backgroundColor: item.background }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    item.emoji
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-5">{item.name}</p>
                  {item.selectedVariants.length > 0 && (
                    <p className="mt-1 truncate text-xs text-[#707881]">
                      {item.selectedVariants
                        .map((variant) => variant.optionLabel)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-[#3f4850]">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {settings.couponEnabled && (
            <div className="mt-5 border-t border-[#bfc7d2]/60 pt-5">
              <label className="text-sm font-bold">Mã giảm giá</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(event) =>
                    setCouponCode(event.target.value.toUpperCase())
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#bfc7d2] px-3 outline-none focus:border-[#006397]"
                  placeholder="Nhập mã"
                />
                <button
                  type="button"
                  disabled={applyingCoupon}
                  onClick={() => void handleApplyCoupon()}
                  className="rounded-xl bg-[#006397] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applyingCoupon ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              </div>
              {couponMessage && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    appliedCoupon ? "text-[#14633d]" : "text-[#a43c12]"
                  }`}
                >
                  {couponMessage}
                </p>
              )}
            </div>
          )}

          <dl className="mt-6 space-y-4 border-t border-[#bfc7d2]/60 pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#3f4850]">Tiền sản phẩm</dt>
              <dd className="font-bold">{formatCurrency(subtotal)}</dd>
            </div>

            {discount > 0 && (
              <div className="flex justify-between gap-4 text-[#14633d]">
                <dt>
                  Giảm giá {appliedCoupon?.code && `(${appliedCoupon.code})`}
                </dt>
                <dd className="font-bold">−{formatCurrency(discount)}</dd>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <dt className="text-[#3f4850]">Phí vận chuyển</dt>
              <dd className="font-bold">
                {shipping === 0 ? "Miễn phí" : formatCurrency(shipping)}
              </dd>
            </div>

            <div className="flex justify-between gap-4 border-t border-[#bfc7d2]/60 pt-4 text-base">
              <dt className="font-black">Tổng thanh toán</dt>
              <dd className="font-black text-[#a43c12]">
                {formatCurrency(total)}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-center text-xs leading-5 text-[#707881]">
  Khi đặt hàng, bạn xác nhận đã đọc{" "}
  <Link
    to="/dieu-khoan-su-dung"
    className="font-bold text-[#006397]"
  >
    Điều khoản sử dụng
  </Link>
  ,{" "}
  <Link
    to="/chinh-sach-giao-hang"
    className="font-bold text-[#006397]"
  >
    Chính sách giao hàng
  </Link>
  {" "}và{" "}
  <Link
    to="/chinh-sach-doi-tra"
    className="font-bold text-[#006397]"
  >
    Chính sách đổi trả
  </Link>
  .
</p>
<button
            type="submit"
            disabled={submitting || addressLoading || Boolean(addressLoadError)}
            className="mt-6 min-h-13 w-full rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white shadow-lg shadow-[#fe7e4f]/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang tạo đơn..." : "Đặt hàng COD"}
          </button>

          <p className="mt-3 text-center text-xs leading-5 text-[#707881]">
            Tổng tiền và tồn kho được hệ thống kiểm tra lại trước khi tạo đơn.
          </p>
        </aside>
      </form>
    </section>
  );
}