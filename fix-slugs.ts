import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function main() {
    console.log("=== SİMÜLASYON (DRY RUN) BAŞLADI ===");
    console.log("Sistemde hiçbir veri değiştirilmiyor. Sadece neler değişeceğini kontrol ediyoruz.\n");
    
    // Aktif ve pasif tüm ürünleri al
    const products = await prisma.product.findMany({
        select: { id: true, name: true, slug: true }
    });
    
    let brokenCount = 0;
    
    for (const product of products) {
        const expectedBase = generateSlug(product.name);
        
        // Mevcut slug'daki son eki (import sırasında eklenen -lq2x... gibi rastgele kısımları) gözetmeksizin ana kelimelere bakalım.
        // Genelde "-12345" gibi son ekler var. 
        // Basitçe: Eğer beklenen slug ile mevcut slug'ın ilk 10 karakteri bile uyuşmuyorsa, bu büyük ihtimalle bozuktur.
        // Veya "k-n-i" gibi bariz kayıplar varsa..
        
        let currentPure = product.slug;
        // Eğer slug '-' ile ayrılmış rastgele bir son ek içeriyorsa bunu atalım:
        const parts = product.slug.split('-');
        if (parts.length > 1 && parts[parts.length - 1].length < 10 && !isNaN(parseInt(parts[parts.length - 1], 36))) {
            currentPure = parts.slice(0, -1).join('-');
        }
        
        // Sadece beklenen base'in içinde geçip geçmediğine veya beklenen halinden çok kısa olup olmadığına bakalım
        if (currentPure !== expectedBase && currentPure.length < expectedBase.length - 3) {
             if (brokenCount < 10) {
                 console.log(`Bozuk ürün bulundu:`);
                 console.log(`İsim:        ${product.name}`);
                 console.log(`Eski Slug:   ${product.slug}`);
                 console.log(`Yeni olacak: ${expectedBase}-${Date.now().toString(36).slice(-5)}\n`);
             }
             brokenCount++;
        }
    }
    
    console.log(`\nToplam ${products.length} ürün tarandı.`);
    console.log(`Toplamda DÜZELTİLECEK (bozuk) URL sayısı: ${brokenCount}`);
    console.log("\nEğer bu değişikliklerin doğru olduğunu düşünüyorsanız, bir sonraki aşamada veritabanını güncelleyebiliriz.");
    console.log("=== TEST BİTTİ ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
