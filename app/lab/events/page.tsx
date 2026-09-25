import { db } from "@/lib/db";
import Link from "next/link";
import { number } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default async function Page() {
  const events = await db.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="wrap lab">
      <Link href="/lab">← آزمایشگاه</Link>
      <h1>رویدادها و بازخوردها</h1>
      <p>۱۰۰ رویداد اخیر در دیتابیس محلی</p>
      <div className="table-scroll panel">
        <table>
          <thead>
            <tr>
              <th>رویداد</th>
              <th>مقدار</th>
              <th>زمان</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <bdi>{e.name}</bdi>
                </td>
                <td>{e.value ?? "—"}</td>
                <td>{e.createdAt.toLocaleString("fa-IR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && <p>{number(0)} رویداد؛ از یک جست‌وجو شروع کن.</p>}
      </div>
    </div>
  );
}
