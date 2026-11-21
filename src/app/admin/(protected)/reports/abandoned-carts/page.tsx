"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Mail, ShoppingCart, Loader2, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SimplePagination } from "@/components/admin/simple-pagination";
import { getAbandonedCartsAction, sendCartReminderAction } from "./actions";

const PERIODS = [
    { days: 7, label: "7 gün" },
    { days: 30, label: "30 gün" },
    { days: 90, label: "90 gün" },
    { days: 0, label: "Tümü" },
];
const PAGE_SIZE = 25;
const fmtTRY = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);

    const [days, setDays] = useState(30);
    const [page, setPage] = useState(1);
    const listRef = useRef<HTMLDivElement>(null);

    /** silent: listeyi spinner'a çevirmeden yenile (hatırlatma sonrası; sayfa kaymasın). Başarılıysa true döner. */
    const loadCarts = async (period = days, silent = false) => {
        if (!silent) setLoading(true);
        const result = await getAbandonedCartsAction(period).catch(() => null);
        const ok = !!(result?.success && result.carts);
        if (ok) {
            setCarts(result!.carts!);
        } else {
            toast.error(result?.error || "Sepetler yüklenemedi.");
        }
        if (!silent) setLoading(false);
        return ok;
    };

    // Dönem, liste yüklendikten sonra değişir; yüklenemezse eski dönem ve listesi birlikte kalır
    const changePeriod = async (period: number) => {
        if (await loadCarts(period)) {
            setDays(period);
            setPage(1);
        }
    };

    // Sayfa değişince liste kartının başına kaydır (sayfanın en tepesine değil)
    const goToPage = (p: number) => {
        setPage(p);
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        loadCarts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Liste değişip sayfa sayısı azalırsa (ör. hatırlatma sonrası yenileme) geçerli sayfada kal
    const pageCount = Math.max(1, Math.ceil(carts.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageCarts = carts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const summary = {
        total: carts.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
        reminded: carts.filter((c) => c.reminderSentAt).length,
    };
    const periodLabel = days === 0 ? "Tüm zamanlarda" : `Son ${days} günde`;

    const handleSendReminder = async (cartId: string) => {
        setSendingId(cartId);
        toast.info("Hatırlatma e-postası gönderiliyor...");

        const result = await sendCartReminderAction(cartId);

        if (result.success) {
            toast.success(result.message);
            await loadCarts(days, true); // Listeyi sessizce güncelle (spinner yok, sayfa kaymaz)
        } else {
            toast.error(result.error || "Mail gönderilemedi.");
        }
        setSendingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Sepette Bekleyenler
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ürünlerini sepette unutan müşterilerinizi takip edin ve hatırlatma maili gönderin.
                    </p>
                </div>
                <Button onClick={() => loadCarts()} variant="outline" size="sm" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yenile
                </Button>
            </div>

            <Card ref={listRef} className="scroll-mt-20">
                <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle className="text-lg">Sepeti Terk Edenler</CardTitle>
                            <CardDescription>
                                Son 2 saattir dokunulmamış sepetler.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-1 rounded-lg border p-1 shrink-0 self-start">
                            {PERIODS.map((p) => (
                                <Button key={p.days} size="sm" variant={days === p.days ? "default" : "ghost"} disabled={loading} onClick={() => changePeriod(p.days)}>
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    {!loading && carts.length > 0 && (
                        <p className="pt-2 text-sm text-gray-700 dark:text-gray-300">
                            {periodLabel} <span className="font-semibold">{carts.length} sepet</span>
                            {" · "}Toplam <span className="font-semibold text-blue-600">{fmtTRY(summary.total)}</span>
                            {" · "}{summary.reminded} sepete hatırlatma gitti
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : carts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                            <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
                            <p>{days === 0 ? "Şu anda sepette bekleyen bir ürün yok." : `Son ${days} günde sepette bekleyen ürün yok.`}</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Müşteri Bilgisi</TableHead>
                                        <TableHead>İletişim</TableHead>
                                        <TableHead className="text-center">Sepetteki Ürün</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                        <TableHead>Son İşlem</TableHead>
                                        <TableHead className="text-center">Hatırlatma</TableHead>
                                        <TableHead className="text-right">İşlem</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageCarts.map((cart) => {
                                        const customerName = cart.user?.companyName || cart.user?.email || "Bilinmiyor";
                                        const email = cart.user?.email;
                                        const phone = cart.user?.phone;
                                        
                                        const totalItems = cart.items.reduce((acc: number, cur: any) => acc + cur.quantity, 0);
                                        const totalAmount = cart.totalAmount; // sunucuda hesaplanır

                                        return (
                                            <TableRow key={cart.id}>
                                                <TableCell className="font-medium">
                                                    {customerName}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{email}</div>
                                                    {phone && <div className="text-xs text-gray-500">{phone}</div>}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="gap-2 h-8">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                                <Badge variant="secondary">{totalItems} Ürün</Badge>
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Sepet İçeriği - {customerName}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                                                {cart.items.map((item: any) => (
                                                                    <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                                                                        {item.product.images?.[0] ? (
                                                                            <img 
                                                                                src={item.product.images[0]} 
                                                                                alt={item.product.name} 
                                                                                className="w-16 h-16 object-cover rounded-md border"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-16 h-16 bg-gray-100 rounded-md border flex items-center justify-center text-xs text-gray-400">Görsel Yok</div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <h4 className="font-semibold text-sm">{item.product.name}</h4>
                                                                            {item.variant && <p className="text-xs text-gray-500">{item.variant.size} - {item.variant.color}</p>}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-medium text-sm">
                                                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(item.product.salePrice || item.product.listPrice))}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">Adet: {item.quantity}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between items-center pt-4 border-t">
                                                                <span className="font-bold">Toplam Tutar:</span>
                                                                <span className="font-bold text-lg text-blue-600">
                                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}
                                                                </span>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-blue-600">
                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: true, locale: tr })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {cart.reminderSentAt ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge variant="secondary" className="gap-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                {cart.reminderCount}x Gönderildi
                                                            </Badge>
                                                            <span className="text-xs text-gray-400">
                                                                {formatDistanceToNow(new Date(cart.reminderSentAt), { addSuffix: true, locale: tr })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-400">Gönderilmedi</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant={cart.reminderSentAt ? "outline" : "default"}
                                                        size="sm"
                                                        onClick={() => handleSendReminder(cart.id)}
                                                        disabled={sendingId === cart.id || !email}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        {sendingId === cart.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Mail className="mr-2 h-4 w-4" />
                                                        )}
                                                        {cart.reminderSentAt ? "Tekrar Gönder" : "Hatırlat"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {!loading && (
                        <SimplePagination
                            page={currentPage}
                            pageSize={PAGE_SIZE}
                            total={carts.length}
                            onPageChange={goToPage}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
