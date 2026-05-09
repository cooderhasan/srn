
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";
const taskId = "2749845568"; // The new one from the user

async function discoverRest() {
    console.log(`Discovering REST polling for ${taskId}...`);
    const paths = [
        `/rest/product/v1/tasks/${taskId}`,
        `/rest/product/v1/products/tasks/${taskId}`,
        `/rest/product/tasks/${taskId}`,
        `/rest/v1/tasks/${taskId}`,
        `/rest/v1/product/tasks/${taskId}`,
        `/rest/delivery/v1/tasks/${taskId}` // Just in case it's in the delivery service
    ];

    for (const path of paths) {
        const url = `https://api.n11.com${path}`;
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
            if (response.status === 200) {
                console.log("FOUND IT!");
                const text = await response.text();
                console.log(text.substring(0, 200));
                break;
            }
        } catch (err) {
            console.log(`Failed for ${url}: ${err.message}`);
        }
    }
}

discoverRest();
