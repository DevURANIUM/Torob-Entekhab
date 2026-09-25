import { PrismaClient } from '@prisma/client';
import { Phone } from './domain';
import { composeCatalog } from './data/catalog';
import { validateDataset } from './data/schema';
const globalDb=globalThis as unknown as {prisma?:PrismaClient};
export const db=globalDb.prisma??new PrismaClient({datasourceUrl:process.env.DATABASE_URL??'file:./demo.db'});
if(process.env.NODE_ENV!=='production')globalDb.prisma=db;
export async function getProducts():Promise<Phone[]>{
 const [models,variants,prices]=await Promise.all([db.phoneModel.findMany(),db.phoneVariant.findMany(),db.priceSnapshot.findMany()]);
 return composeCatalog(validateDataset({models:models.map(m=>m.data),variants:variants.map(v=>v.data),prices:prices.map(p=>p.data)}));
}
