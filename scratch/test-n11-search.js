
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function testSearch(sku) {
    console.log(`Searching for product ${sku}...`);
    const endpoints = [
        `https://api.n11.com/rest/product/v1/products?sellerCode=${sku}`,
        `https://api.n11.com/ms/product/v1/products?sellerCode=${sku}`,
        `https://api.n11.com/rest/product/v1/products/sellerCode/${sku}`
    ];

    for (const url of endpoints) {
        try {
            console.log(`Trying ${url}...`);
            const response = await fetch(url, {
                headers: {
                    "appKey": apiKey,
                    "appSecret": apiSecret,
                    "Content-Type": "application/json"
                }
            });
            console.log(`Status for ${url}:`, response.status);
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 200)}`);
        } catch (err) {
            console.log(`Failed for ${url}: ${err.message}`);
        }
    }
}

testSearch("TEST-SKU-1715249216000"); // Use one of the IDs I created earlier or a real one
