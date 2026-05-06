
import { TrendyolClient } from "../src/services/trendyol/api";

async function findSubCategories(parentId: number) {
    const client = new TrendyolClient();
    try {
        const data = await client.getCategories();
        const categories = data.categories || [];
        
        // Find parent and its children
        function search(cats: any[]): any[] {
            for (const cat of cats) {
                if (cat.id === parentId) {
                    return cat.subCategories || [];
                }
                if (cat.subCategories) {
                    const found = search(cat.subCategories);
                    if (found.length > 0) return found;
                }
            }
            return [];
        }

        const subCats = search(categories);
        console.log("Subcategories of ID " + parentId + ":");
        console.log(JSON.stringify(subCats, null, 2));
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

findSubCategories(4114);
