"use client";

import * as React from "react";
import { Search, ChevronDown, Check, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface AttributeValue {
    id: number;
    name: string;
}

interface AttributeSearchableSelectProps {
    attributeId: number;
    attributeName: string;
    required?: boolean;
    allowCustom?: boolean;
    values: AttributeValue[];
    value: number | string | undefined;
    onChange: (value: number | string | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}

const POPULAR_NAMES = [
    "Tek Ebat",
    "Standart",
    "TR",
    "CN",
    "Siyah",
    "Beyaz",
    "Gri",
    "Kırmızı",
    "Mavi",
    "Tamir Edilmez",
    "Görselinde bulunmuyor"
];

export function AttributeSearchableSelect({
    attributeId,
    attributeName,
    required = false,
    allowCustom = false,
    values = [],
    value,
    onChange,
    placeholder = "Seçiniz...",
    disabled = false,
    loading = false
}: AttributeSearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // If there are no predefined values, allow standard text input
    if (!values || values.length === 0) {
        return (
            <Input
                value={typeof value === "string" ? value : (value !== undefined ? String(value) : "")}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || `${attributeName} giriniz...`}
                disabled={disabled}
                className="h-10 text-sm focus-visible:ring-orange-500"
            />
        );
    }

    // Find current selected name
    const selectedItem = values.find((v) => v.id === Number(value));
    const displayText = selectedItem
        ? selectedItem.name
        : typeof value === "string" && value
        ? value
        : "";

    // Separate into popular & other values
    const { popularValues, otherValues } = React.useMemo(() => {
        const popular: AttributeValue[] = [];
        const other: AttributeValue[] = [];

        values.forEach((v) => {
            const isPop = POPULAR_NAMES.some((pop) => 
                v.name.toLowerCase() === pop.toLowerCase()
            );
            if (isPop) {
                popular.push(v);
            } else {
                other.push(v);
            }
        });

        return { popularValues: popular, otherValues: other };
    }, [values]);

    // Filter values based on search
    const filteredPopular = popularValues.filter((v) =>
        v.name.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"))
    );
    const filteredOther = otherValues.filter((v) =>
        v.name.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"))
    );

    const handleSelect = (val: number | string) => {
        onChange(val);
        setOpen(false);
        setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(undefined);
    };

    const isMatchExact = values.some(
        (v) => v.name.toLocaleLowerCase("tr-TR") === searchQuery.trim().toLocaleLowerCase("tr-TR")
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled || loading}
                    className={cn(
                        "w-full justify-between h-10 px-3 text-left font-normal bg-background hover:bg-muted/40 border-input",
                        !displayText && "text-muted-foreground",
                        open && "ring-2 ring-orange-500 border-orange-500"
                    )}
                >
                    <span className="truncate pr-2">
                        {displayText || placeholder || `${attributeName} seçin...`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                        {displayText && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                className="p-0.5 hover:bg-muted rounded text-gray-400 hover:text-gray-700"
                            >
                                <X className="h-3.5 w-3.5" />
                            </span>
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] sm:w-[420px] p-0 shadow-xl border-orange-100 dark:border-orange-950" align="start">
                <div className="flex flex-col max-h-[380px]">
                    <div className="p-2.5 border-b bg-muted/20 sticky top-0 z-10">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`${values.length} seçenek içinde ara...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-xs focus-visible:ring-orange-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Custom value option if enabled or allowed */}
                        {allowCustom && searchQuery.trim() && !isMatchExact && (
                            <div className="pb-1">
                                <button
                                    type="button"
                                    onClick={() => handleSelect(searchQuery.trim())}
                                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-orange-50 text-orange-700 dark:text-orange-400 font-medium transition-colors text-left"
                                >
                                    <span>Özel değer olarak ekle: <strong className="underline font-bold">"{searchQuery.trim()}"</strong></span>
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Popular values section */}
                        {filteredPopular.length > 0 && (
                            <div className="py-1">
                                <div className="px-2 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                                    <span>Önerilen / Popüler Değerler</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 mt-0.5">
                                    {filteredPopular.map((item) => {
                                        const isSelected = Number(value) === item.id;
                                        return (
                                            <button
                                                key={`pop-${item.id}`}
                                                type="button"
                                                onClick={() => handleSelect(item.id)}
                                                className={cn(
                                                    "flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors text-left border",
                                                    isSelected
                                                        ? "bg-orange-500 text-white border-orange-600 font-semibold"
                                                        : "bg-orange-50/50 hover:bg-orange-100/60 dark:bg-orange-950/20 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/40 text-foreground"
                                                )}
                                            >
                                                <span className="truncate pr-1">{item.name}</span>
                                                {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Other values */}
                        <div className="pt-1">
                            {filteredPopular.length > 0 && filteredOther.length > 0 && (
                                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Tüm Değerler
                                </div>
                            )}

                            {filteredOther.length === 0 && filteredPopular.length === 0 ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    {searchQuery ? `"${searchQuery}" ile eşleşen değer bulunamadı.` : "Seçenek bulunmuyor."}
                                    {allowCustom && searchQuery.trim() && (
                                        <div className="mt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs text-orange-600 border-orange-200"
                                                onClick={() => handleSelect(searchQuery.trim())}
                                            >
                                                "{searchQuery.trim()}" Değerini Kullan
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-0.5 max-h-[220px]">
                                    {filteredOther.map((item) => {
                                        const isSelected = Number(value) === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleSelect(item.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left",
                                                    isSelected
                                                        ? "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 font-medium"
                                                        : "hover:bg-muted/70 text-foreground"
                                                )}
                                            >
                                                <span className="truncate pr-2">{item.name}</span>
                                                {isSelected && <Check className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
