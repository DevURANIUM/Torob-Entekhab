"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="wrap empty">
      <h1>دریافت اطلاعات ممکن نشد.</h1>
      <p>لطفاً دوباره تلاش کن.</p>
      <button className="primary" onClick={reset}>
        تلاش دوباره
      </button>
    </div>
  );
}
