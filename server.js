const express = require('express');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let database = {};

try {
    database = JSON.parse(fs.readFileSync('database.json'));
} catch (error) {
    database = {};
}

// Endpoint buat buat link baru
app.post('/generate', (req, res) => {
    const { url } = req.body;
    const id = Math.random().toString(36).substring(2, 8);
    database[id] = { url, clicks: [] };
    fs.writeFileSync('database.json', JSON.stringify(database, null, 2));
    res.json({ shortUrl: `${req.protocol}://${req.get('host')}/${id}` });
});

// Endpoint buat handle redirect + log IP
app.get('/:id', async (req, res) => {
    const id = req.params.id;
    const record = database[id];

    if (!record) {
        return res.status(404).send('Link tidak ditemukan');
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Panggil API IP Geolocation
    let locationInfo = {};
    try {
        const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`);
        locationInfo = {
            ip: ip,
            city: geoRes.data.city,
            region: geoRes.data.region,
            country: geoRes.data.country_name,
            org: geoRes.data.org
        };
    } catch (error) {
        locationInfo = { ip: ip };
    }

    // Simpan log
    record.clicks.push({
        timestamp: new Date(),
        info: locationInfo,
        userAgent: req.headers['user-agent']
    });

    fs.writeFileSync('database.json', JSON.stringify(database, null, 2));

    // Redirect ke URL target
    res.redirect(record.url);
});

// Endpoint lihat semua klik (buat admin)
app.get('/admin/logs', (req, res) => {
    res.json(database);
});

app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});