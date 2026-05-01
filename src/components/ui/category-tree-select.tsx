"use client";

import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const [activeMainCategory, setActiveMainCategory] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("main");
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    // Get main categories (those whose parent is not in the list - i.e., top-level after filtering Root/Home)
    const mainCategories = useMemo(() => {
        const ids = new Set(options.map((o) => o.id));
        return options.filter((o) => !o.parentId || !ids.has(o.parentId));
    }, [options]);

    // Get subcategories for the active main category
    const subcategories = useMemo(() => {
        if (!activeMainCategory) return [];
        return options.filter((o) => o.parentId === activeMainCategory);
    }, [options, activeMainCategory]);

    // Filter by search
    const filteredMainCategories = useMemo(() => {
        if (!searchQuery) return mainCategories;
        const lq = searchQuery.toLowerCase();
        return mainCategories.filter((c) => c.name.toLowerCase().includes(lq));
    }, [mainCategories, searchQuery]);

    const filteredSubcategories = useMemo(() => {
        if (!searchQuery) return subcategories;
        const lq = searchQuery.toLowerCase();
        return subcategories.filter((c) => c.name.toLowerCase().includes(lq));
    }, [subcategories, searchQuery]);

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

    const renderCategoryItem = (cat: CategoryOption) => {
        const isSelected = selected.includes(cat.id);
        return (
            <div
                key={cat.id}
                className="flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-sm cursor-pointer"
                onClick={() => toggleSelect(cat.id)}
            >
                <div
                    className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-input"
                        }`}
                >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm">{cat.name}</span>
            </div>
        );
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Selected badges & toggle button */}
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
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="main">Ana Kategoriler</TabsTrigger>
                            <TabsTrigger value="sub" disabled={!activeMainCategory}>
                                Alt Kategoriler
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="main" className="m-0">
                            <ScrollArea className="h-64">
                                <div className="p-1">
                                    {filteredMainCategories.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2">
                                            Sonuç bulunamadı
                                        </div>
                                    ) : (
                                        filteredMainCategories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className={`flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-sm cursor-pointer ${activeMainCategory === cat.id ? "bg-accent" : ""
                                                    }`}
                                                onClick={() => {
                                                    toggleSelect(cat.id);
                                                    setActiveMainCategory(cat.id);
                                                    // Auto-switch to subcategories tab if this category has children
                                                    if (options.some((o) => o.parentId === cat.id)) {
                                                        setActiveTab("sub");
                                                        setSearchQuery(""); // Clear search when switching to subcategories
                                                    }
                                                }}
                                            >
                                                <div
                                                    className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${selected.includes(cat.id)
                                                        ? "bg-primary border-primary"
                                                        : "border-input"
                                                        }`}
                                                >
                                                    {selected.includes(cat.id) && (
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-sm flex-1">{cat.name}</span>
                                                {options.some((o) => o.parentId === cat.id) && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Alt kategoriler →
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="sub" className="m-0">
                            <ScrollArea className="h-64">
                                <div className="p-1">
                                    {activeMainCategory && (
                                        <div className="px-3 py-1 text-xs text-muted-foreground border-b mb-1">
                                            {options.find((o) => o.id === activeMainCategory)?.name} alt kategorileri
                                        </div>
                                    )}
                                    {filteredSubcategories.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2">
                                            Alt kategori bulunamadı
                                        </div>
                                    ) : (
                                        filteredSubcategories.map((cat) => renderCategoryItem(cat))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
