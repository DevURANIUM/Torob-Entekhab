import type { Metadata } from "next";
import { loadAiSettings } from "@/lib/ai/settings-store";
import { providerStatus } from "@/lib/ai/provider";
import { settingsLocked } from "@/lib/ai/guard";
import { AiSettingsForm } from "@/components/settings/ai-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تنظیمات هوش مصنوعی | ترب انتخاب" };

export default async function Page() {
  const { source, ...settings } = await loadAiSettings();
  return (
    <div className="wrap settings-page">
      <h1>تنظیمات هوش مصنوعی</h1>
      <p className="muted">
        انتخاب کن کدام سرویس و کدام مدل نیاز کاربر را بفهمد. اگر سرویس اول جواب
        ندهد، بقیه به ترتیب امتحان می‌شوند و در آخر استخراج قاعده‌محور انجام
        می‌شود. کلیدهای API فقط در فایل <bdi dir="ltr">.env</bdi> تنظیم می‌شوند
        و هیچ‌وقت به این صفحه نمی‌آیند.
      </p>
      <AiSettingsForm
        initial={settings}
        source={source}
        providers={providerStatus(settings)}
        locked={settingsLocked()}
        tokenRequired={Boolean(process.env.AI_SETTINGS_TOKEN?.trim())}
      />
    </div>
  );
}
