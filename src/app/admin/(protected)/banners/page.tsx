import { getBanners } from "./actions";
import { BannersClient } from "@/components/admin/banners-client";

export default async function BannersPage() {
    const banners = await getBanners();

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <BannersClient initialBanners={banners} />
        </div>
    );
}
