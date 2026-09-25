import { Priority, SearchIntent, keys } from '../domain';
export type Profile = {label:string; weights:Partial<Record<Priority,number>>};
export const profiles:Record<SearchIntent['useCases'][number],Profile>={
 everyday:{label:'روزمره',weights:{battery:3,performance:2,value:3,simplicity:2}},
 gaming:{label:'بازی',weights:{performance:10,display:3,battery:2,charging:2}},
 photography:{label:'عکاسی',weights:{camera:10,storage:3,display:2}},
 social_media:{label:'شبکه‌های اجتماعی',weights:{camera:4,battery:3,display:3}},
 student:{label:'دانشجو',weights:{value:5,battery:4,storage:3,longevity:2}},
 elderly:{label:'کاربری ساده',weights:{simplicity:5,display:3,battery:4,portability:2}},
 long_term_use:{label:'نگهداری طولانی',weights:{longevity:7,performance:3,storage:3,battery:2}},
 business:{label:'کاری',weights:{longevity:4,connectivity:4,battery:3,performance:2}},
 content_creator:{label:'تولید محتوا',weights:{camera:8,performance:4,storage:5,display:3}},
 travel:{label:'سفر',weights:{battery:5,connectivity:4,camera:3,portability:3}},
 battery_first:{label:'باتری‌محور',weights:{battery:10,charging:4}},
 compact:{label:'جمع‌وجور',weights:{portability:10,performance:2}},
};
export function profileWeights(i:SearchIntent){return Object.fromEntries(keys.map(k=>[k,i.priorities[k]??(i.useCases.length?i.useCases.reduce((s,p)=>s+(profiles[p].weights[k]??1),0)/i.useCases.length:1)])) as Record<Priority,number>}
