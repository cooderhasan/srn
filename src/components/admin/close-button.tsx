"use client";

import { X } from "lucide-react";

export function CloseButton() {
    return (
        <button
            onClick={() => window.close()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
            <X className="h-4 w-4" />
            Kapat
        </button>
    );
}
