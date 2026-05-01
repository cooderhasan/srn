"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markMessageAsRead, deleteMessage } from "@/app/actions/contact";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, CheckCircle, MailOpen } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    isRead: boolean;
    createdAt: Date;
}

export function MessagesTable({ messages }: { messages: ContactMessage[] }) {
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

    const handleMarkAsRead = async (id: string) => {
        const result = await markMessageAsRead(id);
        if (result.success) {
            toast.success("Mesaj okundu olarak işaretlendi");
            if (selectedMessage?.id === id) {
                setSelectedMessage({ ...selectedMessage, isRead: true });
            }
        } else {
            toast.error("İşlem başarısız");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
        const result = await deleteMessage(id);
        if (result.success) {
            toast.success("Mesaj silindi");
            if (selectedMessage?.id === id) {
                setSelectedMessage(null);
            }
        } else {
            toast.error("Silme işlemi başarısız");
        }
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Gönderen</TableHead>
                            <TableHead>Konu</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {messages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    Mesaj bulunmuyor.
                                </TableCell>
                            </TableRow>
                        ) : (
                            messages.map((msg) => (
                                <TableRow
                                    key={msg.id}
                                    className={`cursor-pointer ${!msg.isRead ? "bg-blue-50/50 dark:bg-blue-900/10 font-medium" : ""}`}
                                    onClick={() => {
                                        setSelectedMessage(msg);
                                        if (!msg.isRead) handleMarkAsRead(msg.id);
                                    }}
                                >
                                    <TableCell>
                                        {format(new Date(msg.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                                    </TableCell>
                                    <TableCell>
                                        <div>{msg.name}</div>
                                        <div className="text-sm text-gray-500">{msg.email}</div>
                                    </TableCell>
                                    <TableCell>{msg.subject || "-"}</TableCell>
                                    <TableCell>
                                        {msg.isRead ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200">Okundu</Badge>
                                        ) : (
                                            <Badge variant="default">Yeni</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(msg.id);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Mesaj Detayı</DialogTitle>
                        <DialogDescription>
                            Gönderen: {selectedMessage?.name} ({selectedMessage?.email})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="font-semibold">Tarih:</div>
                            <div className="col-span-3">
                                {selectedMessage && format(new Date(selectedMessage.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                            </div>
                            <div className="font-semibold">Konu:</div>
                            <div className="col-span-3">{selectedMessage?.subject || "-"}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md whitespace-pre-wrap text-sm">
                            {selectedMessage?.message}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
