import { prisma } from "@/lib/db";
import type { OperatorFirmInfo, ProductOperators } from "@/lib/operator-fields";

const pick = (f: { name: string; address: string; email: string } | null | undefined): OperatorFirmInfo | null =>
    f ? { name: f.name, address: f.address, email: f.email } : null;

/** Ürünün markasına tanımlı imalatçı / ithalatçı firmaları (tanımlı değilse null) */
export async function productOperatorsOf(productId: string): Promise<ProductOperators> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { brand: { select: { manufacturerFirm: true, importerFirm: true } } },
    });
    return {
        manufacturer: pick(product?.brand?.manufacturerFirm),
        importer: pick(product?.brand?.importerFirm),
    };
}
