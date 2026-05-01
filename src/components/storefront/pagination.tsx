import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    searchParams: any;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
    // Generate URL for a page
    const createPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        return `${baseUrl}?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            {/* First Page */}
            <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                asChild={currentPage > 1}
            >
                {currentPage > 1 ? (
                    <Link href={createPageUrl(1)}>
                        <ChevronsLeft className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronsLeft className="h-4 w-4" />
                    </span>
                )}
            </Button>

            {/* Previous Page */}
            <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                asChild={currentPage > 1}
            >
                {currentPage > 1 ? (
                    <Link href={createPageUrl(currentPage - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronLeft className="h-4 w-4" />
                    </span>
                )}
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1 mx-2">
                <span className="text-sm font-medium">
                    Sayfa {currentPage} / {totalPages}
                </span>
            </div>

            {/* Next Page */}
            <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                asChild={currentPage < totalPages}
            >
                {currentPage < totalPages ? (
                    <Link href={createPageUrl(currentPage + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronRight className="h-4 w-4" />
                    </span>
                )}
            </Button>

            {/* Last Page */}
            <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                asChild={currentPage < totalPages}
            >
                {currentPage < totalPages ? (
                    <Link href={createPageUrl(totalPages)}>
                        <ChevronsRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronsRight className="h-4 w-4" />
                    </span>
                )}
            </Button>
        </div>
    );
}
