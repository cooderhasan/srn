"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
    return (
        <Button
            onClick={() => window.print()}
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
        >
            🖨️ Yazdır
        </Button>
    );
}
