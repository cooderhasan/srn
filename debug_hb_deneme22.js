const https = require('https');

async function syncDENEME22() {
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

  console.log('📦 Sending inventory for DENEME22:', JSON.stringify(payload, null, 2));

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

  const req = https.request(options, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', d);

      // If we got a tracking ID, check its status after 3 seconds
      try {
        const parsed = JSON.parse(d);
        if (parsed.id) {
          console.log(`\n✅ Upload ID: ${parsed.id}`);
          console.log('Waiting 5 seconds to check status...');
          setTimeout(() => checkStatus(parsed.id), 5000);
        }
      } catch(e) {}
    });
  });

  req.on('error', error => { console.error('Error:', error); });
  req.write(body);
  req.end();
}

function checkStatus(trackingId) {
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

  const req = https.request(options, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      console.log('\n📊 Status Check Result:');
      console.log('Status Code:', res.statusCode);
      try {
        const parsed = JSON.parse(d);
        console.log('Status:', parsed.status);
        console.log('Total:', parsed.total);
        if (parsed.errors && parsed.errors.length > 0) {
          console.log('❌ Errors:', JSON.stringify(parsed.errors, null, 2));
        } else {
          console.log('✅ No errors! Product should be updated in HB panel.');
        }
      } catch(e) {
        console.log('Raw:', d);
      }
    });
  });
  req.end();
}

syncDENEME22();
