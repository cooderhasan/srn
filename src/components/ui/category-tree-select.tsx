"use client";

import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, X, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryOption {
    id: string;
    name: string;
    parentId: string | null;
}

interface CategoryTreeSelectProps {
    options: CategoryOption[];
    selected: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function CategoryTreeSelect({
    options,
    selected,
    onChange,
    placeholder = "Kategori seçin...",
}: CategoryTreeSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeLevel1, setActiveLevel1] = useState<string | null>(null);
    const [activeLevel2, setActiveLevel2] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Level 1: En üst kategoriler (parentId yok veya parent options içinde değil)
    const level1Categories = useMemo(() => {
        const ids = new Set(options.map((o) => o.id));
        return options.filter((o) => !o.parentId || !ids.has(o.parentId));
    }, [options]);

    // Level 2: Seçili ana kategorinin çocukları
    const level2Categories = useMemo(() => {
        if (!activeLevel1) return [];
        return options.filter((o) => o.parentId === activeLevel1);
    }, [options, activeLevel1]);

    // Level 3: Seçili 2. seviye kategorinin çocukları
    const level3Categories = useMemo(() => {
        if (!activeLevel2) return [];
        return options.filter((o) => o.parentId === activeLevel2);
    }, [options, activeLevel2]);

    const hasChildren = (id: string) => options.some((o) => o.parentId === id);

    // Arama sonuçları - tüm seviyelerde ara
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lq = searchQuery.toLowerCase();
        return options.filter((c) => c.name.toLowerCase().includes(lq));
    }, [options, searchQuery]);

    const selectedNames = useMemo(() => {
        return selected.map((id) => options.find((o) => o.id === id)?.name || id);
    }, [selected, options]);

    const toggleSelect = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter((s) => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const handleRemove = (id: string) => {
        onChange(selected.filter((s) => s !== id));
    };

    const renderItem = (cat: CategoryOption, level: number = 0) => {
        const isSelected = selected.includes(cat.id);
        const hasSubs = hasChildren(cat.id);
        return (
            <div
                key={cat.id}
                className={`flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-sm cursor-pointer transition-colors ${
                    (level === 0 && activeLevel1 === cat.id) || (level === 1 && activeLevel2 === cat.id)
                        ? "bg-accent"
                        : ""
                }`}
                onClick={() => {
                    toggleSelect(cat.id);
                    if (level === 0) {
                        setActiveLevel1(cat.id);
                        setActiveLevel2(null);
                    } else if (level === 1) {
                        setActiveLevel2(cat.id);
                    }
                }}
            >
                <div
                    className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-input"
                    }`}
                >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm flex-1">{cat.name}</span>
                {hasSubs && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
            </div>
        );
    };

    // Breadcrumb: hangi seviyedeyiz
    const activePath = useMemo(() => {
        const parts = [];
        if (activeLevel1) {
            const l1 = options.find((o) => o.id === activeLevel1);
            if (l1) parts.push(l1.name);
        }
        if (activeLevel2) {
            const l2 = options.find((o) => o.id === activeLevel2);
            if (l2) parts.push(l2.name);
        }
        return parts;
    }, [activeLevel1, activeLevel2, options]);

    return (
        <div className="relative" ref={containerRef}>
            {/* Seçili badges */}
            <div
                className="min-h-10 border border-input rounded-md p-2 flex flex-wrap gap-1 cursor-pointer"
                onClick={() => setOpen(!open)}
            >
                {selectedNames.length === 0 ? (
                    <span className="text-muted-foreground text-sm">{placeholder}</span>
                ) : selectedNames.length <= 3 ? (
                    selectedNames.map((name, idx) => (
                        <Badge key={selected[idx]} variant="secondary" className="gap-1 max-w-[180px]">
                            <span className="truncate">{name}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(selected[idx]);
                                }}
                                className="hover:bg-muted rounded-full flex-shrink-0"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{selectedNames.length} kategori seçildi</Badge>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange([]);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
                    {/* Arama */}
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Kategori ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Breadcrumb navigasyon */}
                    {activePath.length > 0 && !searchQuery && (
                        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b flex items-center gap-1 flex-wrap">
                            <button
                                className="hover:text-foreground transition-colors"
                                onClick={() => { setActiveLevel1(null); setActiveLevel2(null); }}
                            >
                                Tümü
                            </button>
                            {activePath.map((part, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-3 w-3" />
                                    <button
                                        className="hover:text-foreground transition-colors font-medium"
                                        onClick={() => {
                                            if (i === 1) setActiveLevel2(null);
                                        }}
                                    >
                                        {part}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* İçerik */}
                    <ScrollArea className="h-72">
                        <div className="p-1">
                            {searchQuery ? (
                                // Arama sonuçları
                                searchResults.length === 0 ? (
                                    <div className="text-sm text-muted-foreground p-2">Sonuç bulunamadı</div>
                                ) : (
                                    searchResults.map((cat) => (
                                        <div
                                            key={cat.id}
                                            className="flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-sm cursor-pointer"
                                            onClick={() => toggleSelect(cat.id)}
                                        >
                                            <div
                                                className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                                                    selected.includes(cat.id) ? "bg-primary border-primary" : "border-input"
                                                }`}
                                            >
                                                {selected.includes(cat.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <span className="text-sm">{cat.name}</span>
                                        </div>
                                    ))
                                )
                            ) : activeLevel2 ? (
                                // 3. seviye: model kategorileri
                                <>
                                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground mb-1">
                                        {options.find(o => o.id === activeLevel2)?.name} → Model Kategorileri
                                    </div>
                                    {level3Categories.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2 text-center">
                                            Bu kategorinin alt kategorisi yok
                                        </div>
                                    ) : (
                                        level3Categories.map((cat) => renderItem(cat, 2))
                                    )}
                                </>
                            ) : activeLevel1 ? (
                                // 2. seviye: marka/alt kategoriler
                                <>
                                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground mb-1">
                                        {options.find(o => o.id === activeLevel1)?.name} → Alt Kategoriler
                                    </div>
                                    {level2Categories.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2 text-center">
                                            Bu kategorinin alt kategorisi yok
                                        </div>
                                    ) : (
                                        level2Categories.map((cat) => renderItem(cat, 1))
                                    )}
                                </>
                            ) : (
                                // 1. seviye: ana kategoriler
                                <>
                                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground mb-1">
                                        Ana Kategoriler
                                    </div>
                                    {level1Categories.map((cat) => renderItem(cat, 0))}
                                </>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Alt bilgi */}
                    <div className="px-3 py-2 border-t text-xs text-muted-foreground flex justify-between">
                        <span>{selected.length} kategori seçildi</span>
                        {selected.length > 0 && (
                            <button
                                type="button"
                                className="text-destructive hover:underline"
                                onClick={() => onChange([])}
                            >
                                Tümünü temizle
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
