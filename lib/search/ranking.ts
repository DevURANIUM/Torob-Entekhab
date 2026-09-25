import { Phone, SearchIntent, Priority, keys, labels } from '../domain';
import { profileWeights } from '../intelligence/profiles';
export function weights(i:SearchIntent):Record<Priority,number>{const raw=profileWeights(i);const sum=Object.values(raw).reduce((a,b)=>a+b,0);return Object.fromEntries(keys.map(k=>[k,sum?raw[k]/sum:1/keys.length])) as Record<Priority,number>}
export function exclusionReasons(p:Phone,i:SearchIntent){const c=i.constraints;const r:string[]=[];
 if(!p.available)r.push('ناموجود');if(i.budget?.max!==undefined&&p.price>i.budget.max)r.push('بالاتر از سقف بودجه');if(i.budget?.min!==undefined&&p.price<i.budget.min)r.push('پایین‌تر از بازه بودجه');
 if(i.brands.length&&!i.brands.includes(p.brand))r.push('برند خارج از انتخاب');if(i.excludedBrands.includes(p.brand))r.push('برند حذف‌شده');
 const min=(value:number|null,limit:number|undefined,label:string)=>{if(limit!==undefined&&(value===null||value<limit))r.push(value===null?`${label}: داده نامشخص`:`${label}: کمتر از حداقل`)};
 const max=(value:number|null,limit:number|undefined,label:string)=>{if(limit!==undefined&&(value===null||value>limit))r.push(value===null?`${label}: داده نامشخص`:`${label}: بیشتر از حداکثر`)};
 min(p.storage,c.minStorage,'حافظه');min(p.ram,c.minRam,'رم');min(p.battery,c.minBattery,'باتری');min(p.screenSize,c.minScreenSize,'صفحه');max(p.screenSize,c.maxScreenSize,'صفحه');max(p.weight,c.maxWeight,'وزن');min(p.supportYears,c.minSupportYears,'پشتیبانی باقی‌مانده');min(p.charging,c.minCharging,'شارژ');
 if(c.requires5G&&p.has5G!==true)r.push('5G مستند نیست');if(c.requiresNfc&&p.hasNfc!==true)r.push('NFC مستند نیست');if(c.newOnly&&p.variant.condition!=='new')r.push('نو نیست');return r;
}
export function eligible(p:Phone,i:SearchIntent){return exclusionReasons(p,i).length===0}
export function score(p:Phone,i:SearchIntent){const w=weights(i);const contributions=Object.fromEntries(keys.map(k=>[k,p.scores[k]*w[k]])) as Record<Priority,number>;
 const utility=keys.reduce((s,k)=>s+contributions[k],0);const coverage=keys.reduce((s,k)=>s+w[k]*p.intelligence.features[k].coverage,0);
 const uncertaintyPenalty=(1-coverage)*4;const budgetPenalty=i.budget?.max?Math.max(0,p.price/i.budget.max-1)*30:0;
 const total=Math.round((utility-uncertaintyPenalty-budgetPenalty)*10)/10;
 return {product:p,total,utility,coverage,uncertaintyPenalty,budgetPenalty,breakdown:{...p.scores,budgetFit:100-budgetPenalty,useCaseFit:utility},weights:w,contributions};
}
export type Ranked=ReturnType<typeof score>;
export function rank(products:Phone[],i:SearchIntent):Ranked[]{const all=products.filter(p=>eligible(p,i)).map(p=>score(p,i)).sort((a,b)=>b.total-a.total||a.product.price-b.product.price||a.product.id.localeCompare(b.product.id));const seen=new Set<string>();return all.filter(r=>{if(seen.has(r.product.variant.modelId))return false;seen.add(r.product.variant.modelId);return true})}
export function dominates(a:Ranked,b:Ranked){const relevant=keys.filter(k=>b.weights[k]>0);return a.product.price<=b.product.price&&a.coverage>=b.coverage&&relevant.every(k=>a.product.scores[k]>=b.product.scores[k])&&(a.product.price<b.product.price||relevant.some(k=>a.product.scores[k]>b.product.scores[k]))}
export function selectDiverseTopRecommendations(ranked:Ranked[],limit=3){if(!ranked.length)return [];const frontier=ranked.filter(b=>!ranked.some(a=>a!==b&&dominates(a,b)));const selected:Ranked[]=[];
 // Start with the best supported utility; subsequent choices must offer a distinct practical tradeoff.
 const pool=[...frontier];while(pool.length&&selected.length<limit){pool.sort((a,b)=>{
 const merit=(r:Ranked)=>r.total+(selected.length?Math.min(...selected.map(s=>keys.reduce((n,k)=>n+Math.abs(r.product.scores[k]-s.product.scores[k])*r.weights[k],0)))*.18:0)+(selected.length&&r.product.price<selected[0].product.price?2:0);
 return merit(b)-merit(a)||a.product.price-b.product.price});selected.push(pool.shift()!)}return selected;
}
export function explain(r:Ranked){return [...keys].sort((a,b)=>r.contributions[b]-r.contributions[a]).slice(0,3).map(k=>`${labels[k]}: شاخص ${Math.round(r.breakdown[k])}، وزن ${Math.round(r.weights[k]*100)}٪؛ ${r.product.intelligence.features[k].basis}`)}
export function tradeoffs(r:Ranked,all:Ranked[]){return [...keys].map(k=>({key:k,gap:Math.max(...all.map(x=>x.product.scores[k]),r.product.scores[k])-r.product.scores[k]})).filter(x=>x.gap>=8&&r.weights[x.key]>=.05).sort((a,b)=>b.gap-a.gap).slice(0,2).map(x=>`${labels[x.key]} حدود ${Math.round(x.gap)} امتیاز پایین‌تر از یک گزینه دیگر؛ اختلاف تخمینی است.`)}
