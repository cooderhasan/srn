/** Sipariş kaynağı (Order.source) için ekranda gösterilen adlar */
export const ORDER_SOURCE_LABELS: Record<string, string> = {
    WEB: "Site",
    TRENDYOL: "Trendyol",
    N11: "N11",
    HEPSIBURADA: "Hepsiburada",
};

/** Ciroya katılmayan sipariş durumları: iptal, ödemesi tamamlanmamış ve tamamı iade edilmiş */
export const NON_REVENUE_STATUSES = ["CANCELLED", "WAITING_FOR_PAYMENT", "RETURNED"] as const;
