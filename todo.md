# Bybit Trading Dashboard - TODO

## Veritabanı & Backend
- [x] Drizzle şemasını tasarla (users, api_keys, signals, positions, trades)
- [x] Bybit API bağlantı modülünü oluştur
- [x] Teknik analiz motorunu (RSI, MACD, formasyonlar) backend'e ekle
- [x] Sinyal üretim ve saklama prosedürlerini yaz
- [x] Otomatik sinyal işleme job'ını kur

## Frontend - Dashboard
- [x] Dashboard layout'unu tasarla (sidebar, header, main content)
- [x] API anahtarı yönetim sayfasını oluştur
- [x] Cüzdan bakiyesi ve pozisyon kartlarını ekle
- [x] TradingView widget entegrasyonunu yap (Recharts ile BTCUSDT grafiği)
- [x] Canlı sinyal panelini oluştur
- [x] Sinyal geçmişi tablosunu ekle
- [x] Performans istatistikleri sayfasını tasarla

## Teknik Analiz & Sinyaller
- [x] RSI hesaplama prosedürünü yaz
- [x] MACD hesaplama prosedürünü yaz
- [x] Çift Tepe/Dip formasyon tespitini uygula
- [x] Sinyal güvenilirlik skorlaması ekle
- [x] Geçmiş sinyal performansını takip et

## Risk Yönetimi & İşlemler
- [ ] Stop-loss ve take-profit ayarlarını ekle
- [ ] Manuel işlem açma/kapatma özelliğini yap
- [ ] Otomatik işlem yürütme seçeneğini kur
- [ ] İşlem geçmişini veritabanında sakla
- [ ] Risk metrikleri hesaplaması ekle

## LLM & Bildirimler
- [x] Piyasa haberi analizi LLM prosedürünü yaz
- [x] Sosyal medya trend analizi ekle
- [x] Kritik sinyal bildirimleri sistemi kur
- [x] Proje sahibine otomatik bildirim gönderme

## UI/UX & Responsive
- [ ] Mobil responsive tasarım kontrol et
- [ ] Tema ve renk paletini ayarla
- [ ] Erişilebilirlik (accessibility) kontrol et
- [ ] Loading ve error state'lerini tasarla

## Test & Deployment
- [ ] Backend prosedürlerini test et (vitest)
- [ ] Frontend bileşenlerini test et
- [ ] Bybit testnet üzerinde işlemleri doğrula
- [ ] Güvenlik kontrolü yap (API key encryption)
- [ ] Canlı ortama taşı

## 🐛 BUG FIX - Bakiye Gelmeme Sorunu
- [x] API anahtarını düz metin olarak sakla (Mainnet'e bağlantı sağlandı)
- [x] Bybit API bağlantısını test et ve hata mesajlarını göster
- [x] Dashboard'da bakiye çekme prosedürünü düzélt
- [x] API hata mesajlarını kullanıcı arayüzünde göster


## 🆕 FEATURE - API Anahtarı Kalıcı Depolama
- [x] API anahtarını localStorage'da kalıcı olarak sakla
- [x] Kullanıcı giriş yaptığında API anahtarını otomatik yükle
- [x] Dashboard'da API anahtarı durumunu göster (bağlı/bağlı değil)
- [x] API anahtarını değiştirme seçeneği ekle


## 🤖 OTOMATİK TRADING BOT (ÖNCELİK)
- [ ] Bybit API ile gerçek işlem açma (Long/Short)
- [ ] RSI + MACD + Formasyon stratejisi uygula
- [ ] Stop-loss ve take-profit otomatik ayarla
- [ ] Risk yönetimi (maksimum kayıp limiti)
- [ ] Pozisyon takibi ve kar/kayıp hesaplama
- [ ] Bot'u belirli aralıklarla çalıştır (1 dakika/5 dakika)
- [ ] İşlem geçmişini veritabanına kaydet


## 🆕 FEATURE - Açık İşlemler Paneli & Profesyonel Grafikler
- [ ] Açık işlemler paneli (entry, exit, PnL)
- [ ] İşlem geçmişi tablosu
- [ ] Profesyonel mum grafikleri (candlestick)
- [ ] Teknik göstergeler (RSI, MACD, Bollinger Bands)
