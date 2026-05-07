"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, User, Clock, Package, Send, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { answerTrendyolQuestion } from "@/app/admin/(protected)/integrations/trendyol/actions";

interface Question {
    id: number;
    text: string;
    customerName: string;
    creationDate: number;
    status: "WAITING_FOR_ANSWER" | "ANSWERED" | "REJECTED" | "UNANSWERED";
    productMainId: string;
    productName: string;
    imageUrl?: string;
    answered: boolean;
}

interface TrendyolQuestionsListProps {
    initialQuestions: any;
}

export function TrendyolQuestionsList({ initialQuestions }: TrendyolQuestionsListProps) {
    const [questions, setQuestions] = useState<Question[]>(initialQuestions?.content || []);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswer = async (questionId: number) => {
        if (replyText.length < 10) {
            toast.error("Cevap en az 10 karakter olmalıdır.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await answerTrendyolQuestion(questionId, replyText);
            if (result.success) {
                toast.success("Cevabınız başarıyla gönderildi.");
                setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status: "ANSWERED", answered: true } : q));
                setReplyingTo(null);
                setReplyText("");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "WAITING_FOR_ANSWER":
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Cevap Bekliyor</Badge>;
            case "ANSWERED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Cevaplandı</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Reddedildi</Badge>;
            case "UNANSWERED":
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cevaplanmadı</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Soru Bulunamadı</h3>
                <p className="text-sm text-gray-500 mt-1">Trendyol üzerinden gelen herhangi bir müşteri sorusu bulunmuyor.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {questions.map((question) => (
                <div key={question.id} className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="p-5 flex flex-col md:flex-row gap-6">
                        {/* Question Info */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                        {question.customerName?.[0] || <User className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                                            {question.customerName}
                                            {getStatusBadge(question.status)}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(question.creationDate), "d MMMM yyyy HH:mm", { locale: tr })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-lg p-4 text-gray-800 text-sm leading-relaxed border border-gray-100 italic">
                                "{question.text}"
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50/50 p-2 rounded border border-blue-100/50">
                                <Package className="w-3 h-3 text-blue-500" />
                                <span className="font-medium">Ürün:</span>
                                <span className="truncate max-w-[300px]">{question.productName}</span>
                                <span className="text-gray-400">({question.productMainId})</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="md:w-64 flex flex-col justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                            {question.status === "WAITING_FOR_ANSWER" ? (
                                <Button 
                                    onClick={() => setReplyingTo(replyingTo === question.id ? null : question.id)}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    {replyingTo === question.id ? "Vazgeç" : "Cevapla"}
                                </Button>
                            ) : (
                                <div className="text-center p-3">
                                    {question.status === "ANSWERED" ? (
                                        <div className="flex flex-col items-center gap-1 text-green-600">
                                            <CheckCircle2 className="w-6 h-6" />
                                            <span className="text-xs font-medium">Cevaplandı</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-400">
                                            <AlertCircle className="w-6 h-6" />
                                            <span className="text-xs font-medium">İşlem Yapılamaz</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reply Section */}
                    {replyingTo === question.id && (
                        <div className="p-5 bg-orange-50/30 border-t border-orange-100 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-orange-800">Cevabınız</label>
                                    <span className="text-[10px] text-orange-600/70">En az 10 karakter</span>
                                </div>
                                <Textarea 
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Müşteriye yanıtınızı buraya yazın..."
                                    className="min-h-[100px] bg-white border-orange-200 focus:ring-orange-500 focus:border-orange-500"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setReplyingTo(null)}
                                        disabled={isSubmitting}
                                    >
                                        İptal
                                    </Button>
                                    <Button 
                                        onClick={() => handleAnswer(question.id)}
                                        disabled={isSubmitting || replyText.length < 10}
                                        className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            "Gönder"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
