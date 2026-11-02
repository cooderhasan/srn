#!/bin/sh
# Konteyner başlangıcı: önce veritabanı yapısını koddaki şemaya (prisma/schema.prisma) eşitle, sonra siteyi başlat.
#
# Neden: Yeni alan/tablo eklenen güncellemelerde veritabanı elle güncelleniyordu (Coolify terminalinde "prisma db push");
# unutulursa yeni alanı kullanan sayfalar hata veriyordu.
#
# Güvenlik: --accept-data-loss YOK. Değişiklik bir sütun/tablo silmeyi gerektiriyorsa Prisma hiçbir şey yapmadan
# hata verir ve site yine açılır (loglarda uyarı görünür); sadece ekleme yapan değişiklikler otomatik uygulanır.
# Kapatmak için ortam değişkeni: SKIP_DB_PUSH=1

if [ "${SKIP_DB_PUSH}" = "1" ]; then
    echo "[db] SKIP_DB_PUSH=1, veritabanı eşitleme atlandı"
else
    echo "[db] Veritabanı yapısı şemayla eşitleniyor..."
    if node ./node_modules/prisma/build/index.js db push --skip-generate; then
        echo "[db] Veritabanı yapısı güncel"
    else
        echo "[db] UYARI: Veritabanı otomatik eşitlenemedi (veri kaybı gerektiren değişiklik ya da bağlantı hatası). Site yine başlatılıyor; yukarıdaki Prisma mesajına bakın."
    fi
fi

exec node server.js
