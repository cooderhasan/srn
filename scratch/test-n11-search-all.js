
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function testSoapSearch() {
    console.log("Searching for products via SOAP SearchProducts...");
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:SearchProductsRequest>
         <auth>
            <appKey>${apiKey}</appKey>
            <appSecret>${apiSecret}</appSecret>
         </auth>
         <productSearch>
            <title>Bisiklet</title>
         </productSearch>
         <pagingData>
            <currentPage>0</currentPage>
            <pageSize>10</pageSize>
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
        console.log("Response:", text);
    } catch (err) {
        console.error("SOAP failed:", err);
    }
}

testSoapSearch();
