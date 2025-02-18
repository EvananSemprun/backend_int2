const dns = require('dns');

dns.lookup('top-level-production.up.railway.app', (err, address, family) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Dirección IP: ${address}, Familia: IPv${family}`);
});
