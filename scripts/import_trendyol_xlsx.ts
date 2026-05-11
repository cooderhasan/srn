
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

const filePath = 'Ürünleriniz_11.05.2026-12.42.xlsx';

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/ /g, '-')
        .replace(/[ığüşöçİ]/g, (m) => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'i' }[m] || m))
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function main() {
    if (!fs.existsSync(filePath)) {
        console.error('File not found!');
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`🚀 Toplam ${rows.length} Trendyol ürünü işleniyor...`);

    // Default category for unknown ones
    let defaultCat = await prisma.category.findUnique({ where: { slug: 'motosiklet-yedek-parca' } });
    if (!defaultCat) {
        defaultCat = await prisma.category.create({
            data: {
                name: 'Motosiklet Yedek Parça',
                slug: 'motosiklet-yedek-parca'
            }
        });
    }

    let successCount = 0;
    let errorCount = 0;
    let updateCount = 0;

    for (const row of rows) {
        try {
            let sku = String(row['Tedarikçi Stok Kodu'] || '').trim();
            const modelKodu = String(row['Model Kodu'] || '').trim();
            
            // SKU boşsa Model Kodu'nu kullan
            if (!sku && modelKodu) {
                sku = modelKodu;
            }

            const barcode = String(row['Barkod'] || '').trim();
            const name = String(row['Ürün Adı'] || '').trim();
            const description = String(row['Ürün Açıklaması'] || '').trim();
            const brandName = String(row['Marka'] || 'Diğer').trim();
            const trendyolPrice = Number(row["Trendyol'da Satılacak Fiyat (KDV Dahil)"]) || 0;
            const listPrice = Number(row['Piyasa Satış Fiyatı (KDV Dahil)']) || trendyolPrice;
            const stock = Number(row['Ürün Stok Adedi']) || 0;
            const catName = String(row['Kategori İsmi'] || 'Genel').trim();
            
            // Extract Trendyol ID from link if possible
            const link = String(row['Trendyol.com Linki'] || '');
            const trendyolIdMatch = link.match(/-p-(\d+)/);
            const trendyolId = trendyolIdMatch ? trendyolIdMatch[1] : null;

            // Extract images
            const images = [];
            for (let i = 1; i <= 8; i++) {
                const imgUrl = row[`Görsel ${i}`];
                if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                    images.push(imgUrl);
                }
            }

            if (!sku) continue;

            // 1. Markayı bul veya oluştur
            const normalizedBrandName = brandName.trim();
            let brand = await prisma.brand.findFirst({ 
                where: { name: { equals: normalizedBrandName, mode: 'insensitive' } } 
            });

            if (!brand) {
                const baseSlug = slugify(normalizedBrandName);
                brand = await prisma.brand.create({
                    data: {
                        name: normalizedBrandName,
                        slug: `${baseSlug}-${Math.floor(Math.random() * 1000)}`,
                        isActive: true
                    }
                });
            }

            // 2. Kategoriyi bul veya oluştur
            let category = await prisma.category.findFirst({
                where: { name: { equals: catName, mode: 'insensitive' } }
            });
            if (!category) {
                category = await prisma.category.create({
                    data: {
                        name: catName,
                        slug: slugify(catName) + '-' + Math.floor(Math.random() * 100),
                        parentId: defaultCat.id
                    }
                });
            }

            // 3. Ürünü bul, güncelle veya oluştur
            const existingProduct = await prisma.product.findUnique({ where: { sku: sku } });

            if (existingProduct) {
                // Sadece Trendyol bilgilerini güncelle
                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        isTrendyolActive: true,
                        trendyolPrice: trendyolPrice,
                        // Eğer açıklaması veya görselleri yoksa doldur
                        description: existingProduct.description || description,
                        images: existingProduct.images.length === 0 ? images : existingProduct.images,
                    }
                });
                updateCount++;
            } else {
                // Yeni ürün oluştur
                await prisma.product.create({
                    data: {
                        name: name,
                        slug: `${slugify(name)}-${sku.toLowerCase()}`,
                        sku: sku,
                        barcode: barcode,
                        brandId: brand.id,
                        description: description,
                        listPrice: listPrice,
                        salePrice: trendyolPrice,
                        trendyolPrice: trendyolPrice,
                        stock: stock,
                        images: images,
                        isActive: true,
                        isTrendyolActive: true,
                        categories: {
                            connect: { id: category.id }
                        }
                    }
                });
                successCount++;
            }

            // 4. TrendyolProduct tablosunu güncelle
            const product = await prisma.product.findUnique({ where: { sku: sku } });
            if (product) {
                const finalBarcode = product.barcode || barcode;
                if (finalBarcode) {
                    await (prisma as any).trendyolProduct.upsert({
                        where: { productId: product.id },
                        update: {
                            barcode: finalBarcode,
                            trendyolId: trendyolId,
                            isSynced: true,
                            lastSyncedAt: new Date()
                        },
                        create: {
                            productId: product.id,
                            barcode: finalBarcode,
                            trendyolId: trendyolId,
                            isSynced: true,
                            lastSyncedAt: new Date()
                        }
                    });
                }
            }

            if ((successCount + updateCount) % 50 === 0) {
                console.log(`✅ ${successCount + updateCount} ürün tamamlandı...`);
            }

        } catch (err: any) {
            console.error(`❌ Hata (SKU: ${row['Tedarikçi Stok Kodu']}):`, err.message);
            errorCount++;
        }
    }

    console.log(`\n🎉 İşlem Tamamlandı!`);
    console.log(`✅ Yeni Eklenen: ${successCount}`);
    console.log(`🔄 Güncellenen (Eşleşen): ${updateCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
