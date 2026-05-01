/**
 * Yurtiçi Kargo Web Servis Entegrasyonu
 * SOAP/XML tabanlı ham HTTP istekleri ile
 *
 * Dokümana göre:
 * - Test: http://testwebservices.yurticikargo.com:9090/KOPSWebServices/ShippingOrderDispatcherServices?wsdl
 * - Canlı: http://webservices.yurticikargo.com:8080/KOPSWebServices/ShippingOrderDispatcherServices?wsdl
 *
 * ÖNEMLİ: isTestMode = true olduğu sürece tüm istekler test ortamına gider.
 * Canlı kullanıcı bilgileri alınmadan isTestMode kesinlikle false yapılmamalıdır.
 */

const YK_TEST_URL =
    "http://testwebservices.yurticikargo.com:9090/KOPSWebServices/ShippingOrderDispatcherServices";
const YK_LIVE_URL =
    "http://webservices.yurticikargo.com:8080/KOPSWebServices/ShippingOrderDispatcherServices";

// Test credentials (dokümandan)
const YK_TEST_USERNAME = "YKTEST";
const YK_TEST_PASSWORD = "YK";

export interface YKCredentials {
    username: string;
    password: string;
    customerCode?: string | null;
    unitCode?: string | null;
    demandNo?: string | null;
    isTestMode: boolean;
}

export interface YKShipmentInput {
    cargoKey: string;        // max 20 karakter, tekil (orderNumber kullanılır)
    invoiceKey: string;      // max 20 karakter, tekil
    receiverCustName: string; // min 2 karakter, min 2 harf
    receiverAddress: string;  // min 10, max 200 karakter (şehir/ilçe hariç)
    cityName: string;         // İl adı
    townName: string;         // İlçe adı
    receiverPhone1: string;   // 10 hane (alan koduyla, başında 0 olmadan)
    emailAddress?: string;    // Alıcı email
    cargoCount?: number;      // Kargo adedi
    description?: string;     // Açıklama
}

export interface YKShipmentResult {
    success: boolean;
    outFlag: string;          // 0: başarılı, 1: hatalı, 2: beklenmeyen
    outResult: string;
    jobId?: number;
    cargoKey?: string;
    errCode?: number;
    errMessage?: string;
}

export interface YKQueryResult {
    success: boolean;
    outFlag: string;
    operationCode?: number;
    operationStatus?: string;  // NOP | IND | ISR | CNL | ISC | DLV | BI
    operationMessage?: string;
    docId?: string;
    trackingUrl?: string;
    deliveryDate?: string;
    errCode?: number;
    errMessage?: string;
}

export interface YKCancelResult {
    success: boolean;
    outFlag: string;
    operationCode?: number;
    operationStatus?: string;  // CNL | IND | DLV | ISC vb.
    operationMessage?: string;
    errCode?: number;
    errMessage?: string;
}

function getEndpointUrl(isTestMode: boolean): string {
    // GÜVENLİK: Test modu aktifken daima test URL kullan
    return isTestMode ? YK_TEST_URL : YK_LIVE_URL;
}

function getCredentials(creds: YKCredentials) {
    // GÜVENLİK: Test modunda test credential'larını kullan
    if (creds.isTestMode) {
        return { username: YK_TEST_USERNAME, password: YK_TEST_PASSWORD };
    }
    return { username: creds.username, password: creds.password };
}

/**
 * Ham SOAP XML isteği gönderir ve XML yanıtı döndürür
 */
async function sendSoapRequest(
    url: string,
    soapBody: string
): Promise<string> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ship="http://yurticikargo.com.tr/ShippingOrderDispatcherServices">
   <soapenv:Header/>
   <soapenv:Body>
      ${soapBody}
   </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "",
        },
        body: envelope,
    });

    const text = await response.text();
    return text;
}

/**
 * XML'den basit değer çekme (regex tabanlı - küçük SOAP yanıtları için yeterli)
 */
function extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Gönderi Oluşturma - createShipment
 * Yurtiçi Kargo sistemine yeni kargo kaydı gönderir.
 * 
 * ÖNEMLİ: isTestMode = true iken test ortamına gönderilir.
 * Canlı kullanıcı bilgileri gelmeden isTestMode kesinlikle false yapılmamalıdır.
 */
export async function createYKShipment(
    input: YKShipmentInput,
    creds: YKCredentials
): Promise<YKShipmentResult> {
    const url = getEndpointUrl(creds.isTestMode);
    const { username, password } = getCredentials(creds);

    // cargoKey max 20 karakter zorunluluğu
    const cargoKey = input.cargoKey.slice(0, 20);
    const invoiceKey = input.invoiceKey.slice(0, 20);

    // Telefon normalizasyonu: 10 hane, alan koduyla, başında 0 olmadan
    const phone = normalizePhone(input.receiverPhone1);

    // Adres: min 10, max 200 karakter
    const address = input.receiverAddress.slice(0, 200);

    const body = `<ship:createShipment>
         <wsUserName>${username}</wsUserName>
         <wsPassword>${password}</wsPassword>
         <userLanguage>TR</userLanguage>
         <ShippingOrderVO>
            <cargoKey>${escapeXml(cargoKey)}</cargoKey>
            <invoiceKey>${escapeXml(invoiceKey)}</invoiceKey>
            <receiverCustName>${escapeXml(input.receiverCustName)}</receiverCustName>
            <receiverAddress>${escapeXml(address)}</receiverAddress>
            <cityName>${escapeXml(input.cityName)}</cityName>
            <townName>${escapeXml(input.townName)}</townName>
            <receiverPhone1>${escapeXml(phone)}</receiverPhone1>
            ${input.emailAddress ? `<emailAddress>${escapeXml(input.emailAddress)}</emailAddress>` : "<emailAddress/>"}
            <cargoCount>${input.cargoCount ?? 1}</cargoCount>
            ${input.description ? `<description>${escapeXml(input.description)}</description>` : "<description/>"}
            <dcCreditRule/>
            <dcSelectedCredit/>
            <ttDocumentId/>
         </ShippingOrderVO>
      </ship:createShipment>`;

    try {
        const responseXml = await sendSoapRequest(url, body);

        const outFlag = extractXmlValue(responseXml, "outFlag") ?? "2";
        const outResult = extractXmlValue(responseXml, "outResult") ?? "";
        const jobId = extractXmlValue(responseXml, "jobId");
        const errCode = extractXmlValue(responseXml, "errCode");
        const errMessage = extractXmlValue(responseXml, "errMessage");

        return {
            success: outFlag === "0",
            outFlag,
            outResult,
            jobId: jobId ? parseInt(jobId) : undefined,
            cargoKey,
            errCode: errCode ? parseInt(errCode) : undefined,
            errMessage: errMessage || undefined,
        };
    } catch (error) {
        console.error("[YK] createShipment error:", error);
        return {
            success: false,
            outFlag: "2",
            outResult: "Bağlantı hatası",
            errMessage: error instanceof Error ? error.message : "Beklenmeyen hata",
        };
    }
}

/**
 * Gönderi İptal - cancelShipment
 * Henüz düzenlenmemiş gönderileri iptal eder.
 */
export async function cancelYKShipment(
    cargoKey: string,
    creds: YKCredentials
): Promise<YKCancelResult> {
    const url = getEndpointUrl(creds.isTestMode);
    const { username, password } = getCredentials(creds);

    const body = `<ship:cancelShipment>
         <wsUserName>${username}</wsUserName>
         <wsPassword>${password}</wsPassword>
         <userLanguage>TR</userLanguage>
         <cargoKeys>${escapeXml(cargoKey)}</cargoKeys>
      </ship:cancelShipment>`;

    try {
        const responseXml = await sendSoapRequest(url, body);

        const outFlag = extractXmlValue(responseXml, "outFlag") ?? "2";
        const outResult = extractXmlValue(responseXml, "outResult") ?? "";
        const operationCode = extractXmlValue(responseXml, "operationCode");
        const operationStatus = extractXmlValue(responseXml, "operationStatus");
        const operationMessage = extractXmlValue(responseXml, "operationMessage");
        const errCode = extractXmlValue(responseXml, "errCode");
        const errMessage = extractXmlValue(responseXml, "errMessage");

        return {
            success: outFlag === "0",
            outFlag,
            operationCode: operationCode ? parseInt(operationCode) : undefined,
            operationStatus: operationStatus || undefined,
            operationMessage: operationMessage || undefined,
            errCode: errCode ? parseInt(errCode) : undefined,
            errMessage: errMessage || undefined,
        };
    } catch (error) {
        console.error("[YK] cancelShipment error:", error);
        return {
            success: false,
            outFlag: "2",
            errMessage: error instanceof Error ? error.message : "Beklenmeyen hata",
        };
    }
}

/**
 * Gönderi Raporu - queryShipment
 * Kargo durumunu sorgular ve takip bilgilerini döndürür.
 * 
 * NOT: 1 dakika içinde tekrarlı sorgular YK tarafında hata fırlatmaktadır.
 */
export async function queryYKShipment(
    cargoKey: string,
    creds: YKCredentials
): Promise<YKQueryResult> {
    const url = getEndpointUrl(creds.isTestMode);
    const { username, password } = getCredentials(creds);

    const body = `<ship:queryShipment>
         <wsUserName>${username}</wsUserName>
         <wsPassword>${password}</wsPassword>
         <wsLanguage>TR</wsLanguage>
         <keys>${escapeXml(cargoKey)}</keys>
         <keyType>0</keyType>
         <addHistoricalData>false</addHistoricalData>
         <onlyTracking>false</onlyTracking>
      </ship:queryShipment>`;

    try {
        const responseXml = await sendSoapRequest(url, body);

        const outFlag = extractXmlValue(responseXml, "outFlag") ?? "2";
        const outResult = extractXmlValue(responseXml, "outResult") ?? "";
        const operationCode = extractXmlValue(responseXml, "operationCode");
        const operationStatus = extractXmlValue(responseXml, "operationStatus");
        const operationMessage = extractXmlValue(responseXml, "operationMessage");
        const docId = extractXmlValue(responseXml, "docId");
        const trackingUrl = extractXmlValue(responseXml, "trackingUrl");
        const deliveryDate = extractXmlValue(responseXml, "deliveryDate");
        const errCode = extractXmlValue(responseXml, "errCode");
        const errMessage = extractXmlValue(responseXml, "errMessage");

        return {
            success: outFlag === "0",
            outFlag,
            operationCode: operationCode ? parseInt(operationCode) : undefined,
            operationStatus: operationStatus || undefined,
            operationMessage: operationMessage || undefined,
            docId: docId || undefined,
            trackingUrl: trackingUrl || undefined,
            deliveryDate: deliveryDate || undefined,
            errCode: errCode ? parseInt(errCode) : undefined,
            errMessage: errMessage || undefined,
        };
    } catch (error) {
        console.error("[YK] queryShipment error:", error);
        return {
            success: false,
            outFlag: "2",
            errMessage: error instanceof Error ? error.message : "Beklenmeyen hata",
        };
    }
}

/**
 * YK operationStatus → Türkçe etiket
 */
export function getYKStatusLabel(status: string | null | undefined): string {
    const map: Record<string, string> = {
        NOP: "İşlem Görmemiş",
        IND: "Kargo Teslimatta",
        ISR: "Fatura Kesilmedi",
        CNL: "İptal Edildi",
        ISC: "Önceden İptal",
        DLV: "Teslim Edildi",
        BI: "Fatura İptal",
    };
    return status ? (map[status] ?? status) : "Bilinmiyor";
}

/**
 * YK operationStatus → renk sınıfı
 */
export function getYKStatusColor(status: string | null | undefined): string {
    const map: Record<string, string> = {
        NOP: "bg-gray-100 text-gray-700",
        IND: "bg-blue-100 text-blue-700",
        ISR: "bg-yellow-100 text-yellow-700",
        CNL: "bg-red-100 text-red-700",
        ISC: "bg-red-50 text-red-500",
        DLV: "bg-green-100 text-green-700",
        BI: "bg-orange-100 text-orange-700",
    };
    return status ? (map[status] ?? "bg-gray-100 text-gray-700") : "bg-gray-100 text-gray-700";
}

// ==================== Yardımcılar ====================

/**
 * Telefon normalizasyonu:
 * Gelen: 0212 365 24 26, +90 212 365 24 26, 212 365 24 26 vb.
 * Çıkan: 2123652426 (10 hane, başında 0 yok, boşluk yok)
 */
export function normalizePhone(phone: string): string {
    // Sadece rakam bırak
    let digits = phone.replace(/\D/g, "");
    // Başında 90 varsa sil
    if (digits.startsWith("90") && digits.length === 12) {
        digits = digits.slice(2);
    }
    // Başında 0 varsa sil
    if (digits.startsWith("0") && digits.length === 11) {
        digits = digits.slice(1);
    }
    return digits;
}

/**
 * XML özel karakterlerini escape eder
 */
export function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
