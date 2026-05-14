# Hepsiburada SIT (Test) Ortamı Geçiş Rehberi

Hepsiburada'dan canlı ortam (Production) bilgilerini alabilmeniz için aşağıdaki test senaryolarını SIT ortamında başarıyla tamamlamanız gerekmektedir.

## 1. Katalog Entegrasyonu (Ürün İşlemleri)
- [ ] **Yeni Ürün Gönderimi:** En az bir ürünü `uploadproductviafile` servisi ile başarıyla gönderin.
- [ ] **Durum Sorgulama:** Gönderilen ürünün `trackingId` değeri ile durumunu sorgulayın (`getproductstatusbytraceid`). Statü "Yaratıldı" veya "Satışa Hazır" olmalıdır.
- [ ] **Eşleşen Ürün Testi (ZORUNLU):** Aşağıdaki barkodları kullanarak HB kataloğundaki ürünlerle eşleşme onayı/reddi testi yapın:
  - Barkod 1: `7541828790114`
  - Barkod 2: `7541828790155`
  - Barkod 3: `7541828790080`
  - *Kullanılacak servisler: `approveprematch` ve `rejectprematch`*

## 2. Listeleme Entegrasyonu (Stok/Fiyat)
- [ ] **Fiyat Güncelleme:** Bir ürünün fiyatını güncelleyin ve `fiyat güncelleme sorgulama` servisi ile teyit edin.
- [ ] **Stok Güncelleme:** Bir ürünün stoğunu güncelleyin ve `stok güncelleme sorgulama` servisi ile teyit edin.
- [ ] **Aktif/Pasif Testi:** Bir ürünü `Deactivate` servisi ile satışa kapatıp, `Activate` ile tekrar açın.

## 3. Sipariş Entegrasyonu (Sipariş Yönetimi)
- [ ] **Test Siparişi Oluşturma:** `/orders` endpoint'ine POST isteği atarak hayali bir sipariş oluşturun (Sadece SIT ortamında çalışır).
- [ ] **Paketleme:** Oluşturulan siparişi `Kalem veya Kalemleri Paketleme` servisi ile "Paketlendi" durumuna getirin.
- [ ] **Fatura İletme:** Paketlenmiş sipariş için `Fatura Linki Gönderme` servisini kullanarak hayali bir fatura URL'i iletin.

## 4. Canlı Ortam Bilgilerinin Talebi
Tüm yukarıdaki adımlar tamamlandığında, başarılı bir ürün gönderimine ait **trackingId** bilgisini de ekleyerek şu yoldan Ticket açın:
- **Link:** [Hepsiburada Yardım Merkezi - Talepler](https://merchant.hepsiburada.com/)
- **Yol:** Canlı Ortam Merchant Panel > Yardım Merkezi > Talepler > Taleplerimi Görüntüle > API Entegrasyon > API Entegrasyon Teknik Destek

---
*Not: Bu adımlar tamamlanmadan açılan talepler Hepsiburada tarafından reddedilmektedir.*
