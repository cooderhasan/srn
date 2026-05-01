import { getSliders } from "./actions";
import { SlidersClient } from "@/components/admin/sliders-client";

export default async function SlidersPage() {
    const sliders = await getSliders();

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <SlidersClient initialSliders={sliders} />
        </div>
    );
}
