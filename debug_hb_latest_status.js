const https = require('https');

async function getLatestUploadId() {
  const merchantId = '2c8b04a9-3898-4925-99a5-98875224b436';
  const secretKey = 'xraAz49GJu29';
  const auth = 'Basic ' + Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
  
  // Önce son yüklemeleri listeleyelim
  const options = {
    hostname: 'listing-external-sit.hepsiburada.com',
    port: 443,
    path: `/listings/merchantid/${merchantId}/inventory-uploads?limit=1`,
    method: 'GET',
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
      'User-Agent': 'serinmotor_dev'
    }
  };

  console.log('Fetching latest upload ID...');

  const req = https.request(options, res => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
      console.log('List Status:', res.statusCode);
      try {
        const list = JSON.parse(d);
        if (list && list.length > 0) {
          const latestId = list[0].id;
          console.log('Latest Tracking ID:', latestId);
          checkIdStatus(latestId);
        } else {
          console.log('No uploads found.');
        }
      } catch (e) {
        console.log('Raw Response:', d);
      }
    });
  });

  req.end();
}

function checkIdStatus(trackingId) {
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
      console.log('ID Status Code:', res.statusCode);
      console.log('Detailed Response:', d);
    });
  });
  req.end();
}

getLatestUploadId();
