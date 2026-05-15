const https = require('https');

const trackingId = 'df26acf1-9ad1-4159-a03b-eca07b55e5c2'; // Son gönderimin ID'si

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
    console.log('Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(d);
      console.log('Status:', parsed.status);
      console.log('Total Updated:', parsed.total);
      if (parsed.errors && parsed.errors.length > 0) {
        console.log('Errors:', JSON.stringify(parsed.errors, null, 2));
      } else {
        console.log('✅ Başarılı - Hata yok!');
      }
    } catch(e) {
      console.log('Raw:', d);
    }
  });
});
req.end();
