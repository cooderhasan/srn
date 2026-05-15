const https = require('https');

// HB panelindeki gerçek listing SKU'ları - bunlar zaten listinge bağlı
const TEST_SKUS = [
  'DENEME22',
  'HBV0000KSJL98',
  'HBV0000KLK0',
  'HBV00001KGKGK',
];

async function syncSku(merchantSku) {
  const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
  const secretKey = 'xraAz49GJu29';
  const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

  const payload = [
    {
      merchantSku: merchantSku,
      availableStock: 10,
      price: 550,
      dispatchTime: 1,
      cargoCompany1: 'Yurtiçi Kargo',
      maximumPurchasableQuantity: 100
    }
  ];

  const body = JSON.stringify(payload);
  const options = {
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
  };

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          resolve({ merchantSku, status: res.statusCode, trackingId: parsed.id });
        } catch(e) {
          resolve({ merchantSku, status: res.statusCode, raw: d });
        }
      });
    });
    req.on('error', error => resolve({ merchantSku, error: error.message }));
    req.write(body);
    req.end();
  });
}

async function checkStatus(trackingId) {
  const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
  const secretKey = 'xraAz49GJu29';
  const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

  const options = {
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads/id/${trackingId}`,
    method: 'GET',
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch(e) {
          resolve({ raw: d });
        }
      });
    });
    req.end();
  });
}

async function main() {
  console.log('🚀 Testing all SKUs...\n');
  
  for (const sku of TEST_SKUS) {
    process.stdout.write(`Testing ${sku}... `);
    const result = await syncSku(sku);
    
    if (result.trackingId) {
      // Wait 3 seconds then check status
      await new Promise(r => setTimeout(r, 3000));
      const status = await checkStatus(result.trackingId);
      
      if (status.errors && status.errors.length > 0 && status.errors[0].merchantSku === null) {
        console.log(`❌ NOT FOUND (merchantSku null in response)`);
      } else if (status.errors && status.errors.length > 0) {
        console.log(`⚠️  Error: ${status.errors[0].errors[0]}`);
      } else if (status.status === 'Done' && status.total > 0) {
        console.log(`✅ SUCCESS! Updated ${status.total} item(s)`);
      } else {
        console.log(`⚠️  Status: ${status.status}, Total: ${status.total}`);
      }
    } else {
      console.log(`❌ Upload failed: ${result.raw || result.error}`);
    }
  }
}

main().catch(console.error);
