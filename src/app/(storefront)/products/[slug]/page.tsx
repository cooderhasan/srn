import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/storefront/product-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { Metadata } from "next";
import { getProductReviews, getReviewStats } from "@/app/actions/review";

interface ProductPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { slug } = await params;
    const product = await prisma.product.findUnique({
        where: { slug, isActive: true },
        select: { name: true, description: true, images: true }
    });

    if (!product) return { title: "Ürün Bulunamadı" };

    const description = product.description?.replace(/<[^>]*>?/gm, "").slice(0, 160) || `${product.name} uygun fiyat ve taksit seçenekleriyle Serin Motor'da.`;

    return {
        title: `${product.name} | Serin Motor`,
        description,
        openGraph: {
            title: product.name,
            description,
            images: product.images || [],
        },
        alternates: {
            canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://serinmotor.com"}/products/${slug}`
        }
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const session = await auth();
    const settings = await getSiteSettings();
    const discountRate = session?.user?.discountRate || 0;
    const isDealer =
        (session?.user?.role === "DEALER" && session?.user?.status === "APPROVED") ||
        session?.user?.role === "ADMIN" ||
        session?.user?.role === "OPERATOR";
    const isAuthenticated = !!session?.user;

    const product = await prisma.product.findUnique({
        where: { slug, isActive: true },
        include: {
            category: {
                include: {
                    parent: {
                        include: {
                            parent: true
                        }
                    }
                }
            },
            brand: true,
            variants: {
                where: { isActive: true },
            },
        },
    });

    if (!product) {
        notFound();
    }

    console.log("Product slug:", slug);
    console.log("Product origin from DB:", product.origin);
    console.log("Product variants count:", product.variants.length);

    // Get related products
    const relatedProducts = await prisma.product.findMany({
        where: {
            isActive: true,
            categoryId: product.categoryId,
            id: { not: product.id },
        },
        include: { category: true, brand: true },
        take: 6,
    });

    const reviews = await getProductReviews(product.id);
    const reviewStats = await getReviewStats(product.id);

    // Serialize product with variants
    const serializedProduct = {
        ...product,
        listPrice: Number(product.listPrice),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        weight: product.weight ? Number(product.weight) : null,
        width: product.width ? Number(product.width) : null,
        height: product.height ? Number(product.height) : null,
        length: product.length ? Number(product.length) : null,
        desi: product.desi ? Number(product.desi) : null,
        googlePrice: (product as any).googlePrice ? Number((product as any).googlePrice) : null,
        gtin: (product as any).gtin || null,
        mpn: (product as any).mpn || null,
        origin: product.origin,
        variants: product.variants.map(v => ({
            id: v.id,
            color: v.color,
            size: v.size,
            stock: v.stock,
            sku: v.sku,
            barcode: v.barcode,
            priceAdjustment: Number(v.priceAdjustment),
        })),
    };

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        image: product.images,
        description: product.description?.replace(/<[^>]*>?/gm, "") || product.name, // Strip HTML
        sku: product.sku,
        mpn: product.sku,
        brand: {
            "@type": "Brand",
            name: product.brand?.name || "Serin Motor",
        },
        offers: {
            "@type": "Offer",
            url: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
            priceCurrency: "TRY",
            price: Number(product.listPrice),
            priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
            itemCondition: "https://schema.org/NewCondition",
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: {
                "@type": "Organization",
                name: "Serin Motor",
            },
        },
    };

    return (
        <>
            <JsonLd data={schema} />
            <ProductDetail
                product={serializedProduct}
                relatedProducts={relatedProducts.map(p => ({
                    ...p,
                    listPrice: Number(p.listPrice),
                    salePrice: p.salePrice ? Number(p.salePrice) : null,
                    weight: p.weight ? Number(p.weight) : null,
                    width: p.width ? Number(p.width) : null,
                    height: p.height ? Number(p.height) : null,
                    length: p.length ? Number(p.length) : null,
                    desi: p.desi ? Number(p.desi) : null,
                    googlePrice: (p as any).googlePrice ? Number((p as any).googlePrice) : null,
                    origin: p.origin,
                }))}
                discountRate={discountRate}
                isDealer={isDealer}
                isAuthenticated={isAuthenticated}
                whatsappNumber={settings.whatsappNumber || settings.phone}
                reviews={reviews.map(r => ({
                    ...r,
                    user: {
                        name: r.user.companyName || r.user.email || "Misafir",
                        image: null
                    }
                }))}
                reviewStats={reviewStats}
            />
        </>
    );
}

