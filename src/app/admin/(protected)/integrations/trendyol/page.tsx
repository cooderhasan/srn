
import { getTrendyolConfig } from "./actions";
import { TrendyolSettingsForm } from "./trendyol-settings-form";
import { TrendyolSyncButton } from "./trendyol-sync-button";
import { TrendyolOrderSyncButton } from "./trendyol-order-sync-button";
import { TrendyolDataHelper } from "./trendyol-data-helper";

export default async function TrendyolIntegrationPage() {
    const { data: config } = await getTrendyolConfig();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Trendyol Entegrasyonu</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <TrendyolSettingsForm initialData={config} />
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold leading-none tracking-tight mb-4">Bilgilendirme</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Entegrasyonu kullanabilmek için Trendyol Partner panelinden API bilgilerinizi almanız gerekmektedir.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                            <li>Ürün Aktarımı (Otomatik)</li>
                            <li>Stok ve Fiyat Eşitleme (Otomatik)</li>
                            <li>Sipariş Entegrasyonu (Manuel/Otomatik)</li>
                        </ul>
                    </div>

                    <TrendyolSyncButton />

                    <TrendyolOrderSyncButton />

                    <TrendyolDataHelper isEnabled={!!config} />
                </div>
            </div>
        </div>
    );
}
