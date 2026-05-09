
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function findByTitle(targetTitle) {
    console.log(`Searching for title: ${targetTitle}...`);
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
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
            if (text.includes(targetTitle)) {
                console.log(`FOUND on page ${page}!`);
                const start = text.indexOf(targetTitle) - 500;
                console.log(text.substring(start, start + 1000));
                return;
            }
            
            const pageCountMatch = text.match(/<pageCount>(\d+)<\/pageCount>/);
            if (pageCountMatch) totalPages = parseInt(pageCountMatch[1]);
            page++;
        } catch (err) {
            console.error(err);
            break;
        }
    }
    console.log("Title not found in any page.");
}

findByTitle("Bisiklet - Katlanır Elektrikli Bisiklet Uyumlu Ultra Geniş Sele");
