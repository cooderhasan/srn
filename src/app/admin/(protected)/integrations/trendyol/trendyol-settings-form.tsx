
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

export function TrendyolSettingsForm({ initialData }: { initialData: any }) {
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
