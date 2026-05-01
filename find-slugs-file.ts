
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function findSlugs() {
    const terms = ["Samara", "Vega", "Kalina", "Niva"];
    let output = "";

    for (const term of terms) {
        const categories = await prisma.category.findMany({
            where: {
                name: { contains: term }
            },
            select: { name: true, slug: true }
        });
        output += `\n--- Matches for ${term} ---\n`;
        categories.forEach(c => output += `${c.name} : ${c.slug}\n`);
    }

    fs.writeFileSync("slugs_output.txt", output);
    console.log("Done writing to slugs_output.txt");
}

findSlugs()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
