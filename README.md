# FileDrop P2P

Transfer file hingga 500MB langsung antar perangkat via WebRTC.  
File **tidak pernah lewat server** — server hanya untuk signaling (teks kecil).

## Struktur

```
filedrop/
├── server.js        ← WebSocket signaling server (Node.js)
├── package.json
├── Procfile         ← untuk Heroku
├── railway.json     ← untuk Railway
└── public/
    └── index.html   ← Aplikasi web (frontend)
```

## Deploy ke Railway (gratis, paling mudah)

1. Buat akun di https://railway.app
2. Klik **New Project → Deploy from GitHub**
3. Upload folder ini ke GitHub repo baru
4. Railway otomatis detect Node.js dan deploy
5. Buka URL yang diberikan Railway — selesai!

## Deploy ke VPS (Ubuntu)

```bash
# Clone / upload ke server
cd /var/www/filedrop
npm install

# Jalankan langsung
node server.js

# Atau pakai PM2 (recommended)
npm install -g pm2
pm2 start server.js --name filedrop
pm2 save
pm2 startup
```

### Nginx reverse proxy (agar pakai domain)

```nginx
server {
    listen 80;
    server_name filedrop.domainanda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Aktifkan SSL dengan Certbot:
```bash
certbot --nginx -d filedrop.domainanda.com
```

## Cara Pakai

**Mode Otomatis (server online):**
1. Pengirim: pilih file → Buat Kode → berikan kode 6 digit ke penerima
2. Penerima: masukkan kode → Hubungkan
3. Transfer P2P langsung!

**Mode Manual (fallback jika server offline):**
1. Pengirim: salin "Kode Kirim" → kirim via WA/chat ke penerima
2. Penerima: tempel → dapat "Kode Balasan" → kirim balik ke pengirim
3. Pengirim: tempel kode balasan → Hubungkan!

## Catatan

- File dikirim P2P (WebRTC DataChannel) — server hanya relay sinyal kecil
- Tidak ada file yang tersimpan di server
- Room auto-cleanup setelah 30 menit
