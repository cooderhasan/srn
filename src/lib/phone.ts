/**
 * Türkiye cep/sabit telefon biçimi.
 * 0 ile başlarsa "0555 585 07 46" (11 hane), 0'sız yazılırsa "555 585 07 46" (10 hane).
 * Önceden kalıp hep 0'lı numaraya göreydi; 0'sız yazan müşteride "5555 850 74 6" çıkıyordu.
 */
export function formatPhoneInput(raw: string): string {
    let digits = String(raw || "").replace(/\D/g, "");
    // "+90 555 ..." yapıştırılırsa ülke kodu atılır
    if (digits.length >= 12 && digits.startsWith("90")) digits = digits.substring(2);
    const lead = digits.startsWith("0") ? 1 : 0;
    const val = digits.substring(0, 10 + lead);
    const parts = [
        val.substring(0, 3 + lead),
        val.substring(3 + lead, 6 + lead),
        val.substring(6 + lead, 8 + lead),
        val.substring(8 + lead, 10 + lead),
    ].filter(Boolean);
    return parts.join(" ");
}

/** Kayıtlı numarayı gösterim için biçimler (+90 / 90 öneki atılır); tanınmayan numara olduğu gibi döner */
export function formatPhoneDisplay(raw?: string | null): string {
    if (!raw) return "";
    let digits = String(raw).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("90")) digits = digits.substring(2);
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith("0"))) return formatPhoneInput(digits);
    return String(raw).trim();
}
