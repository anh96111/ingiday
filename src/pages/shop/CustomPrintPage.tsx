import { useSettings } from "../../features/settings/SettingsContext";

export default function CustomPrintPage() {
  const { settings, loading } = useSettings();
  const messengerUrl = settings.messengerUrl || "#";

  const steps = [
    {
      title: settings.customPrintStep1Title,
      description: settings.customPrintStep1Description,
    },
    {
      title: settings.customPrintStep2Title,
      description: settings.customPrintStep2Description,
    },
    {
      title: settings.customPrintStep3Title,
      description: settings.customPrintStep3Description,
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-16">
      <div className="rounded-[32px] bg-gradient-to-br from-[#d9eaff] to-[#ffe1ef] p-8 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
          In theo yêu cầu
        </p>

        <h1 className="mt-4 text-4xl font-black">
          {settings.customPrintTitle}
        </h1>

        <p className="mt-5 max-w-2xl leading-8 text-[#3f4850]">
          {settings.customPrintDescription}
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={`${index}-${step.title}`}
            className="rounded-3xl bg-white p-6 shadow-sm"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#d1e4fb] font-black text-[#006397]">
              {index + 1}
            </span>
            <h2 className="mt-5 text-xl font-black">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#3f4850]">
              {step.description}
            </p>
          </article>
        ))}
      </div>

      <a
        href={messengerUrl}
        target={settings.messengerUrl ? "_blank" : undefined}
        rel="noreferrer"
        aria-disabled={!settings.messengerUrl}
        className={`mt-8 inline-flex min-h-12 items-center rounded-2xl px-7 font-bold text-white ${
          settings.messengerUrl
            ? "bg-[#fe7e4f]"
            : "cursor-not-allowed bg-[#9aa1a8]"
        }`}
        onClick={(event) => {
          if (!settings.messengerUrl) {
            event.preventDefault();
          }
        }}
      >
        {loading
          ? "Đang tải thông tin..."
          : settings.customPrintButtonText}
      </a>

      {!settings.messengerUrl && !loading && (
        <p className="mt-3 text-sm text-[#707881]">
          Link Messenger chưa được thiết lập trong trang quản trị.
        </p>
      )}
    </section>
  );
}