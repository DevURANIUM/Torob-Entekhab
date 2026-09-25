import { brands, intentSchema, SearchIntent, Priority } from "../domain";
import { normalize, parseBudget } from "../search/normalize";
const brandWords = [
  "سامسونگ|samsung",
  "شیائومی|xiaomi",
  "آیفون|ایفون|اپل|iphone|apple",
  "ناتینگ|nothing|cmf",
  "موتورولا|motorola",
  "آنر|انر|honor",
 "ردمی|redmi", "پوکو|poco", "گوگل|پیکسل|pixel|google", "وان پلاس|وانپلاس|oneplus",
];
export function extractIntent(
  query: string,
  previous?: SearchIntent,
): SearchIntent {
  const q = normalize(query);
  const result: SearchIntent = structuredClone(
    previous ?? intentSchema.parse({ query }),
  );
  result.action = 'refine';
  result.query = previous ? `${previous.query}؛ ${query}`.slice(-1000) : query;
  const budget = parseBudget(q);
  if (budget) result.budget = budget;
  brands.forEach((brand, i) => {
    const term = brandWords[i];
    if (new RegExp(term).test(q)) {
      if (
        new RegExp(
          `(?:غیر از|به جز|بدون)\\s*(?:${term})|(?:${term})\\s*(?:نمی ?خوام|نباشه|رو حذف کن|را حذف کن)`,
        ).test(q)
      ) {
        result.excludedBrands = Array.from(
          new Set([...result.excludedBrands, brand]),
        );
        result.brands = result.brands.filter((b) => b !== brand);
      } else {
        result.brands = [brand];
        result.excludedBrands = result.excludedBrands.filter(
          (b) => b !== brand,
        );
      }
    }
  });
  if (/همه برند|برند مهم نیست|برندهای دیگه/.test(q)) {
    result.brands = [];
    result.excludedBrands = [];
  }
  const set = (key: Priority, pattern: RegExp) => {
    const m = q.match(pattern);
    if (m) {
      const after = q
        .slice((m.index ?? 0) + m[0].length)
        .split(/ولی|اما|،|,|\./)[0]
        .slice(0, 28);
      result.priorities[key] = /مهم نیست|مهم نیس|اولویت نیست/.test(after)
        ? 0.25
        : 4;
    }
  };
  set("battery", /باتری/);
  set("camera", /دوربین|عکاسی/);
  set("performance", /بازی|پابجی|گیم/);
  set("display", /صفحه|نمایشگر/);
  set("longevity", /چند سال|دوام|بادوام|نگه دار|پشتیبانی/);
  set("portability", /سبک|سبک تر/);
  set("value", /ارزون|ارزان|اقتصادی|ارزش خرید/);
  if (/مامان|مادر|پدر|بابا/.test(q)) {
    result.recipient = /مامان|مادر/.test(q) ? "mother" : "father";
    result.useCases = ["everyday"];
    result.assumptions = ["برای والدین، باتری، خوانایی و دوام نرم‌افزاری را مهم و بازی را کم‌اهمیت فرض کردیم؛ سن یا توانایی را فرض نکردیم. از ویرایش می‌توانی تغییر بدهی."];
    result.priorities.battery ??= 4;
    result.priorities.longevity ??= 6;
    result.priorities.performance ??= .5; result.priorities.display ??= 3; result.priorities.simplicity ??= 3;
  }
  const add = (value: SearchIntent["useCases"][number]) => {
    if (!result.useCases.includes(value)) result.useCases.push(value);
  };
  if (/روزمره/.test(q)) add("everyday");
  if (/بازی|پابجی|گیم/.test(q) && result.priorities.performance !== 0.25)
    add("gaming");
  if (/(?:بازی|گیم).*(?:مهم نیست|بی خیال|بیخیال|فراموش|نمی کنم)|بی خیال.*(?:بازی|گیم)/.test(q))
    {result.useCases = result.useCases.filter((x) => x !== "gaming"); result.priorities.performance=.25;}
  if (/سالمند|کاربری ساده/.test(q)) add('elderly');
  if (/سفر|مسافرت/.test(q)) add('travel');
  if (/کوچک|کوچیک|جمع و جور/.test(q)) {add('compact');result.priorities.portability=6;}
  if (/شبکه اجتماعی|اینستاگرام|تلگرام/.test(q)) add('social_media');
  if (/تولید محتوا|ولاگ/.test(q)) add('content_creator');
  if (/باتری محور|فقط باتری/.test(q)) add('battery_first');
  if (/عکاسی/.test(q)) add("photography");
  if (/دانشجو/.test(q)) {
    add("student");
    result.priorities.value = 4;
  }
  if (/کاری|کسب و کار/.test(q)) add("business");
  if (/چند سال|نگه دار/.test(q)) add("long_term_use");
  if (/صفحه بزرگ|صفحه نمایش بزرگ|نمایشگر بزرگ/.test(q))
    result.constraints.minScreenSize = 6.5;
  const storage = q.match(/(?:حداقل\s*)?(\d+)\s*(?:گیگ(?:ابایت)?)(?!.*رم)/);
  if (storage&&!/رم\s*$/.test(q.slice(0,storage.index))) result.constraints.minStorage = Number(storage[1]);
  const ram = q.match(/(?:رم\s*(\d+)|(\d+)\s*گیگ\s*رم)/);
  if (ram) result.constraints.minRam = Number(ram[1] ?? ram[2]);
  const years = q.match(/(?:حداقل\s*)?(\d+)\s*سال/);
  if (years) {
    result.constraints.minSupportYears = Number(years[1]);
    result.priorities.longevity = 4;
  }
  const weight = q.match(/(?:زیر|حداکثر)\s*(\d+)\s*گرم/);
  if (weight) result.constraints.maxWeight = Number(weight[1]);
  const battery = q.match(/(?:باتری\s*(?:حداقل)?\s*)(\d{4,5})/);
  if (battery) result.constraints.minBattery = Number(battery[1]);
  if (/5g|فایو جی|نسل پنج/.test(q)) result.constraints.requires5G = true;
  if (/nfc/.test(q)) result.constraints.requiresNfc = true;
  if (/ارزون تر|ارزان تر|کمتر خرج|صرفه جویی/.test(q)) {result.action='save';if(previous?.priorities.value!==undefined)result.priorities.value=previous.priorities.value;else delete result.priorities.value;}
  if (/دو.*اول.*مقایسه|مقایسه.*دو.*اول|اولی.*دومی/.test(q)) result.action='compare_first_two';
  if (/حافظه.*بیشتر/.test(q)&&!storage) result.constraints.minStorage=Math.min(1024,(result.constraints.minStorage??128)*2);
  if (/شارژ سریع/.test(q)) result.priorities.charging=5;
  if (/نو باشه|فقط نو|دست دوم نه/.test(q)) result.constraints.newOnly=true;
  const charge=q.match(/(?:شارژ|حداقل)\s*(\d+)\s*وات/);if(charge)result.constraints.minCharging=Number(charge[1]);
  result.warnings = result.brands.some(b=>result.excludedBrands.includes(b))?['برند انتخابی و حذف‌شده متناقض‌اند.']:[];
  if(result.budget?.kind==='soft')result.assumptions=Array.from(new Set([...result.assumptions,'بودجه حدودی است؛ گزینه بالاتر فقط جداگانه و با بهبود معنادار نمایش داده می‌شود.']));
  if(/فریم|fps/.test(q))result.warnings.push('فریم بازی تضمین نمی‌شود؛ بنچمارک یا تست حرارتی این بازی ثبت نشده.');
  if(/شب|تبلیغات نرم افزاری/.test(q))result.warnings.push('کیفیت عکاسی شب یا تجربه تبلیغات نرم‌افزار در داده‌ها اندازه‌گیری نشده است.');
  const flexible=q.match(/حدود\s*(\d+).*تا\s*(\d+)/);if(flexible&&Number(flexible[2])>Number(flexible[1])){const target=Number(flexible[1])*1e6;result.budget={max:target,target,kind:'soft',flexibility:Math.min(.3,Number(flexible[2])/Number(flexible[1])-1)};}
  return intentSchema.parse(result);
}
