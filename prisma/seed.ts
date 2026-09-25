import { PrismaClient, Prisma } from '@prisma/client';
import { dataset } from '../lib/data/catalog';
const db=new PrismaClient();const json=(v:unknown)=>v as Prisma.InputJsonValue;
async function main(){await db.$transaction(async tx=>{
 for(const m of dataset.models)await tx.phoneModel.upsert({where:{id:m.id},create:{id:m.id,data:json(m)},update:{data:json(m)}});
 for(const v of dataset.variants)await tx.phoneVariant.upsert({where:{id:v.id},create:{id:v.id,modelId:v.modelId,data:json(v)},update:{modelId:v.modelId,data:json(v)}});
 for(const p of dataset.prices){const value={variantId:p.variantId,amount:p.amount,observedAt:new Date(p.observedAt),isDemo:p.isDemo,data:json(p)};await tx.priceSnapshot.upsert({where:{id:p.id},create:{id:p.id,...value},update:value});}
 },{timeout:30000});console.log(`Seeded ${dataset.models.length} models, ${dataset.variants.length} variants, ${dataset.prices.length} demo price snapshots. Legacy products retained, not served.`)}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
