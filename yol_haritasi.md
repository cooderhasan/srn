# E-Ticaret Dönüşüm ve Geliştirme Yol Haritası

Bu belge, mevcut B2B projesinin B2C'ye dönüştürülmesi, Prestashop verilerinin aktarılması ve yeni özelliklerin eklenmesi için izlenecek teknik yol haritasını içerir.

## 1. Faz: Veri Aktarımı (Migrasyon)
Mevcut `ladamarketi.com` (Prestashop) verilerinin yeni sisteme kayıpsız aktarılması.

- [x] **Kategorilerin Aktarımı**: `ps_category` tablosundan hiyerarşik yapının (Parent/Child) korunarak aktarılması.
- [x] **Markaların Aktarımı**: `ps_manufacturer` tablosundan marka/üretici verilerinin aktarılması.
- [x] **Ürünlerin Aktarımı**: 
    - Ürün adı, stok kodu (SKU), fiyat, stok adedi bilgilerinin aktarılması.
    - Ürünlerin doğru kategori ve markalarla eşleştirilmesi.
    - Ürün açıklamalarının (HTML) temizlenerek aktarılması.
- [x] **Resimlerin Aktarımı**: 
    - `ps_image` tablosundan resim ID'lerinin alınması.
    - Eski sunucudan resimlerin çekilip yeni depolama alanına (Local/S3) kaydedilmesi.
    - Ürün-Resim ilişkilerinin kurulması.

## 2. Faz: B2C (Perakende) Dönüşümü ve Arayüz ✅
Sistemin toptancı mantığından son kullanıcı satış sitesine evrilmesi.

- [x] **Üyelik Sistemi Güncellemesi**: Bireysel müşteri ( instant onay) ve Kurumsal bayi (onay bekleyen) ayrımı yapıldı.
- [x] **Fiyat Politikası**: Giriş yapmayanlara/misafirlere liste fiyatı, onaylı bayilere iskonto tanımlı fiyatlar uygulandı.
- [x] **Sepet ve Ödeme Adımları**: Misafir checkout (üye olmadan sipariş) desteği eklendi.
- [x] **Mobil/Header**: Misafirler için sepet ve mobil hızlı erişim alanları düzenlendi.

## 3. Faz: Yönetim Paneli (Admin) Geliştirmeleri
Operasyonel kolaylık sağlayacak yeni özelliklerin eklenmesi.

- [x] **Toplu İşlemler Modülü**:
    - **Fiyat Güncelleme**: Seçili ürünlere Tutar (TL) veya Yüzde (%) bazında toplu zam/indirim yapabilme.
    - **Stok Güncelleme**: Seçili ürünlerin stoklarını toplu olarak artırma/azaltma veya eşitleme.
- [x] **İçerik Yönetimi**: Anasayfa banner, slider ve "Hizmetlerimiz" alanlarının admin panelinden yönetilebilir olması.

## 4. Faz: Ödeme ve Sipariş Entegrasyonları ✅
Para akışı ve sipariş yönetiminin otomasyonu.

- [x] **PayTR Sanal POS**: Kredi kartı iFrame entegrasyonu ve callback (onay) sistemi kuruldu.
- [x] **Havale/EFT Sistemi**: Durum etiketleri "Havale Bekleniyor" olarak özelleştirildi.
- [x] **Fatura Bilgileri**: Checkout formuna opsiyonel TC Kimlik / Vergi No alanı eklendi.
- [x] **Kapıda Ödeme**: Altyapının hazırlanması ancak **pasif** (kullanıma kapalı) olarak kodlanması.

## 5. Faz: Pazaryeri Entegrasyon Altyapısı
İleride aktif edilecek pazaryeri bağlantıları için servis katmanlarının yazılması.

- [ ] **Trendyol API Servisi**: Ürün gönderme ve stok güncelleme servis taslağı.
- [ ] **Hepsiburada API Servisi**: Temel entegrasyon yapısı.
- [ ] **N11 API Servisi**: Temel entegrasyon yapısı.

## 6. Faz: Güvenlik ve Altyapı
Sistemin güvenliği ve performansının sağlanması.

- [ ] **Veri Güvenliği**: Parolaların `bcrypt` ile hashlenmesi, kullanıcı girişlerinde Rate Limiting.
- [ ] **Validasyon**: Tüm form girişlerinin `zod` ile sunucu tarafında doğrulanması.
- [ ] **Güvenli Headers**: HTTP güvenlik başlıklarının yapılandırılması.
- [ ] **SEO Optimizasyonu**: Next.js Metadata API ile dinamik title, description ve sitemap yönetimi.
