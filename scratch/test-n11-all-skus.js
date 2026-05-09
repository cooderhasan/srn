
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function fetchAllSkus() {
    console.log("Fetching all SKUs from N11...");
    let allSkus = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages && page < 5) { // Limit to 5 pages for now
        console.log(`Fetching page ${page}...`);
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:SearchProductsRequest>
         <auth>
            <appKey>${apiKey}</appKey>
            <appSecret>${apiSecret}</appSecret>
         </auth>
         <pagingData>
            <currentPage>${page}</currentPage>
            <pageSize>100</pageSize>
         </pagingData>
      </sch:SearchProductsRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

        try {
            const response = await fetch("https://api.n11.com/ws/productService/", {
                method: "POST",
                headers: {
                    "Content-Type": "text/xml;charset=UTF-8",
                    "SOAPAction": ""
                },
                body: soapEnvelope
            });
            const text = await response.text();
            const matches = text.matchAll(/<productSellerCode>(.*?)<\/productSellerCode>/g);
            for (const match of matches) {
                allSkus.push(match[1]);
            }
            
            const pageCountMatch = text.match(/<pageCount>(\d+)<\/pageCount>/);
            if (pageCountMatch) totalPages = parseInt(pageCountMatch[1]);
            
            page++;
        } catch (err) {
            console.error(err);
            break;
        }
    }
    
    console.log(`Found ${allSkus.length} SKUs.`);
    const targetSuffix = "6809370";
    const found = allSkus.filter(sku => sku.includes(targetSuffix));
    console.log(`Matches for ${targetSuffix}:`, found);
}

fetchAllSkus();
