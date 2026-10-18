import { priceSource } from "@/lib/data/catalog";

export function SiteFooter() {
  const live = priceSource() === "torob";
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>
          ترب انتخاب <span className="muted"> / تصمیم آگاهانه‌تر</span>
        </span>
        <p>
          مشخصات با منبع ثبت شده‌اند؛ امتیازها تخمینی و قیمت‌ها{" "}
          {live ? (
            <>
              از{" "}
              <a href="https://torob.com" target="_blank" rel="noreferrer">
                ترب
              </a>{" "}
              هستند.
            </>
          ) : (
            "نمونه برای دمو هستند."
          )}
        </p>
        <span className="muted">پروژه مستقل؛ بدون وابستگی رسمی به ترب</span>
      </div>
    </footer>
  );
}
