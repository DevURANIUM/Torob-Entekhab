import { Phone, keys, Priority } from '../domain';
import { PhoneModel, PhoneVariant, PriceSnapshot, validateDataset } from './schema';
import { deriveFeatures } from '../intelligence/features';
import { profiles } from '../intelligence/profiles';
import data from './catalog-data.json';
export const dataset=validateDataset(data);
export function composePhone(m:PhoneModel,v:PhoneVariant,p:PriceSnapshot):Phone{
 const f=m.facts;const intelligence=deriveFeatures(m,v,p.amount);
 const scores=Object.fromEntries(keys.map(k=>[k,intelligence.features[k].value])) as Record<Priority,number>;
 const useCases=Object.fromEntries(Object.entries(profiles).map(([k,profile])=>{const entries=Object.entries(profile.weights) as [Priority,number][];return [k,Math.round(entries.reduce((s,[key,w])=>s+scores[key]*w,0)/entries.reduce((s,[,w])=>s+w,0))]})) as Phone['useCases'];
 return {id:v.id,slug:v.id,modelData:m,variant:v,priceSnapshot:p,intelligence,brand:m.brand,model:m.name,displayName:`${m.brand} ${m.name}`,price:p.amount,originalPrice:p.amount,releaseYear:m.year,storage:v.storageGb,ram:v.ramGb,screenSize:f.screenSizeInches,screenType:f.panel,refreshRate:f.refreshRateHz,resolution:f.resolution,battery:f.batteryMah,charging:f.wiredChargingW,chipset:f.chipset,cpuTier:Math.round(scores.performance/10),gpuTier:Math.round(scores.performance/10),cameraMp:f.mainCameraMp,ultrawide:f.ultrawideMp===null?null:true,telephoto:f.telephotoMp===null?null:true,scores,buildScore:50,weight:f.weightGrams,dimensions:f.dimensions,has5G:f.has5G,hasNfc:f.nfc,dualSim:f.sim===null?null:/dual|\+/.test(f.sim),os:f.launchOs,supportYears:intelligence.remainingSecurityYears,warranty:'شرایط فروشنده و رجیستری بررسی شود',available:true,pros:[f.chipset?`تراشه ${f.chipset}`:'تراشه ثبت نشده',f.ois?'لرزش‌گیر اپتیکال مستند':'کیفیت دوربین تست مستقل ندارد'],cons:intelligence.warnings,tags:[m.brand,...(f.weightGrams!==null&&f.weightGrams<=180?['lightweight']:[]),...(f.screenSizeInches!==null&&f.screenSizeInches<=6.3?['compact']:[]),...(f.screenSizeInches!==null&&f.screenSizeInches>=6.7?['large-screen']:[]),...(f.wiredChargingW!==null&&f.wiredChargingW>=60?['fast-charging']:[]),...(f.wirelessChargingW?['wireless-charging']:[]),...(scores.performance>=85?['gaming']:[]),...(intelligence.remainingSecurityYears!==null&&intelligence.remainingSecurityYears>=4?['long-support']:[])],useCases};
}
export function composeCatalog(d:ReturnType<typeof validateDataset>):Phone[]{const models=new Map(d.models.map(m=>[m.id,m]));return d.variants.map(v=>{const p=d.prices.filter(p=>p.variantId===v.id).sort((a,b)=>b.observedAt.localeCompare(a.observedAt))[0];return composePhone(models.get(v.modelId)!,v,p)})}
export const catalog=composeCatalog(dataset);
