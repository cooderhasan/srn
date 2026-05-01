
import { getN11Config } from "./actions";
import { N11SettingsForm } from "./n11-settings-form";
import { N11SyncButton } from "./n11-sync-button";

export default async function N11IntegrationPage() {
    const { data: config } = await getN11Config();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">N11 Entegrasyonu</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <N11SettingsForm initialData={config} />
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold leading-none tracking-tight mb-4">Bilgilendirme</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            N11 API anahtarlarınızı Developer panelinden alabilirsiniz.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                            <li>Ürün Aktarımı (Beta)</li>
                            <li>Stok ve Fiyat Eşitleme (Planlanıyor)</li>
                        </ul>
                    </div>

                    <N11SyncButton />
                </div>
            </div>
        </div>
    );
}
