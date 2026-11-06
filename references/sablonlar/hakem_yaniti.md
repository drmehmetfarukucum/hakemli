# Şablon: Hakem yanıtı ve dergi revizyonu (protokol § 9b)

## Ne zaman, kim

- Dergiden karar mektubu ve hakem raporları geldiğinde (küçük veya büyük düzeltme). Aynı proje klasöründe, yeni bir revizyon turu olarak yürür; gönderilmiş sürüm `cikti/gonderim_<tarih>/` altında dokunulmadan kalır.
- Orkestratör yorumları ayrıştırır ve karar tablosunu kurar; **her kararı kullanıcı onaylar** (yanıt mektubu yazarlar adına gider). Metni, birleştirilmiş olduğu için, yetkilendirilen tek ajan ana metinde değiştirir; yanıt mektubunu ayrı bir yazar ajanı yazar; değişen cümleler son okumadan, atıf değiştiyse dar kaynak kontrolünden geçer.
- Dergi süresi `ilerleme.md` §3 ve §7'ye yazılır. Kota yeniden ölçülür ve eşik bu süreye göre kullanıcıyla yeniden belirlenir; süre ile kota çatışırsa kullanıcıya hemen söylenir (protokol § 1 G).

## Adımlar

1. **Ayrıştırma:** Editör ve hakem yorumlarını tek tek numarala (`E.1`, `R1.1`, `R1.2`, `R2.1` …) ve `_yonetim/denetim/hakem_yorumlari.md` dosyasına yorumun aslıyla yaz. Birden çok istek taşıyan yorumu alt maddelere böl (`R1.3a`, `R1.3b`).
2. **Karar tablosu** (`_yonetim/denetim/hakem_karar_tablosu.md`): her yorum için önerilen karar (kabul / kısmen / gerekçeli itiraz), etkilenen birim ve yer, gereken iş (metin, analiz, yeni kaynak, tablo), çelişen yorumlar (iki hakem zıt şey istiyorsa ikisi yan yana). Kullanıcı onayı alınır; onaylanan kararlar karar defterine (D) yazılır.
3. **Yeni kaynak veya analiz** gerekiyorsa normal kurallar geçerlidir: kaynak tam metinden okunur, analiz betikle yeniden yapılır, sayılar dosyadan alınır. Hakemin önerdiği kaynak da doğrulanır; desteklemiyorsa itiraz gerekçesi olur.
4. **Revizyon:** Metin birleştirilmiş olduğundan düzeltmeyi, yedek alındıktan sonra, yetkilendirilen tek ajan (çoğunlukla ilgili bölümün yazarı) ana metinde yapar; mesaj `yazar_brifi.md`'deki revizyon kalıbıyla gider, bulgu kodları hakem yorum numaralarıdır (protokol § 6, dosya sahipliği).
5. **Kontrol:** Değişen cümleler son okumaya; atıf değiştiyse dar kaynak kontrolüne; süreç betiği ve doğrulama yeniden çalışır. Kabul edilen her yorumun metinde karşılığı olduğunu bağımsız okuyucu sınar ("düzeltildi" deyip metinde karşılığı olmayan yorum KRİTİK'tir).
6. **Yanıt mektubu** (`cikti/yanit_mektubu_<tarih>.md`): aşağıdaki kalıpla; her yanıt metindeki yeri (bölüm, sayfa ve satır numarası dergi istiyorsa) ve değişen cümleyi gösterir. İtirazlar kibar, kanıtlı ve kısa.
7. **Değişiklik gösterimi:** Dergi izli sürüm (track changes) istiyorsa Word aracı bunu üretmez; Word'de "Gözden Geçir > Karşılaştır" ile gönderilmiş ve yeni sürüm karşılaştırılır. Bunu kullanıcıya söyle (protokol § 1 G). Renkli işaretli sürüm istenirse değişen cümlelerin listesi satır karşılaştırmasıyla çıkarılır.

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{GONDERILEN}}` | Gönderim kopyasındaki ana metin: `{{CK}}/cikti/gonderim_<tarih>/<ana metin>.md`. |
| `{{TARIH}}` | Yanıt mektubunun tarihi (YYYY-AA-GG). |
| `{{DIL}}` | Derginin dili. |

## Yanıt mektubu yazarı brifi

```markdown
Sen "{{BASLIK}}" makalesinin hakem yanıt mektubunu yazan yazarsın. Kararlar verildi ve metin düzeltildi; sen yalnız mektubu yazarsın, metni değiştirmezsin. Proje kökü `{{KOK}}`.

Oku: `{{CK}}/_yonetim/denetim/hakem_yorumlari.md`, `hakem_karar_tablosu.md` (onaylı kararlar), gönderilmiş sürüm `{{GONDERILEN}}` ile yeni ana metin `{{CK}}/{{ANA_METIN}}` (farkı betikle çıkar).

Her yorum için sırasıyla: yorumun aslı (italik), yanıt (teşekkür bir kez, mektubun başında; her maddede tekrar etme), yapılan değişiklik ve yeri, gerekiyorsa değişen cümle tırnak içinde. Kısmen kabul ve itirazlarda gerekçe kaynakla ve kısa. Karar tablosunda olmayan bir değişiklik veya söz yazma; metinde karşılığı bulunmayan bir "düzeltildi" yazma. Dil: derginin dili ({{DIL}}); kibar, net, savunmacı değil.

Çıktı: `{{CK}}/cikti/yanit_mektubu_{{TARIH}}.md`; sonuna "metinde karşılığı denetlenen yorumlar" tablosu (yorum no | yer | değişen cümlenin ilk beş kelimesi). Son yanıtın en fazla 80 kelime.
```

Mektup bağımsız bir okuyucudan geçer: her yanıtın metinde karşılığı var mı, ton uygun mu, söz verilen her değişiklik yapılmış mı.
