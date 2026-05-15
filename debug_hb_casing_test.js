const https = require('https');

const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
const secretKey = 'xraAz49GJu29';
const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

// Deneme 1: camelCase (şu an kullandığımız)
const camelCase = [{ merchantSku: 'DENEME22', availableStock: 10, price: 550, dispatchTime: 1, cargoCompany1: 'Yurtiçi Kargo', maximumPurchasableQuantity: 100 }];

// Deneme 2: PascalCase
const pascalCase = [{ MerchantSku: 'DENEME22', AvailableStock: 10, Price: 550, DispatchTime: 1, CargoCompany1: 'Yurtiçi Kargo', MaximumPurchasableQuantity: 100 }];

// Deneme 3: Mixed case (dokümanlarda bazen böyle)
const mixed = [{ merchantSku: 'DENEME22', AvailableStock: 10, Price: 550, DispatchTime: 1, CargoCompany1: 'Yurtiçi Kargo', MaximumPurchasableQuantity: 100 }];

async function testPayload(name, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'listing-external-sit.hepsiburada.com',
      port: 443,
      path: `/listings/merchantid/${merchantId}/inventory-uploads`,
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'serinmotor_dev',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.id) {
            setTimeout(async () => {
              const status = await checkId(parsed.id);
              if (status.total > 0) {
                console.log(`${name}: 🎉 SUCCESS! Total: ${status.total}`);
              } else if (status.errors && status.errors.length > 0) {
                const err = status.errors[0];
                console.log(`${name}: ❌ merchantSku=${err.merchantSku}, error=${err.errors[0].substring(0, 60)}`);
              } else {
                console.log(`${name}: ⚠️ Status=${status.status} Total=${status.total}`);
              }
              resolve();
            }, 4000);
          } else {
            console.log(`${name}: Upload failed - ${d.substring(0, 100)}`);
            resolve();
          }
        } catch(e) {
          console.log(`${name}: Parse error - ${d.substring(0, 100)}`);
          resolve();
        }
      });
    });
    req.write(body);
    req.end();
  });
}

async function checkId(trackingId) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'listing-external-sit.hepsiburada.com',
      port: 443,
      path: `/listings/merchantid/${merchantId}/inventory-uploads/id/${trackingId}`,
      method: 'GET',
      headers: { 'Authorization': auth, 'Accept': 'application/json', 'User-Agent': 'serinmotor_dev' }
    }, res => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); } });
    });
    req.end();
  });
}

async function main() {
  console.log('Testing field casing...\n');
  await testPayload('camelCase', camelCase);
  await testPayload('PascalCase', pascalCase);
  await testPayload('MixedCase', mixed);
}

main();
