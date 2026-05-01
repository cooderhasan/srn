"use client";

import { useEffect } from "react";

export function AutoPrint() {
    useEffect(() => {
        // Small delay to ensure hydration and styles are ready
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return null;
}
