import Link from "next/link";
import { FlaskConical, Settings2 } from "lucide-react";

/** Three choices with one picked: the product's idea, as its mark. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect
        x="2"
        y="7"
        width="8"
        height="18"
        rx="2.5"
        fill="currentColor"
        opacity=".28"
      />
      <rect x="12" y="3" width="8" height="26" rx="2.5" fill="var(--brand)" />
      <rect
        x="22"
        y="7"
        width="8"
        height="18"
        rx="2.5"
        fill="currentColor"
        opacity=".28"
      />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="logo" aria-label="ترب انتخاب، صفحه اصلی">
          <Mark />
          <span className="logo__name">
            ترب <b>انتخاب</b>
          </span>
          <span className="logo__tag">نسخه آزمایشی</span>
        </Link>
        <nav aria-label="ناوبری اصلی" className="site-nav">
          <Link href="/">انتخاب گوشی</Link>
          <Link href="/lab" aria-label="آزمایشگاه">
            <FlaskConical size={16} aria-hidden="true" />
            <span className="nav-label">آزمایشگاه</span>
          </Link>
          <Link href="/settings/ai" aria-label="تنظیمات هوش مصنوعی">
            <Settings2 size={16} aria-hidden="true" />
            <span className="nav-label">تنظیمات AI</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
