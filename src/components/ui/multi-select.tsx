
"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "cmdk";
import { Command as CommandPrimitive } from "cmdk";

type Framework = Record<"value" | "label", string>;

interface MultiSelectProps {
    options: { label: string; value: string }[];
    selected: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item));
    };

    const selectedOptions = selected
        .map((id) => options.find((opt) => opt.value === id))
        .filter((opt): opt is { label: string; value: string } => !!opt);

    // Filter options based on input value if not handled by Command natively in this specific setup
    // Note: cmdk generally handles filtering, but let's be safe.

    const selectables = options.filter((option) => !selected.includes(option.value));

    return (
        <div className="relative">
            <Command className={`overflow-visible bg-transparent ${className}`}>
                <div
                    className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                    onClick={() => setOpen(true)}
                >
                    <div className="flex gap-1 flex-wrap">
                        {selectedOptions.map((framework) => (
                            <Badge key={framework.value} variant="secondary">
                                {framework.label}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUnselect(framework.value);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleUnselect(framework.value)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        ))}
                        {/* Avoid having the command input hidden behind badges if many are selected */}
                        <CommandPrimitive.Input
                            placeholder={placeholder}
                            value={inputValue}
                            onValueChange={setInputValue}
                            onBlur={() => setOpen(false)}
                            onFocus={() => setOpen(true)}
                            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[120px]"
                        />
                    </div>
                </div>
                <div className="relative mt-2">
                    {open && selectables.length > 0 ? (
                        <div className="absolute top-0 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                            <CommandList className="h-full overflow-auto max-h-60 p-1">
                                <CommandGroup heading={selectables.length === 0 ? "No results found." : "Suggestions"}>
                                    {selectables.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            onSelect={() => {
                                                onChange([...selected, option.value]);
                                                setInputValue("");
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                            }}
                                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                            value={option.label}
                                        >
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </div>
                    ) : null}
                </div>
            </Command>
        </div>
    );
}
