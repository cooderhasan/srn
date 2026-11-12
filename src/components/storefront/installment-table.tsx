"use client";

import { useEffect, useRef } from "react";

interface InstallmentTableProps {
    price: number;
    /** PayTR Mağaza No (sunucudaki PAYTR_MERCHANT_ID) */
    merchantId?: string;
    /** PayTR panelindeki taksit tablosu kodunun token'ı (PAYTR_INSTALLMENT_TOKEN) */
    token?: string;
}

/**
 * PayTR taksit tablosu: oranlar mağazaya özel, PayTR'den mağaza no + taksit tablosu token'ı ile çekilir.
 * Önceden koda Bardakçı'nın mağaza bilgileri sabit yazılıydı; Serin'de Bardakçı'nın oranları görünüyordu.
 * Bilgiler tanımlı değilse tablo yerine bilgi notu gösterilir.
 */
export function InstallmentTable({ price, merchantId, token }: InstallmentTableProps) {
    if (!merchantId || !token) {
        return (
            <p className="text-sm text-gray-500 text-center py-4">
                Taksit seçenekleri ödeme adımında kartınıza göre gösterilir.
            </p>
        );
    }
    return <PayTRInstallmentTable price={price} merchantId={merchantId} token={token} />;
}

function PayTRInstallmentTable({ price, merchantId, token }: { price: number; merchantId: string; token: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    // Fiyatı PayTR'nin beklediği formata çevir (örn: 1881.38)
    const formattedPrice = price.toFixed(2);

    useEffect(() => {
        const containerId = "paytr_taksit_tablosu";

        // Önceki script varsa kaldır
        if (scriptRef.current) {
            scriptRef.current.remove();
            scriptRef.current = null;
        }

        // Konteyneri temizle
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = "";

        // Yeni script ekle
        const script = document.createElement("script");
        script.src = `https://www.paytr.com/odeme/taksit-tablosu/v2?token=${encodeURIComponent(token)}&merchant_id=${encodeURIComponent(merchantId)}&amount=${formattedPrice}&taksit=0&tumu=0`;
        script.async = true;
        document.body.appendChild(script);
        scriptRef.current = script;

        return () => {
            if (scriptRef.current) {
                scriptRef.current.remove();
                scriptRef.current = null;
            }
        };
    }, [formattedPrice, merchantId, token]);

    return (
        <>
            <style>{`
                #paytr_taksit_tablosu {
                    clear: both;
                    font-size: 12px;
                    max-width: 100%;
                    text-align: center;
                    font-family: Arial, sans-serif;
                }
                #paytr_taksit_tablosu::before { display: table; content: ""; }
                #paytr_taksit_tablosu::after { content: ""; clear: both; display: table; }
                .taksit-tablosu-wrapper {
                    margin: 8px;
                    width: 270px;
                    padding: 16px 12px;
                    cursor: default;
                    text-align: center;
                    display: inline-block;
                    border: 1px solid #e1e1e1;
                    border-radius: 12px;
                    box-sizing: border-box;
                    background: #fff;
                }
                .taksit-logo img { max-height: 28px; padding-bottom: 12px; object-fit: contain; }
                .taksit-tutari-text { float: left; width: 50%; color: #888; font-size: 11px; margin-bottom: 8px; box-sizing: border-box; }
                .taksit-tutar-wrapper { display: flex; width: 100%; background-color: #f8f9fa; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
                .taksit-tutar-wrapper:hover { background-color: #e9ecef; }
                .taksit-tutari { flex: 1; padding: 8px 4px; color: #444; border-right: 2px solid #fff; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
                .taksit-tutari:last-child { border-right: none; }
                .taksit-tutari-bold { font-weight: bold; color: #222; }
                @media all and (max-width: 600px) {
                    .taksit-tablosu-wrapper { margin: 5px 0; width: 100%; }
                }
            `}</style>
            <div id="paytr_taksit_tablosu" ref={containerRef} />
        </>
    );
}
