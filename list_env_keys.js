
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const keys = envContent.split('\n')
    .map(line => line.split('=')[0].trim())
    .filter(k => k && !k.startsWith('#'));
console.log('Available keys in .env.local:', keys);
