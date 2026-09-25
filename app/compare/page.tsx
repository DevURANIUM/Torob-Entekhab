import Link from "next/link";
import { getProducts } from "@/lib/db";
import { readIntent, encodeIntent } from "@/lib/state";
import { score } from "@/lib/search/ranking";
import { keys, labels, number, price } from "@/lib/domain";
import {specGroups,factLabels,factValue,meaningfulDifference} from "@/lib/specifications";
import { PhoneArt } from "@/components/phone-art";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; state?: string }>;
}) {
  const [p, products] = await Promise.all([searchParams, getProducts()]);
  const ids = [...new Set((p.ids ?? "").split(","))].slice(0, 3);
  const intent = readIntent(p.state);
  const items = ids.flatMap((id) => {
    const phone = products.find((x) => x.id === id);
    return phone ? [score(phone, intent)] : [];
  });
  const winner = [...items].sort((a, b) => b.total - a.total)[0];
  return (
    <div className="wrap compare-page">
      <Link
        href={`/search?state=${encodeIntent(intent)}&q=${encodeURIComponent(intent.query)}`}
      >
        ← بازگشت به پیشنهادها
      </Link>
      <div className="eyebrow">تفاوت‌هایی که برای تو مهم‌اند</div>
      <h1>برای نیاز تو کدوم بهتره؟</h1>
      {items.length < 2 ? (
        <div className="empty">حداقل دو گوشی را از پیشنهادها انتخاب کن.</div>
      ) : (
        <>
          <p className="notice">
            <bdi>{winner.product.displayName}</bdi> بین این انتخاب‌ها بالاترین
            امتیاز را دارد؛ بیشترین وزن ترجیحات تو مربوط به{" "}
            {[...keys]
              .sort((a, b) => winner.weights[b] - winner.weights[a])
              .slice(0, 2)
              .map((k) => labels[k])
              .join(" و ")}{" "}
            است.
          </p>
          <div className="table-scroll">
            <table>
              <caption>برای تو؛ شاخص‌های مشتق‌شده</caption>
              <thead>
                <tr>
                  <th scope="col">معیار انتخاب</th>
                  {items.map((x) => (
                    <th key={x.product.id} scope="col">
                      <PhoneArt brand={x.product.brand} small />
                      <bdi>{x.product.model}</bdi>
                      <p>{price(x.product.price)}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="winner-row">
                  <th scope="row">برای نیاز تو</th>
                  {items.map((x) => (
                    <td key={x.product.id}>
                      {number(x.total)} / ۱۰۰{" "}
                      {x.product.id === winner.product.id ? "✓" : ""}
                    </td>
                  ))}
                </tr>
                {keys.map((k) => (
                  <tr key={k}>
                    <th scope="row">
                      {labels[k]}
                      <small>وزن {number(winner.weights[k] * 100)}٪</small>
                    </th>
                    {items.map((x) => (
                      <td
                        key={x.product.id}
                        className={
                          Math.max(...items.map(i=>i.breakdown[k]))-Math.min(...items.map(i=>i.breakdown[k]))>=8 && x.breakdown[k] ===
                          Math.max(...items.map((i) => i.breakdown[k]))
                            ? "highlight"
                            : ""
                        }
                      >
                        {number(x.breakdown[k])}
                      </td>
                    ))}
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          <section className="panel specifications"><h2>مشخصات کامل</h2><p>قیمت نمونه برای دمو؛ مزیت عددی فقط با عبور از آستانه معنادار مشخص می‌شود. مگاپیکسل مزیت کیفیت عکس نیست.</p>{Object.entries(specGroups).map(([group,fields])=><details key={group}><summary>{group}</summary><div className="table-scroll"><table><thead><tr><th>مشخصه</th>{items.map(x=><th key={x.product.id}>{x.product.displayName}</th>)}</tr></thead><tbody>{fields.map(k=><tr key={k}><th>{factLabels[k]}</th>{items.map(x=>{const values=items.map(i=>i.product.modelData.facts[k]);const value=x.product.modelData.facts[k];const best=k==='weightGrams'?Math.min(...values as number[]):Math.max(...values as number[]);return <td key={x.product.id} className={meaningfulDifference(k,values)&&value===best?'highlight':''}>{factValue(value)}</td>})}</tr>)}</tbody></table></div></details>)}</section>
        </>
      )}
    </div>
  );
}
