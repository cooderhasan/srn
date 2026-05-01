
import { getHepsiburadaConfig } from "./actions";
import { HepsiburadaSettingsForm } from "./hepsiburada-settings-form";
import { HepsiburadaSyncButton } from "./hepsiburada-sync-button";

export default async function HepsiburadaIntegrationPage() {
    const { data: config } = await getHepsiburadaConfig();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-orange-600">Hepsiburada Entegrasyonu</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <HepsiburadaSettingsForm initialData={config} />
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold leading-none tracking-tight mb-4">Bilgilendirme</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Hepsiburada Merchant Portal üzerinden API bilgilerinizi alabilirsiniz.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                            <li>Ürün Listeleme</li>
                            <li>Fiyat ve Stok Güncelleme</li>
                        </ul>
                    </div>

                    <HepsiburadaSyncButton />
                </div>
            </div>
        </div>
    );
}
