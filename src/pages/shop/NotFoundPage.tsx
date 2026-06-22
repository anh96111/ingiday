import {
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { usePageMeta } from "../../hooks/usePageMeta";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  usePageMeta({
    title: "Không tìm thấy trang | InGiDay",
    description:
      "Trang bạn đang tìm không tồn tại trên InGiDay.",
  });

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedQuery = query.trim();

    navigate(
      normalizedQuery
        ? `/san-pham?q=${encodeURIComponent(
            normalizedQuery,
          )}`
        : "/san-pham",
    );
  }

  return (
    <section className="mx-auto grid min-h-[62vh] max-w-5xl place-items-center px-5 py-16 text-center">
      <div>
        <div className="mx-auto grid h-32 w-32 place-items-center rounded-[38%] bg-[#dff4ff] text-6xl shadow-sm">
          🧩
        </div>

        <p className="mt-7 text-sm font-black uppercase tracking-[0.24em] text-[#006397]">
          Lỗi 404
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#091d2e] sm:text-5xl">
          Trang này đi lạc mất rồi
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#707881]">
          Đường dẫn có thể đã thay đổi hoặc không
          còn tồn tại. Hãy tìm sản phẩm khác hoặc
          quay lại cửa hàng.
        </p>

        <form
          onSubmit={handleSearch}
          className="mx-auto mt-8 flex max-w-xl gap-3 rounded-2xl bg-white p-2 shadow-sm"
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            className="h-12 min-w-0 flex-1 rounded-xl px-4 outline-none"
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#006397] px-5 font-bold text-white"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white"
          >
            Về trang chủ
          </Link>
          <Link
            to="/san-pham"
            className="inline-flex min-h-12 items-center rounded-2xl bg-[#edf4ff] px-6 font-bold text-[#006397]"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}