import { test, expect } from "@playwright/test";
test("complete decision journey", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("چه گوشی‌ای به زندگی تو می‌خوره؟")
    .fill("برای خودم گوشی تا ۲۵ میلیون میخوام، باتری خوب و صفحه بزرگ");
  await page.getByRole("button", { name: "پیشنهاد بده", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "چرا اینو پیشنهاد دادی؟" })
    .first()
    .click();
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.locator("dialog")).toContainText("وزن:");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "سامسونگ ترجیح میدم", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(page.locator(".product-brand").first()).toContainText("Samsung");
  await page
    .getByRole("button", { name: "اگه بیشتر هزینه کنم چی گیرم میاد؟" })
    .click();
  await expect(page.locator(".upgrade-result")).toBeVisible();
  await page.locator(".card-actions input").nth(0).check();
  await page.locator(".card-actions input").nth(1).check();
  await page.getByRole("link", { name: "مقایسه انتخاب‌ها" }).click();
  await expect(
    page.getByRole("heading", { name: "برای نیاز تو کدوم بهتره؟" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.locator(".card-actions a").first().click();
  await expect(
    page.getByRole("heading", { name: "مشخصات کامل" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "این گوشی رو انتخاب می‌کنم" }).click();
  await expect(
    page.getByRole("button", { name: "به انتخاب‌های من اضافه شد ✓" }),
  ).toBeVisible();
  await page.goto("/lab");
  await expect(
    page.getByText("Intent Accuracy", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "اجرای مسیر جست‌وجو" }).click();
  await expect(page.locator(".debug-columns")).toBeVisible();
  await page.screenshot({ path: "test-results/lab.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("validation, nonsense, telemetry and feedback", async ({
  page,
  request,
}) => {
  const invalid = await request.post("/api/search", {
    data: { query: "a".repeat(1001) },
  });
  expect(invalid.status()).toBe(400);
  const malformed = await request.post("/api/search", {
    data: "{",
    headers: { "Content-Type": "application/json" },
  });
  expect(malformed.status()).toBe(400);
  await page.goto(
    "/search?q=" + encodeURIComponent("سبزتر از دیروز با طعم موسیقی"),
  );
  await expect(page.locator(".empty")).toContainText("متوجه نشدم");
  await page.goto("/search?q=" + encodeURIComponent("باتری تا ۲۵ میلیون"));
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.getByRole("button", { name: "آره", exact: true }).click();
  await expect(page.locator(".feedback")).toContainText("بازخوردت ثبت شد");
  await page.goto("/lab/events");
  await expect(page.locator("table")).toContainText("positive");
});
test("impossible query and editable budget", async ({ page }) => {
  await page.goto("/search?q=" + encodeURIComponent("آیفون نو تا ۵ میلیون"));
  await expect(page.locator(".empty")).toContainText("گزینه‌ای پیدا نکردم");
  await page.getByLabel("بودجه تا (میلیون)").fill("80");
  await page.getByLabel("بودجه تا (میلیون)").press("Tab");
  await expect(page.locator(".product-card")).toHaveCount(3);
});
for (const width of [375, 768, 1440])
  test(`responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto(
      "/search?q=" + encodeURIComponent("برای بازی تا ۳۵ میلیون"),
    );
    await expect(page.locator(".product-card")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/search-${width}.png`,
      fullPage: true,
    });
  });
