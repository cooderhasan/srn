
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function testCreate() {
    console.log("Testing product creation...");
    const payload = {
        payload: {
            integrator: "SRN_Entegrasyon",
            skus: [{
                title: "Test Urun " + Date.now(),
                description: "Test Aciklama",
                categoryId: 1000001, // Banyo & Tuvalet
                currencyType: "TL",
                productMainId: "TEST-" + Date.now(),
                preparingDay: 3,
                shipmentTemplate: "Karaaslan",
                stockCode: "TEST-SKU-" + Date.now(),
                salePrice: 100,
                listPrice: 120,
                vatRate: 20,
                quantity: 1,
                images: [{ url: "https://www.serinmotor.com/uploads/logo.png", order: 1 }],
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
        return data.id;
    } catch (err) {
        console.error("Create failed:", err);
    }
}

async function testPoll(taskId) {
    if (!taskId) return;
    console.log(`Polling task ${taskId}...`);
    const endpoints = [
        `https://api.n11.com/ms/product/v1/tasks/${taskId}`,
        `https://api.n11.com/ms/product/tasks/${taskId}`,
        `https://api.n11.com/rest/product/v1/tasks/${taskId}`
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
            console.log(`Response length: ${text.length}`);
            if (response.status === 200) {
                console.log("SUCCESS! This is the endpoint.");
                console.log(text.substring(0, 200));
                break;
            }
        } catch (err) {
            console.log(`Failed for ${url}: ${err.message}`);
        }
    }
}

testCreate().then(testPoll);
