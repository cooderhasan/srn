
"use client";

import { useActionState } from "react";
import { saveTrendyolConfig, testTrendyolConnection } from "./actions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const initialState = {
    success: false,
    message: "",
};

export function TrendyolSettingsForm({ initialData, options }: { initialData: any, options?: any }) {
    const [state, formAction] = useActionState(saveTrendyolConfig, initialState);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    async function handleTestConnection() {
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await testTrendyolConnection();
            setTestResult(result);
        } catch (e) {
            setTestResult({ success: false, message: "Bağlantı testi hatası" });
        } finally {
            setIsTesting(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>API Bağlantı Ayarları</CardTitle>
                    <CardDescription>
                        Trendyol Partner panelinden alacağınız API bilgilerini giriniz.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                name="isActive"
                                defaultChecked={initialData?.isActive ?? false}
                            />
                            <Label htmlFor="isActive">Entegrasyonu Aktifleştir</Label>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="supplierId">Satıcı ID (Supplier ID)</Label>
                            <Input
                                id="supplierId"
                                name="supplierId"
                                placeholder="Örn: 123456"
                                defaultValue={initialData?.supplierId || ""}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                name="apiKey"
                                type="password"
                                placeholder="Trendyol API Key"
                                defaultValue={initialData?.apiKey || ""}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="apiSecret">API Secret</Label>
                            <Input
                                id="apiSecret"
                                name="apiSecret"
                                type="password"
                                placeholder="Trendyol API Secret"
                                defaultValue={initialData?.apiSecret || ""}
                                required
                            />
                        </div>

                        {options && options.providers && options.providers.length > 0 && (
                            <div className="grid gap-2 pt-4 border-t">
                                <Label htmlFor="cargoCompanyId">Varsayılan Kargo Firması</Label>
                                <select 
                                    id="cargoCompanyId" 
                                    name="cargoCompanyId"
                                    defaultValue={initialData?.cargoCompanyId || ""}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="" disabled>Seçiniz</option>
                                    {options.providers.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {options && options.addresses && options.addresses.length > 0 && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="shipmentAddressId">Varsayılan Sevkiyat Adresi</Label>
                                    <select 
                                        id="shipmentAddressId" 
                                        name="shipmentAddressId"
                                        defaultValue={initialData?.shipmentAddressId || ""}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    >
                                        <option value="" disabled>Seçiniz</option>
                                        {options.addresses.filter(a => a.addressTypes?.includes("Shipment")).map(a => (
                                            <option key={a.id} value={a.id}>{a.addressName} - {a.fullAddress.substring(0, 40)}...</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="returningAddressId">Varsayılan İade Adresi</Label>
                                    <select 
                                        id="returningAddressId" 
                                        name="returningAddressId"
                                        defaultValue={initialData?.returningAddressId || ""}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    >
                                        <option value="" disabled>Seçiniz</option>
                                        {options.addresses.filter(a => a.addressTypes?.includes("Returning")).map(a => (
                                            <option key={a.id} value={a.id}>{a.addressName} - {a.fullAddress.substring(0, 40)}...</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}


                        <div className="flex items-center gap-4 pt-4">
                            <SubmitButton />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                            >
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Bağlantıyı Test Et
                            </Button>
                        </div>

                        {state.message && (
                            <Alert variant={state.success ? "default" : "destructive"} className={state.success ? "bg-green-50 text-green-800 border-green-200" : ""}>
                                {state.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <AlertTitle>{state.success ? "Başarılı" : "Hata"}</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}

                        {testResult && (
                            <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
                                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <AlertTitle>Bağlantı Testi</AlertTitle>
                                <AlertDescription>{testResult.message}</AlertDescription>
                            </Alert>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function SubmitButton() {
    // import { useFormStatus } from "react-dom"; // Add inside if separate component, or use here
    // But since it's same file, simple button is okay but nicer with status
    return (
        <Button type="submit">Ayarları Kaydet</Button>
    )
}
