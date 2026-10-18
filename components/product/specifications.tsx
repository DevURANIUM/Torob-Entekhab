import { Phone } from "@/lib/domain";
import { specGroups, factLabels, factValue } from "@/lib/specifications";
export function Specifications({ product: p }: { product: Phone }) {
  return (
    <section className="panel specifications">
      <h2>مشخصات کامل</h2>
      <p className="muted">
        بازار مرجع: {p.modelData.region}. فقط مشخصات مستندِ سازنده نمایش داده
        می‌شوند.
      </p>
      {Object.entries(specGroups).map(([group, fields]) => (
        <details key={group}>
          <summary>{group}</summary>
          <dl className="spec-grid">
            {fields.filter((k) => p.modelData.facts[k] !== null).map((k) => (
              <div key={k}>
                <dt>{factLabels[k]}</dt>
                <dd>
                  <bdi>{factValue(p.modelData.facts[k])}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
      <details>
        <summary>منبع مشخصات</summary>
        <p>
          مشخصات سازنده، امتیاز مشتق‌شده و قیمت سه لایه جدا هستند.{" "}
          {p.torob ? "قیمت و تصویر از ترب گرفته شده‌اند." : "قیمت نمونه برای دمو است."}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>فیلد</th>
                <th>منبع</th>
                <th>تأیید</th>
                <th>اطمینان</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.modelData.provenance).map(([k, v]) => (
                <tr key={k}>
                  <td>{factLabels[k as keyof typeof factLabels] ?? k}</td>
                  <td>
                    <a href={v.sourceUrl} target="_blank" rel="noreferrer">
                      {new URL(v.sourceUrl).hostname}
                    </a>
                    <small>{v.note}</small>
                  </td>
                  <td>{v.verifiedAt.slice(0, 10)}</td>
                  <td>{v.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
