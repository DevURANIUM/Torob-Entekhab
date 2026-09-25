import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, ScanLine } from "lucide-react";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "ترب انتخاب | انتخاب کمتر، تصمیم بهتر",
  description: "نیازت را بگو؛ سه گوشی مناسب با دلیل، مقایسه و شفافیت.",
  icons: { icon: "/icon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <a href="#main" className="skip">
          رفتن به محتوا
        </a>
        <header className="header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="brand-icon">
                <ScanLine size={26} />
              </span>
              <span>
                ترب <b>انتخاب</b>
              </span>
              <small>نسخه آزمایشی</small>
            </Link>
            <nav aria-label="ناوبری اصلی">
              <Link href="/">انتخاب گوشی</Link>
              <Link href="/lab">
                <FlaskConical size={17} /> آزمایشگاه
              </Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>
            ترب انتخاب <span className="muted"> / تصمیم آگاهانه‌تر</span>
          </span>
          <p>
            قیمت‌ها، مشخصات و امتیازهای این نسخه داده‌های نمایشی هستند؛ منبع
            خرید یا مشخصات تأییدشده نیستند.
          </p>
          <span className="muted">پروژه مستقل؛ بدون وابستگی رسمی به ترب</span>
        </footer>
      </body>
    </html>
  );
}
