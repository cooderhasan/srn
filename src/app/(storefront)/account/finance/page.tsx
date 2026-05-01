import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

async function getFinanceData(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            creditLimit: true,
            transactions: {
                orderBy: { createdAt: "desc" },
                take: 50, // Son 50 işlem
            }
        }
    });

    if (!user) return null;

    const totalDebit = user.transactions
        .filter(t => t.type === "DEBIT")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalCredit = user.transactions
        .filter(t => t.type === "CREDIT")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const currentDebt = totalDebit - totalCredit;
    const availableLimit = Number(user.creditLimit) - currentDebt;

    return {
        creditLimit: Number(user.creditLimit),
        currentDebt,
        availableLimit,
        transactions: user.transactions
    };
}

export default async function FinancePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login?callbackUrl=/account/finance");
    }

    const data = await getFinanceData(session.user.id);

    if (!data) {
        return <div>Veri bulunamadı.</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold mb-2">Finans / Bakiye Durumu</h1>
                <p className="text-gray-500">
                    Cari hesap durumunuzu ve son işlemlerinizi buradan takip edebilirsiniz.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gray-50 dark:bg-gray-900 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Kredi Limiti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(data.creditLimit)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-500">Güncel Borç</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatPrice(data.currentDebt)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/10 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-500">Kullanılabilir Limit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(data.availableLimit)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Hesap Hareketleri</h2>
                <div className="border rounded-lg bg-white dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>İşlem Türü</TableHead>
                                <TableHead>Açıklama</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        Henüz işlem kaydı bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="font-medium text-xs text-gray-500">
                                            {formatDate(transaction.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {transaction.type === "DEBIT" ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700 border-red-200">
                                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                                        Borç
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700 border-green-200">
                                                        <ArrowDownLeft className="w-3 h-3 mr-1" />
                                                        Alacak
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-gray-500 uppercase">{transaction.processType}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{transaction.description || "-"}</span>
                                                {transaction.documentNo && (
                                                    <span className="text-xs text-gray-500">Belge No: {transaction.documentNo}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono font-medium ${transaction.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                                            {transaction.type === "DEBIT" ? "-" : "+"}{formatPrice(Number(transaction.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
