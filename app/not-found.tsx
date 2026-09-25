import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap empty">
      <h1>این صفحه پیدا نشد.</h1>
      <Link className="primary" href="/">
        بازگشت به انتخاب گوشی
      </Link>
    </div>
  );
}
