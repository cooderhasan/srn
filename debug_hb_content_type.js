const https = require('https');

const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
const secretKey = 'xraAz49GJu29';
const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

const payload = [
  {
    merchantSku: 'DENEME22',
    availableStock: 10,
    price: 550,
    dispatchTime: 1,
    cargoCompany1: 'Yurtiçi Kargo',
    maximumPurchasableQuantity: 100
  }
];

const contentTypes = [
  'application/json',
  'application/json; charset=utf-8',
  'text/json',
];

async function tryContentType(ct) {
  const body = JSON.stringify(payload);
  const options = {
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads`,
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': ct,
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => resolve({ ct, status: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ ct, error: e.message }));
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
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.end();
  });
}

async function main() {
  for (const ct of contentTypes) {
    const result = await tryContentType(ct);
    process.stdout.write(`${ct} => ${result.status}`);
    
    if (result.status === 200) {
      try {
        const parsed = JSON.parse(result.body);
        if (parsed.id) {
          process.stdout.write(` | ID: ${parsed.id}`);
          // Wait and check
          await new Promise(r => setTimeout(r, 4000));
          const status = await checkId(parsed.id);
          if (status.errors && status.errors.length > 0) {
            console.log(` | ❌ ${status.errors[0].errors[0].substring(0, 50)}`);
          } else if (status.total > 0) {
            console.log(` | 🎉 SUCCESS! Total: ${status.total}`);
          } else {
            console.log(` | ⚠️ Total: ${status.total}, Status: ${status.status}`);
          }
        }
      } catch(e) {
        console.log(` | ${result.body.substring(0, 80)}`);
      }
    } else {
      console.log(` | ${result.body.substring(0, 100)}`);
    }
  }
}

main();
