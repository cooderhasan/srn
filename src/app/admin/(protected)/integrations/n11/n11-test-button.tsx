
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { testN11Connection } from "./actions";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export function N11TestButton() {
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        setLoading(true);
        try {
            const result = await testN11Connection();
            if (result.success) {
                toast.success(result.message, {
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                    duration: 5000
                });
            } else {
                toast.error(result.message, {
                    icon: <XCircle className="w-5 h-5 text-red-500" />,
                    duration: 5000
                });
            }
        } catch (error) {
            toast.error("Bağlantı sırasında teknik bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={loading}
            className="w-full border-purple-200 hover:bg-purple-50 text-purple-700 transition-all duration-300 active:scale-95"
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    Test Ediliyor...
                </div>
            ) : (
                "Bağlantıyı Test Et"
            )}
        </Button>
    );
}
