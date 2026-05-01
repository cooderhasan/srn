const https = require('https');
const fs = require('fs');

https.get('https://turkiyeapi.dev/api/v1/provinces?fields=name,districts', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const cities = json.data.map(p => ({
        name: p.name,
        districts: p.districts.map(d => d.name).sort((a,b) => a.localeCompare(b, 'tr'))
      })).sort((a,b) => a.name.localeCompare(b.name, 'tr'));
      
      fs.writeFileSync('src/lib/turkey-data.json', JSON.stringify(cities, null, 2));
      console.log('Success');
    } catch(e) {
      console.log('Failed:', e);
    }
  });
}).on('error', e => console.log(e));
