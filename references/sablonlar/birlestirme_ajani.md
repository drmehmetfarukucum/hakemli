# Şablon: Birleştirme ajanı

## Ne zaman, kim

- Birleştirme kapısı geçildikten sonra (kaynak fark kontrolü, bağımsız son okuma, süreç denetimi; protokol § 1 E-20).
- Alt ajan. İçeriği yeniden yazmaz; yalnız birleştirir, bağlar ve biçimi tamamlar. Ana metne yalnız o dokunur; aynı anda başka yazar ana metni değiştirmez.
- Sonra orkestratör satır karşılaştırmasıyla bölüm dışındaki her değişikliği listeler; ardından bütünlük ve örneklem denetimi gelir.

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{BOLUM}}` | Birleştirilecek bölüm(ler) ve başlıkları (`## <Bölüm adı> — <başlık>`). |
| `{{BIRIMLER}}` | Birim dosyaları, sırasıyla. |
| `{{KAYITLAR}}` | Birleştirmeyi ilgilendiren karar defteri kayıtları (dipnot önekleri, kısaltmalar, terim birliği, birleştirmede yapılacak düzeltmeler listesi). |
| `{{ATIF_SISTEMI}}` | "dipnot" veya "anahtar" (numaralı ve yazar–tarih sistemler; aşağıdaki 3. madde). |
| `{{CALISMA_NOTLARI}}` | "bölüm sonuna al" (tez taslaklarında, önceki projedeki gibi) veya "alma" (makalede ve teslim sürümünde). |
| `{{CIKTI_KOMUTU}}` | Varsa Word/PDF üretim komutu (`bash {{CK}}/_araclar/uret.sh --tarih …`). Araç kurulmadıysa sil. |
| `{{KAPSAM_KISA}}` | Rapor adı için kısa ad. |

## Brif

```markdown
**Görev:** "{{BASLIK}}" çalışmasının kabul edilmiş {{BOLUM}} ana metne birleştir. Metnin içeriğini yeniden yazmıyorsun; yalnız birleştiriyor, bağlıyor ve biçimi tamamlıyorsun. Proje kökü: `{{KOK}}`.

**Önce oku:** `{{CK}}/_yonetim/yazim_kilavuzu.md` (§2, §3, §4, §6), `{{CK}}/_yonetim/karar_defteri.md` ({{KAYITLAR}}), araç kuruluysa `{{CK}}/_araclar/README.md`.

**Kaynaklar (yalnız oku):** {{BIRIMLER}}. Her birim dosyasının kısımları: metin ve atıf tanımları; birim kaynakçası; kaynak kontrolü; araştırma notu; orkestratöre devir notu (ve altındaki denetim cevapları).

**Hedef dosya:** `{{CK}}/{{ANA_METIN}}`. Dokunmadan önce kopyasını `{{CK}}/bolumler/_arsiv/ana_metin_{{KAPSAM_KISA}}_birlestirme_oncesi_{{TARIH}}.md` olarak al. Ana metnin güncel hâlini al; önceki düzeltmeleri koru.

**Yapılacaklar:**
1. **Bölüm:** Uygun yere `## <Bölüm adı> — <başlık>` başlığını aç; altına birimlerin metnini sırasıyla al (bölüm girişi paragrafı başlığın hemen altına). Birim dosyasının ilk satırındaki yazar işaretini alma. Çalışma notları: {{CALISMA_NOTLARI}}. Alınacaksa bölümün sonuna "<Bölüm> için kaynak kontrolü" ve "<Bölüm> için araştırma notu" başlıklarını koy; altında birimlerin ilgili kısımlarını kısım numaralarıyla alt başlıklandır. Birim kodu kullanma. Devir notlarını ve birim kaynakçalarını metne alma. Birimlerin kaynak kontrolü notlarındaki erişim sınırlarını Giriş'in (makalede Tartışma'nın) Sınırlılıklar kısmına kısa ve okuyucu diliyle ekle; eklediğin cümleleri raporda listele (son okumaya girer).
2. **Okuyucu dili:** Kaynak kontrolü ve araştırma notunda sürece yazılmış ifadeleri ("denetçi", "tur 2", "orkestratöre") okuyucu diline çevir; çevirdiklerini raporda listele.
3. **Atıflar ({{ATIF_SISTEMI}}):**
   - *Dipnot:* Bütün birim dipnot tanımlarını dosyanın sonuna, mevcut tanımlardan sonra, birim sırasıyla ekle. **Etiketleri değiştirme.** Her işaretin bir tanımı, her tanımın bir işareti olsun. Daha önce tam künyeyle verilmiş kaynakların yeni ilk atıflarını kısa atfa çevir; sayfa, tablo ve madde bilgisini koru.
   - *Anahtar:* `[@anahtar]` atıflarını **çevirme**; ana metinde anahtar olarak kalır, numara veya yazar–tarih etiketi yalnız Word çıktısında üretilir. Her anahtarın ana kaynakçada `- [@anahtar] Künye` biçiminde tek bir karşılığı olduğunu betikle sına; eşleşmeyen anahtarı uydurma, raporda listele.
4. **Kaynakça:** Birim kaynakçalarını ana kaynakçaya ekle. Mevcut kategorileri koru. Tekilleştir; birebir veya anlamca aynı künyeleri birleştir; DOI veya ISBN'i farklı iki künyeyi birleştirme. Şüpheli eşleşmeleri birleştirme, raporda listele. `kaynak_kaydi.md`'ye yazma: eklenecek yeni kayıtları ve "Birim" sütunu güncellemelerini raporunun ayrı bir başlığında listele; orkestratör işler.
5. **Kısaltmalar:** Metinde gerçekten kullanılan yeni kısaltmaları tabloya ekle; kullanılmayanı ekleme.
6. **İçindekiler, ilerleme ve durum:** Bölümün İçindekiler girişlerini gerçek başlıklarla güncelle; diğer bölümlerin planı aynen kalsın. Ana metindeki ilerleme tablosunu ve "Çalışma durumu" satırını güncelle.
7. **Bağlantılar:** Birimlerin birleştiği yerlerde gerekiyorsa en fazla bir-iki cümlelik geçiş ekle; içerik değiştirme. Çapraz atıfları ("aşağıda (Üçüncü Bölüm, V.C)", "yukarıda I.A") gerçek başlıklarla karşılaştır, yanlışları düzelt. "dn. b2a-90" gibi iç dipnot göndermelerini başlık atfına çevir. Metinde iç yönetim dili kalmadığını betikle sına.
8. **Terim birliği:** Karar defterindeki terim kararlarını uygula (ilk geçişte yabancı terim parantezde, sonra Türkçesi).
9. {{CIKTI_KOMUTU}}

**Kısıtlar:**
- Yalnız ana metni, `{{CK}}/bolumler/_arsiv/` altındaki yedeği, `{{CK}}/cikti/` ve gerekiyorsa `{{CK}}/_araclar/ayarlar.json` dosyasını değiştir. Birim dosyalarına ve yönetim dosyalarına (kaynak kaydı dahil) dokunma.
- Raporun son satırı `<!-- RAPOR SONU -->` olsun.
- İçeriği yeniden yazma. Karar gerektiren bir sorun görürsen değiştirme, raporla.

**Rapor:** `{{CK}}/_yonetim/denetim/{{KAPSAM_KISA}}_birlestirme.md`: tarih, çıktı, yedek, dokunulmayanlar; 1. yapılanlar tablosu; 2. biçim ve künye işlemleri (kısaltılan atıflar, eklenen kısaltmalar, kaynakçaya eklenenler); 3. sayılar ve betik sonucu (kelime, atıf eşleşmesi, kaynakça sayısı, şüpheli eşleşmeler, süreç betiği kırmızıları); 4. okuyucu diline çevrilen ifadeler; 5. karar gerektiren ve açık noktalar.

**Son yanıtın** (en fazla 200 kelime): birleştirilen kısımlar; ana metin kelime sayısı; atıf sayısı ve eşleşme sonucu; kaynakça sayısı ve şüpheli eşleşmeler; eklenen kısaltmalar; bağlantı ve atıf düzeltmeleri; varsa Word/PDF yolları, sayfa sayısı ve doğrulama sonucu.
```
