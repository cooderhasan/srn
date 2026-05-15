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

  console.log('📦 Sending with Content-Type: application/json-patch+json');
  const body = JSON.stringify(payload);

  const options = {
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads`,
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json-patch+json',
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      console.log('Upload Status:', res.statusCode);
      console.log('Response:', d);
      try {
        const parsed = JSON.parse(d);
        if (parsed.id) {
          console.log('✅ Tracking ID:', parsed.id);
          console.log('Checking status in 5 seconds...');
          setTimeout(() => checkStatus(parsed.id), 5000);
        }
      } catch(e) {}
    });
  });
  req.on('error', e => console.error('Error:', e));
  req.write(body);
  req.end();
}

function checkStatus(trackingId) {
  const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
  const secretKey = 'xraAz49GJu29';
  const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

  const req = https.request({
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads/id/${trackingId}`,
    method: 'GET',
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev'
    }
  }, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      const parsed = JSON.parse(d);
      console.log('\n📊 Status:', parsed.status);
      console.log('Total Updated:', parsed.total);
      if (parsed.errors && parsed.errors.length > 0) {
        console.log('❌ Errors:', JSON.stringify(parsed.errors, null, 2));
      } else {
        console.log('🎉 BAŞARILI! Hata yok, ürün güncellendi!');
      }
    });
  });
  req.end();
}

syncDENEME22();
