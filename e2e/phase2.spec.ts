import {test,expect} from '@playwright/test';
test('phase two tools, sources and variants work without console errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/search?q='+encodeURIComponent('برای بازی تا ۴۰ میلیون'));
 await expect(page.locator('.product-card')).toHaveCount(3);
 await page.getByText('چرا فلان مدل نه؟',{exact:true}).click();
 await page.getByLabel('جست‌وجوی مدل').fill('S24 Ultra');
 await page.getByLabel('مدل و نسخه',{exact:true}).selectOption({index:1});
 await expect(page.locator('.decision-tools')).toContainText('بالاتر از سقف بودجه');
 await page.getByText('چی می‌تونه پیشنهاد اول رو عوض کنه؟',{exact:true}).click();
 await expect(page.locator('.decision-tools')).toContainText('سناریوهای تغییر');
 await page.getByText('بودجه و سود انتخاب؛ کجا هزینه بیشتر کم‌اثر می‌شود؟',{exact:true}).click();
 await expect(page.locator('.utility-chart')).toBeVisible();
 await page.getByText('ارزون‌تر هم میشه؟',{exact:true}).click();
 await expect(page.locator('.decision-tools')).toContainText('۹۳٪');
 await page.locator('.card-actions a').first().click();
 await expect(page.locator('.variant-options a')).not.toHaveCount(0);
 await page.getByText('منبع مشخصات',{exact:true}).click();
 await expect(page.locator('.specifications a').first()).toHaveAttribute('href',/^https:\/\//);
 const variants=page.locator('.variant-options a');if(await variants.count()>1){await variants.nth(1).click();await expect(page.locator('.variant-options [aria-current=page]')).toHaveCount(1)}
 await page.goto('/lab');await page.getByText('Data Quality · کیفیت و منابع داده',{exact:true}).click();await expect(page.locator('.lab')).toContainText('۱۶۳');
 await page.getByRole('button',{name:'اجرای مسیر جست‌وجو'}).click();await expect(page.locator('.debug-columns select')).toHaveCount(2);
 expect(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0))).toBe(true);
 expect(errors).toEqual([]);
});
for(const width of [375,768,1440])test(`expanded decision tools remain within ${width}px`,async({page})=>{
 const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:950});
 await page.goto('/search?q='+encodeURIComponent('باتری تا ۴۰ میلیون'));await expect(page.locator('.product-card')).toHaveCount(3);
 for(const summary of await page.locator('.decision-tools summary').all())await summary.click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/phase2-${width}.png`,fullPage:true});
 expect(errors).toEqual([]);
});
