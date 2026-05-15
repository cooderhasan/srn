const https = require('https');

const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
const secretKey = 'xraAz49GJu29';
const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

async function request(hostname, path) {
  const options = {
    hostname,
    port: 443,
    path,
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
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.end();
  });
}

async function main() {
  // Tüm listing'leri çek - merchantSku değerlerini görelim
  console.log('🔍 Getting all listings...');
  const r1 = await request(
    'listing-external-sit.hepsiburada.com',
    `/listings/merchantid/${merchantId}?limit=20&offset=0`
  );
  console.log('Status:', r1.status);
  if (r1.status === 200) {
    try {
      const data = JSON.parse(r1.body);
      console.log('Total listings:', data.totalCount || data.length);
      const items = data.listings || data.items || data;
      if (Array.isArray(items)) {
        items.forEach(item => {
          console.log(`  HB SKU: ${item.hepsiburadaSku || item.sku} | Merchant SKU: ${item.merchantSku} | Stock: ${item.availableStock} | Price: ${item.price}`);
        });
      } else {
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
      }
    } catch(e) {
      console.log('Raw:', r1.body.substring(0, 500));
    }
  } else {
    console.log('Response:', r1.body.substring(0, 300));
  }
}

main();
