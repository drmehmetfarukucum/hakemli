# İlerleme

> Orkestratörün durum dosyası. "Devam et" mesajında okuma sırası protokol § 9'dadır (prompt, proje tanımı, bu dosya, karar defteri, revizyon kararları; devir notu yalnız bu dosyadan yeniyse yol gösterir). Her önemli adımdan sonra güncellenir; saat `date` ile alınır.
>
> **Durum kontrolü bloğu** (her raporun başında, değerler o turda dosyalardan): `Okunan: … (tam/kısmen) · Son karar: K-… · Açık birimler: <birim> <durum> <kelime>/<atıf> … · Bekleyen onay: … · Çalışan: <oturum/ajan> … · Kota: haftalık %…, 5 saatlik %… (<saat>) · Betik: <kırmızı sayısı> · Yapılamayan ve ertelenen: … (yoksa "yok"; protokol § 1 G)`
>
> **Orkestratör oturumu:** {{OTURUM}} <!-- ortamın verdiği oturum kimliği ve adı; bilinmiyorsa "bilinmiyor". Aynı projede tek orkestratör çalışır: burada başka bir canlı oturum yazıyorsa yönetim dosyalarına yazma, kullanıcıya sor. -->
> **Son güncelleme:** {{TARIH_SAAT}} — {{KISA_DURUM}}
> **Denetçi ve yazar kimlikleri:** <!-- birim: kaynak `…`, alan `…`; yazar oturumu veya ajan kimliği. Hesap değişince geçersizdir. -->

## 1. İş birimleri

| Birim | Başlıklar | Durum | Oturum (ad · kimlik) | Dosya | Denetim turu | Kabul | Son güncelleme |
|---|---|---|---|---|---|---|---|
| G | Giriş | bekliyor | — | `{{CK}}/bolumler/G_giris.md` | 0 | — | — |

Kelime ve atıf sayıları süreç betiğinin değeridir (betik kurulmadıysa elle sayılan değer ve "elle" notu). Durum değerleri: bekliyor · başlatılıyor · yazımda · teslim edildi · denetimde (tur n) · revizyonda (tur n) · kabul edildi · birleştirildi · onaylandı · askıda (neden). "Teslim edildi": devir notu kısmı dolu ve `DEVAM EDİYOR` notu yok. Kabul edilen birimin durumuna "kabul edildi — <kelime> kelime, <n> dn." (anahtarlı atıfta "<n> kaynak") yazılır ve Kabul sütununa ✔ konur; betik ikisini de arar ve sayıları dosyayla karşılaştırır. Birim kodları yeniden kullanılmaz. Giriş dosyasının adı çalışmanın diline uyar (ör. `G_introduction.md`); ayardaki adla aynı olmalıdır.

## 2. Bölüm durumu (ana metin)

| Bölüm | Birimler | Birleştirme | Bütünlük ve örneklem | Gönderim |
|---|---|---|---|---|
| Giriş | G | — | — | — |

## 3. Bekleyen onay noktası

Yok.

## 4. Bekleyen sorular

Kullanıcıya sorulmuş açık soru yok.

<!-- Her soru: tarih, soru, önerilen cevap, tür. Tür "tercih" (cevap gelmezse önerilen uygulanır ve kaydedilir) veya "zorunlu girdi" (kota değeri, açık onay, yalnız kullanıcının bilebileceği bilgi; cevap gelmeden ona bağlı iş başlamaz). -->

## 5. Kota günlüğü

| Zaman | 5 saatlik | Haftalık (tüm modeller) | Haftalık (ayrı sayılan model) | Not |
|---|---|---|---|---|
| | | | | |

<!-- Kota aracı yoksa "ölçülemedi" yaz ve kullanıcının bildirdiği değeri saatiyle kaydet (protokol § I). -->

## 6. Olay günlüğü

<!-- Bir satır bir olay: "GG.AA.YYYY SS:DD — ne oldu (dosya, sayı, kimlik)". Sayılar dosyadan ve betikten yazılır. Kurulumun son satırı "Kurulum tamamlandı"dır; değişikliklerin etki tabloları da buraya yazılır (protokol § 9a). -->

## 7. Sıradaki adımlar

<!-- Görev listesi aracı (update_plan, TodoWrite) yoksa plan burada tutulur. Her satır: [ ] adım — kim — bağımlılık. Biten adım [x] olur ve olay günlüğüne düşer. -->
