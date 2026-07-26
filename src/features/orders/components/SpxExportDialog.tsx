import { useMemo, useState } from "react";
import type { StoreOrder } from "../../../types/store";
import {
  normalizedAddressStatusClass,
  normalizedAddressStatusLabel,
} from "../addressNormalization";
import {
  exportOrdersToSpx,
  getMissingSpxAddressFields,
  getSpxAddress,
} from "../spxExport";

type SpxExportDialogProps = {
  orders: StoreOrder[];
  onClose: () => void;
};

export default function SpxExportDialog({
  orders,
  onClose,
}: SpxExportDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  const rows = useMemo(
    () =>
      orders.map((order) => ({
        order,
        address: getSpxAddress(order),
        missingFields: getMissingSpxAddressFields(order),
      })),
    [orders],
  );
  const incompleteCount = rows.filter(
    (row) => row.missingFields.length > 0,
  ).length;

  async function exportFile() {
    if (exporting) return;

    setExporting(true);
    setMessage("");

    try {
      await exportOrdersToSpx(orders);
      setMessage(`Đã tạo file SPX gồm ${orders.length} đơn hàng.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo file SPX.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#091d2e]/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spx-export-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e3e8ee] px-5 py-4 sm:px-7">
          <div>
            <h2 id="spx-export-title" className="text-2xl font-black">
              Xuất file SPX
            </h2>
            <p className="mt-1 text-sm text-[#707881]">
              Mã đơn trong file sẽ bắt đầu lại từ 1. Trọng lượng và lựa chọn
              giao hàng dùng giá trị cố định đã chốt.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf0f3] text-xl font-bold disabled:opacity-50"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-7">
          {incompleteCount > 0 && (
            <p className="mb-5 rounded-2xl bg-[#fff1b8] px-4 py-3 text-sm font-semibold text-[#7a5200]">
              Có {incompleteCount} đơn thiếu thành phần địa chỉ SPX. Bạn vẫn có
              thể xuất, nhưng nên chuẩn hóa trước để hạn chế SPX từ chối file.
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#d7dee6]">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#edf4ff] text-[#3f4850]">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Đơn hàng</th>
                  <th className="px-4 py-3">Trạng thái địa chỉ</th>
                  <th className="px-4 py-3">Nguồn dùng khi xuất</th>
                  <th className="px-4 py-3">Địa chỉ đưa vào SPX</th>
                  <th className="px-4 py-3">Kiểm tra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f3]">
                {rows.map(({ order, address, missingFields }, index) => (
                  <tr key={order.id ?? order.code}>
                    <td className="px-4 py-4 font-bold">{index + 1}</td>
                    <td className="px-4 py-4">
                      <p className="font-black">{order.code}</p>
                      <p className="mt-1 text-xs text-[#707881]">
                        {order.customer.fullName} · {order.customer.phone}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${normalizedAddressStatusClass(order)}`}
                      >
                        {normalizedAddressStatusLabel(order)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {address.usesNormalizedAddress
                        ? "Địa chỉ chuẩn hóa"
                        : "Địa chỉ gốc"}
                    </td>
                    <td className="max-w-md px-4 py-4 leading-6">
                      {[
                        address.addressDetail,
                        address.ward,
                        address.district,
                        address.province,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Chưa có địa chỉ"}
                    </td>
                    <td className="px-4 py-4">
                      {missingFields.length === 0 ? (
                        <span className="font-bold text-[#14633d]">
                          Đủ 4 phần
                        </span>
                      ) : (
                        <span className="font-semibold text-[#a43c12]">
                          Thiếu: {missingFields.join(", ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-[#f7f9ff] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <strong>Trọng lượng:</strong> 1 KG
            </p>
            <p>
              <strong>Giao một phần:</strong> N
            </p>
            <p>
              <strong>Thử hàng:</strong> N
            </p>
            <p>
              <strong>Xem hàng:</strong> Y
            </p>
            <p>
              <strong>Phí từ chối:</strong> 30.000
            </p>
            <p>
              <strong>Thu COD:</strong> Y
            </p>
            <p>
              <strong>Thanh toán:</strong> Người gửi trả
            </p>
            <p>
              <strong>COD:</strong> Tổng tiền đơn hàng
            </p>
          </div>
        </div>

        <div className="border-t border-[#e3e8ee] px-5 py-4 sm:px-7">
          {message && (
            <p
              className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                message.startsWith("Đã")
                  ? "bg-[#dcf8eb] text-[#14633d]"
                  : "bg-[#fff0eb] text-[#a43c12]"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-xl bg-[#edf0f3] px-5 py-3 text-sm font-bold disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void exportFile()}
              disabled={orders.length === 0 || exporting}
              className="rounded-xl bg-[#006397] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {exporting
                ? "Đang tạo file..."
                : incompleteCount > 0
                  ? "Vẫn xuất file SPX"
                  : "Xuất file SPX"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
