"use server";
import { requireAdmin } from "@/lib/admin-guard";
import { getOperatorReport, startOperatorReport } from "@/lib/trendyol-operator-report";
import { checkSendResults, getSendState, startOperatorSend, type SendMode } from "@/lib/trendyol-operator-send";

/** Trendyol ürün güvenliği bilgisi raporu: sadece okur, Trendyol'a bir şey göndermez */
export async function startOperatorReportAction() {
    await requireAdmin();
    return startOperatorReport();
}

export async function getOperatorReportAction() {
    await requireAdmin();
    return getOperatorReport();
}

/**
 * Gönderim: "dry" hiçbir şey göndermez (kime ne gideceğini listeler), "test" birkaç ilana gönderir,
 * "all" satıştaki tüm eksik / boş ilanlara gönderir.
 */
export async function startOperatorSendAction(mode: SendMode, limit?: number, onlyOnSale = true) {
    await requireAdmin();
    if (!["dry", "test", "all"].includes(mode)) return { started: false, message: "Geçersiz işlem." };
    return startOperatorSend({ mode, limit, onlyOnSale: onlyOnSale !== false });
}

export async function getSendStateAction() {
    await requireAdmin();
    return getSendState();
}

export async function checkSendResultsAction() {
    await requireAdmin();
    return checkSendResults();
}
