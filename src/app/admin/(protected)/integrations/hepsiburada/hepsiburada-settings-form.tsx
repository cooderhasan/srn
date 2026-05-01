
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { saveHepsiburadaConfig } from "./actions";
import { toast } from "sonner";
import { useEffect } from "react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
    );
}

interface Props {
    initialData?: any;
}

export function HepsiburadaSettingsForm({ initialData }: Props) {
    const [state, action] = useActionState(saveHepsiburadaConfig, { success: false, message: "" });

    useEffect(() => {
        if (state.message) {
            if (state.success) toast.success(state.message);
            else toast.error(state.message);
        }
    }, [state]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>API Ayarları</CardTitle>
                <CardDescription>
                    Hepsiburada entegrasyonu için Merchant ID ve şifrenizi girin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={action} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Kullanıcı Adı (Genelde Merchant ID)</Label>
                        <Input
                            id="username"
                            name="username"
                            defaultValue={initialData?.username}
                            placeholder="Merchant ID"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Şifre</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            defaultValue={initialData?.password}
                            placeholder="API Şifresi"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="merchantId">Mağaza ID (Opsiyonel / Aynıysa boş bırakın)</Label>
                        <Input
                            id="merchantId"
                            name="merchantId"
                            defaultValue={initialData?.merchantId}
                            placeholder="Mağaza ID"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="isActive"
                            name="isActive"
                            defaultChecked={initialData?.isActive}
                        />
                        <Label htmlFor="isActive">Entegrasyonu Aktifleştir</Label>
                    </div>

                    <SubmitButton />
                </form>
            </CardContent>
        </Card>
    );
}
