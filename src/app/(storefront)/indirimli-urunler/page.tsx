import ProductsPage from "../products/page";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
    title: "İndirimli Ürünler | Serin Motor",
    description: "En uygun fiyatlı motosiklet yedek parça ve fırsat ürünleri.",
    alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://serinmotor.com"}/indirimli-urunler`
    }
};

export default async function DiscountedProductsPage({ searchParams }: PageProps) {
    const params = await searchParams;

    // Inject is_on_sale=true into searchParams
    const newSearchParams = Promise.resolve({
        ...params,
        is_on_sale: "true"
    });

    return <ProductsPage searchParams={newSearchParams as any} />;
}
