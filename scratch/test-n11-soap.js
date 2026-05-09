
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";
const sku = process.argv[2] || "SRN-6809370";

async function testSoapSearch(sellerCode) {
    console.log(`Searching for product via SOAP: ${sellerCode}...`);
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:GetProductBySellerCodeRequest>
         <auth>
            <appKey>${apiKey}</appKey>
            <appSecret>${apiSecret}</appSecret>
         </auth>
         <sellerCode>${sellerCode}</sellerCode>
      </sch:GetProductBySellerCodeRequest>
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

testSoapSearch(sku);
