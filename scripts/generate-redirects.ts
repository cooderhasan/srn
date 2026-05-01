import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const workbook = xlsx.readFile('dizin.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet) as any[];

  type Redirect = { source: string; destination: string; permanent: boolean };
  const redirects: Redirect[] = [];

  for (const row of data) {
    const urlStr = row.URL || row.url || row.Url;
    if (!urlStr || typeof urlStr !== 'string') continue;

    try {
      const url = new URL(urlStr);
      let pathname = url.pathname;
      
      // Bazı linkler // şeklinde olabiliyor
      pathname = pathname.replace(/\/+/g, '/');
      
      const fileName = pathname.split('/').pop();
      if (!fileName) continue;
      
      const withoutHtml = fileName.replace(/\.html$/, '');
      const match = withoutHtml.match(/^[0-9]+-(.*)$/);
      let possibleSlug = withoutHtml;
      
      if (match && match[1]) {
        possibleSlug = match[1];
      }
      
      const product = await prisma.product.findFirst({
        where: { slug: { contains: possibleSlug } }
      });
      
      if (product) {
        redirects.push({
          source: pathname,
          destination: `/products/${product.slug}`,
          permanent: true,
        });
        continue;
      }
      
      const category = await prisma.category.findFirst({
        where: { slug: { contains: possibleSlug } }
      });
      
      if (category) {
        redirects.push({
          source: pathname,
          destination: `/category/${category.slug}`,
          permanent: true,
        });
        continue;
      }
      
    } catch (e) {
      // url parse error, skip
    }
  }

  fs.writeFileSync(path.join(process.cwd(), 'redirects.json'), JSON.stringify(redirects, null, 2));
  console.log(`Başarıyla ${redirects.length} adet kesin yönlendirme (redirect) oluşturuldu.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
