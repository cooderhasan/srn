const https = require('https');

async function syncSingleProduct() {
  const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
  const secretKey = 'xraAz49GJu29';
  const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
  
  const payload = [
    {
      "merchantSku": "8660802687527",
      "availableStock": 50,
      "price": 150.00,
      "dispatchTime": 1,
      "cargoCompany1": "Yurtiçi Kargo"
    }
  ];

  const options = {
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads`,
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev'
    }
  };

  console.log('Syncing single product 8660802687527...');

  const req = https.request(options, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', d);
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(JSON.stringify(payload));
  req.end();
}

syncSingleProduct();
