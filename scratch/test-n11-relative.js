
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function testCreateRelative() {
    console.log("Testing product creation with RELATIVE URL...");
    const payload = {
        payload: {
            integrator: "SRN_Entegrasyon",
            skus: [{
                title: "Test Urun Relative " + Date.now(),
                description: "Test Aciklama",
                categoryId: 1000001,
                currencyType: "TL",
                productMainId: "TEST-REL-" + Date.now(),
                preparingDay: 3,
                shipmentTemplate: "Karaaslan",
                stockCode: "TEST-SKU-REL-" + Date.now(),
                salePrice: 100,
                listPrice: 120,
                vatRate: 20,
                quantity: 1,
                images: [{ url: "/uploads/logo.png", order: 1 }],
                attributes: []
            }]
        }
    };

    try {
        const response = await fetch("https://api.n11.com/ms/product/tasks/product-create", {
            method: "POST",
            headers: {
                "appKey": apiKey,
                "appSecret": apiSecret,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Response:", JSON.stringify(data));
    } catch (err) {
        console.error("Create failed:", err);
    }
}

testCreateRelative();
