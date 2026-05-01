import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { OrderWithItems, SiteSettingsData } from '@/types';
import { formatDate } from '@/lib/helpers';

// Register a font for proper Turkish character support
// Using a standard font that supports Turkish or a google font if needed.
// For simplicity in this environment, we'll try Helvetica (built-in) but it might lack some chars.
// Ideally we register a custom font like Roboto. 
// Since we can't easily download fonts here, we'll stick to standard fonts and hope for best or mapped chars.
// Actually, standard Helvetica often fails with Turkish chars. 
// We will register a font URL (Google Fonts).

Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf'
});

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#111827' // gray-900
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB', // gray-300
        paddingBottom: 20,
    },
    companyInfo: {
        width: '60%',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    companyDetails: {
        fontSize: 9,
        color: '#4B5563', // gray-600
        lineHeight: 1.4,
    },
    invoiceDetails: {
        width: '35%',
        textAlign: 'right',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    label: {
        fontSize: 9,
        color: '#6B7280', // gray-500
        marginBottom: 2,
    },
    value: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    section: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        width: '48%',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#6B7280',
        marginBottom: 6,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    text: {
        marginBottom: 3,
        lineHeight: 1.3,
    },
    table: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6', // gray-100
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    colProduct: { width: '50%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },

    totals: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
        marginBottom: 4,
    },
    totalLabel: {
        color: '#4B5563',
    },
    totalValue: {
        fontWeight: 'bold',
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#000',
    },
    grandTotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    bankInfo: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        color: '#9CA3AF',
        fontSize: 8,
    }
});

// Helper for currency formatting inside PDF
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' ₺';
};

interface InvoicePDFProps {
    order: any; // Using any for now to avoid strict type mapping issues with decimals vs numbers
    settings: any;
}

export const InvoicePDF = ({ order, settings }: InvoicePDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{settings.companyName || 'Firma Adı'}</Text>
                    <Text style={styles.companyDetails}>{settings.address}</Text>
                    <Text style={styles.companyDetails}>{settings.phone}</Text>
                    <Text style={styles.companyDetails}>{settings.email}</Text>
                </View>
                <View style={styles.invoiceDetails}>
                    <Text style={styles.title}>SİPARİŞ FİŞİ</Text>
                    <Text style={styles.label}>SİPARİŞ NO</Text>
                    <Text style={styles.value}>#{order.orderNumber}</Text>
                    <Text style={styles.label}>TARİH</Text>
                    <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
                </View>
            </View>

            {/* Address Section */}
            <View style={styles.section}>
                <View style={styles.column}>
                    <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
                    <Text style={[styles.text, { fontWeight: 'bold' }]}>{order.shippingAddress?.name || order.user?.companyName || order.user?.email || order.guestEmail || 'Misafir'}</Text>
                    <Text style={styles.text}>{order.user?.email || order.guestEmail}</Text>
                    <Text style={styles.text}>{order.user?.phone || '-'}</Text>
                    {/* Fallback address logic */}
                    <Text style={styles.text}>{order.user?.address}</Text>
                    <Text style={styles.text}>{order.user?.district} {order.user?.district && '/'} {order.user?.city}</Text>
                </View>
                <View style={styles.column}>
                    <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
                    {order.shippingAddress ? (
                        <>
                            <Text style={[styles.text, { fontWeight: 'bold' }]}>{order.shippingAddress.title || 'Adres'}</Text>
                            <Text style={styles.text}>{order.shippingAddress.address}</Text>
                            <Text style={styles.text}>{order.shippingAddress.district} / {order.shippingAddress.city}</Text>
                            <Text style={styles.text}>{order.shippingAddress.phone}</Text>
                        </>
                    ) : (
                        <Text style={[styles.text, { fontStyle: 'italic', color: '#9CA3AF' }]}>
                            Müşteri adresi ile aynı.
                        </Text>
                    )}

                    <View style={{ marginTop: 10 }}>
                        <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
                        <Text style={styles.text}>
                            {order.payment?.method === 'BANK_TRANSFER' ? 'Havale / EFT' : 'Kredi Kartı'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Table */}
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.sectionTitle, styles.colProduct, { borderBottomWidth: 0, marginBottom: 0 }]}>Ürün Adı</Text>
                    <Text style={[styles.sectionTitle, styles.colQty, { borderBottomWidth: 0, marginBottom: 0 }]}>Adet</Text>
                    <Text style={[styles.sectionTitle, styles.colPrice, { borderBottomWidth: 0, marginBottom: 0 }]}>Birim Fiyat</Text>
                    <Text style={[styles.sectionTitle, styles.colTotal, { borderBottomWidth: 0, marginBottom: 0 }]}>Toplam</Text>
                </View>
                {order.items.map((item: any, index: number) => (
                    <View key={index} style={styles.tableRow}>
                        <View style={styles.colProduct}>
                            <Text style={{ fontWeight: 'bold' }}>{item.productName}</Text>
                            <Text style={{ fontSize: 8, color: '#6B7280' }}>KDV: %{item.vatRate}</Text>
                        </View>
                        <Text style={styles.colQty}>{item.quantity}</Text>
                        <Text style={styles.colPrice}>{formatCurrency(Number(item.unitPrice))}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(Number(item.lineTotal))}</Text>
                    </View>
                ))}
            </View>

            {/* Totals */}
            <View style={styles.totals}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Ara Toplam:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(Number(order.subtotal))}</Text>
                </View>
                {Number(order.discountAmount) > 0 && (
                    <View style={[styles.totalRow, { color: '#059669' }]}>
                        <Text style={styles.totalLabel}>İskonto:</Text>
                        <Text style={styles.totalValue}>-{formatCurrency(Number(order.discountAmount))}</Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>KDV Toplam:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(Number(order.vatAmount))}</Text>
                </View>
                <View style={styles.grandTotal}>
                    <Text style={[styles.grandTotalValue]}>GENEL TOPLAM:</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(Number(order.total))}</Text>
                </View>
            </View>

            {/* Bank Info */}
            {order.payment?.method === 'BANK_TRANSFER' && (settings.bankIban1 || settings.bankIban2) && (
                <View style={styles.bankInfo}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Ödeme Yapılacak Banka Hesapları</Text>
                    <Text style={{ marginBottom: 4 }}>Sipariş No: #{order.orderNumber}</Text>
                    {settings.bankIban1 && <Text style={{ fontFamily: 'Roboto', fontSize: 9 }}>{settings.bankIban1}</Text>}
                    {settings.bankIban2 && <Text style={{ fontFamily: 'Roboto', fontSize: 9 }}>{settings.bankIban2}</Text>}
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Bu belge bilgilendirme amaçlıdır. Fatura niteliği taşımaz.</Text>
                <Text>Teşekkürler, yine bekleriz.</Text>
            </View>
        </Page>
    </Document>
);
