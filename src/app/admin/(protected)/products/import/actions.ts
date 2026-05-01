"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

interface ImportRow {
    "Ürün Adı (Zorunlu)"?: string;
    "Liste Fiyatı (Zorunlu)"?: number;
    "Kategori Slug (Zorunlu)"?: string;
    "Stok Kodu"?: string;
    "Barkod"?: string;
    "Açıklama"?: string;
    "Stok Adedi"?: number;
    "KDV Oranı (%)"?: number;
    "Minimum Sipariş"?: number;
    "Kritik Stok"?: number;
    "Marka Slug"?: string;
    "Menşei"?: string;
    "Öne Çıkan (1/0)"?: number;
    "Yeni Ürün (1/0)"?: number;
    "Çok Satan (1/0)"?: number;
}

interface ParseResult {
    rows: ImportRow[];
    errors: { row: number; message: string }[];
}

interface ImportResult {
    success: boolean;
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
}

function generateSlug(text: string): string {
    if (!text) return "";

    const turkishChars: Record<string, string> = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u',
    };

    return text
        .normalize('NFC')
        .replace(/[çğıöşüÇĞIİÖŞÜ]/g, (char) => turkishChars[char] || char)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function parseExcelFile(formData: FormData): Promise<ParseResult> {
    const file = formData.get("file") as File;

    if (!file) {
        return { rows: [], errors: [{ row: 0, message: "Dosya bulunamadı" }] };
    }

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows: ImportRow[] = XLSX.utils.sheet_to_json(worksheet);
        const errors: { row: number; message: string }[] = [];

        // Validate each row
        rows.forEach((row, index) => {
            const rowNum = index + 2; // Excel rows start at 1, plus header

            if (!row["Ürün Adı (Zorunlu)"]) {
                errors.push({ row: rowNum, message: "Ürün adı zorunludur" });
            }
            if (!row["Liste Fiyatı (Zorunlu)"] || isNaN(Number(row["Liste Fiyatı (Zorunlu)"]))) {
                errors.push({ row: rowNum, message: "Geçerli bir liste fiyatı giriniz" });
            }
            if (!row["Kategori Slug (Zorunlu)"]) {
                errors.push({ row: rowNum, message: "Kategori slug zorunludur" });
            }
        });

        return { rows, errors };
    } catch (error) {
        console.error("Excel parse error:", error);
        return { rows: [], errors: [{ row: 0, message: "Dosya okunamadı" }] };
    }
}

export async function importProducts(formData: FormData): Promise<ImportResult> {
    const file = formData.get("file") as File;

    if (!file) {
        return { success: false, created: 0, updated: 0, errors: [{ row: 0, message: "Dosya bulunamadı" }] };
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ImportRow[] = XLSX.utils.sheet_to_json(worksheet);

    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    // Get all categories and brands for lookup
    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const brands = await prisma.brand.findMany({ select: { id: true, slug: true } });

    const categoryMap = new Map(categories.map(c => [c.slug, c.id]));
    const brandMap = new Map(brands.map(b => [b.slug, b.id]));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
            const name = row["Ürün Adı (Zorunlu)"];
            const listPrice = row["Liste Fiyatı (Zorunlu)"];
            const categorySlug = row["Kategori Slug (Zorunlu)"];

            if (!name || !listPrice || !categorySlug) {
                errors.push({ row: rowNum, message: "Zorunlu alanlar eksik" });
                continue;
            }

            const categoryId = categoryMap.get(categorySlug);
            if (!categoryId) {
                errors.push({ row: rowNum, message: `Kategori bulunamadı: ${categorySlug}` });
                continue;
            }

            const brandSlug = row["Marka Slug"];
            const brandId = brandSlug ? brandMap.get(brandSlug) : null;

            const slug = generateSlug(name) + "-" + Date.now().toString(36);
            const sku = row["Stok Kodu"] || null;

            // Check if product with same SKU exists
            let existingProduct = null;
            if (sku) {
                existingProduct = await prisma.product.findFirst({ where: { sku } });
            }

            const productData = {
                name: name,
                listPrice: Number(listPrice),
                categoryId: categoryId,
                brandId: brandId || null,
                sku: sku,
                barcode: row["Barkod"] || null,
                description: row["Açıklama"] || null,
                stock: row["Stok Adedi"] ?? 0,
                criticalStock: row["Kritik Stok"] ?? 10,
                vatRate: row["KDV Oranı (%)"] ?? 20,
                minQuantity: row["Minimum Sipariş"] ?? 1,
                origin: row["Menşei"] || null,
                isFeatured: row["Öne Çıkan (1/0)"] === 1,
                isNew: row["Yeni Ürün (1/0)"] === 1,
                isBestSeller: row["Çok Satan (1/0)"] === 1,
            };

            if (existingProduct) {
                // Update existing product
                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: productData
                });
                updated++;
            } else {
                // Create new product
                await prisma.product.create({
                    data: {
                        ...productData,
                        slug: slug,
                        images: [],
                        isActive: true,
                    }
                });
                created++;
            }
        } catch (error) {
            console.error(`Row ${rowNum} error:`, error);
            errors.push({ row: rowNum, message: "Kayıt hatası" });
        }
    }

    revalidatePath("/admin/products");

    return {
        success: errors.length === 0,
        created,
        updated,
        errors
    };
}
