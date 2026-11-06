# Şablon: Yazar (birim) brifi ve revizyon mesajı

## Ne zaman, kim

- Her iş birimi için bir brif: `{{CK}}/_yonetim/brifler/{{BIRIM}}.md`. Yazar oturumuna veya yazar ajanına "`<yol>` dosyasını oku ve uygula" diye gönderilir.
- Brif yazılmadan önce karar defterindeki asıl yer kayıtları (B bölümü) hazır olmalıdır. Eşzamanlı yazılacak birimlerin kesiştiği her konu için tek bir asıl yer belirlenir.
- Oturum modelini değiştireceksen brifin başına "İlk turda yalnız 'hazırım' yaz." koy. Ayar sonraki turdan geçerlidir; ayarı doğruladıktan sonra brifi gönder.
- Revizyon mesajı aşağıdaki ikinci kalıptır. Kararlar önce `denetim/revizyon_kararlari.md`'ye yazılır, sonra gönderilir.

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{BOLUM_ADI}}`, `{{KISIMLAR}}` | Bölüm adı ve bu birime düşen alt başlık aralığı ("İkinci Bölüm I–III", "Yöntem"). Birim bölümün tamamıysa `{{KISIMLAR}}` yerine "(tamamı)" yaz. |
| `{{BASLIKLAR}}` | Yazılacak başlıklar, numaralarıyla ve gerekiyorsa alt başlıklarıyla. Alt başlıksız birimde (makale Giriş'i gibi) "alt başlık yok; metin doğrudan paragraflarla başlar" yaz ki yazar başlık uydurmasın. |
| `{{DOSYA}}` | `bolumler/<BİRİM>_<kısımlar>.md` |
| `{{ATIF}}` | Dipnotlu sistemde dipnot öneki (`[^b2a-1]`); numaralı veya yazar–tarih sistemde kaynak anahtarı (`[@soyad2020]`, birden çok `[@a; @b]`, sayfalı `[@a, s. 12]`, yazar–tarihte yalnız yıl `[-@a]`). Anahtar metinde kalır; numara veya "(Soyad, 2020)" etiketi yalnız Word çıktısında üretilir. |
| `{{HACIM}}`, `{{ATIF_SINIRI}}` | Ana metin kelime aralığı ve en fazla dipnot veya kaynak sayısı. Alt sınıra yakın mı yazılacağını belirt. |
| `{{KAYITLAR}}` | İlgili karar defteri kayıtları (K-…), çerçeve notunun ilgili kısımları. |
| `{{YONLENDIRMELER}}` | Başlık başlık yönlendirme (aşağıdaki kurallara göre). |

**Yönlendirme yazma kuralları** (önceki projeden):
1. Her yönlendirme bir alt başlığa bağlanır ve o başlığın **asıl yer** mi, **kısa hatırlatma** mı olduğunu söyler. Kısa hatırlatma bir-üç cümle ve çapraz atıftır.
2. Kullanılacak kilit kaynakları ve **nasıl kullanılacaklarını** yaz: "bulguyu alt grup analizi olarak ver, ana sonuç gibi sunma", "ilk derece kabulü olarak kullan, üst mahkeme kabulü gibi sunma".
3. Kapsam kaydını kaynağın lafzıyla taşı. Tek kelime ("ilaçta", "on haftaya kadar", "yalnız kadınlarda") düşerse kural genişler.
4. Bilinen tuzakları söyle: daha önce yanlış aktarılan kaynak, karıştırılan iki kavram, güncellenen düzenleme veya veri.
5. Önceki bölümlere dayan, tekrar etme: "Üçüncü Bölüm V.B'nin sonucunu kullan, yeniden tartışma".
6. Kendi sesinle söylenecek sonuç ile bir yazara atfedilecek formülü ayır.
7. Çerçeve notuyla çelişen yeni bir nitelendirme gerekiyorsa yazar önce orkestratöre bildirir.
8. Yönlendirmenin fiili kanıtın türüne uysun: gözlemsel kanıt için "bilinen sonuçları" değil "ilişkili bulunduğu sonlanımlar (…)" yaz. Brifin dili yazarın diline geçer.
9. Her birimde sınanacak ana iddiayı ve ona yöneltilebilecek en güçlü karşı görüşü bir satırla belirt ("işyeri hekimlerinin ayrı incelenmesi gerektiği iddiasını bir karşı görüşle sına").
10. Kısa tutulacak konularda korunacak öğeleri say (ör. mevzuatta yıl, koşul ve güncel durum) ve ayrıntının yerini söyle (madde numarası, Resmî Gazete bilgisi kaynakçada kalır). "Doğrula, ayrıntıya girme" tek başına yetmez.
11. Bağlam verisinin yeri: hangi verinin bu birimde (ör. Giriş'te yalnız sonlanımlarla ilişki kanıtı), hangisinin başka birimde (ör. yaygınlık karşılaştırmaları Tartışma'da) duracağını karar defterinin B bölümündeki asıl yer kaydıyla yaz.

## Brif

```markdown
# {{BIRIM}} brifi — {{BOLUM_ADI}} {{KISIMLAR}}

Önce `{{CK}}/_yonetim/brifler/ortak.md` dosyasını oku ve uygula. {{EK_OKUMA}}

**Yazacağın başlıklar ({{BOLUM_ADI}}):** {{BASLIKLAR}}

**Çıktı:** `{{CK}}/{{DOSYA}}`. **Atıf:** {{ATIF}}. **Hacim:** ana metin {{HACIM}} kelime, en fazla {{ATIF_SINIRI}} dipnot veya kaynak. {{BOLUM_GIRISI}}

**İlgili kayıtlar:** {{KAYITLAR}}.

**Yönlendirmeler:**
{{YONLENDIRMELER}}

**Sınır:** {{SINIR}}
```

`{{EK_OKUMA}}`: ortak okuma listesine bu birim için eklenenler (birleştirilmemiş önceki birimler, karşılaştırma notları). `{{BOLUM_GIRISI}}`: bölümün ilk birimiyse "İlk `###` başlığından önce bir iki paragraflık kısa bölüm girişi yaz." `{{SINIR}}`: kapsam dışı konular ve en fazla ne kadar değinileceği.

## Özel birimler

**Sonuç veya Tartışma'nın sonuç kısmı**
1. Yeni iddia, kaynak veya öneri yok. Her sonucun bir bölüm atfı olur; atıf bulunamayan cümle yazılmaz, gerekiyorsa orkestratöre bildirilir.
2. Giriş'teki araştırma soruları doğrudan, sırayla ve açık cümlelerle cevaplanır. Soru metni değiştirilmez.
3. Katmanlar korunur; tartışmalı sonuç yerleşik bilgi gibi yazılmaz, "görüş yerleşik değildir" türü kayıtlar düşmez.
4. Öneriler "şu sorun, şu seçenek, şu bedel" sırasıyla ve önceki bölümlerde görünür kılınan boşluklara dayanarak yazılır.
5. Tekrar değil sentez; atıf çoğunlukla metin içi bölüm göndermesidir.

**Özet ve Abstract**
0. Çıktı `bolumler/Oz_abstract.md` (Word aracı bu adı bekler; `bicim.oz_dosyasi`). Başlıklar bu sırayla ve aynen: `## Özet`, `## Anahtar Kelimeler`, `## Abstract`, `## Keywords`. Yalnız İngilizce özet isteyen dergide yalnız son ikisi yazılır (`bicim.ozet_dilleri: ["en"]`).
1. Kurum veya dergi sınırı (çoğunlukla 250 kelime), tek paragraf veya yapılandırılmış özet (Amaç, Yöntem, Bulgular, Sonuç) dergi kuralına göre.
2. Sıra: konu ve araştırma sorusu, yöntem, ana sonuç, başlıca bulgular, öneriler. Yeni iddia, kaynak ve atıf yok; kanaat ile yerleşik bilgi ayrımı korunur.
3. Anahtar kelimeler sayıca ve Türkçe–İngilizce eşleşir; sağlıkta mümkünse MeSH terimi.
4. Abstract çeviri kokmaz. Brife terim tablosu eklenir (Türkçe terim → İngilizce karşılık).
5. Kişisel bilgi yok. Kelime sayısı betikle sayılır.

**Giriş (makale ve derleme)**
1. Boşluk cümlesi taramanın kapsamıyla yazılır ve kesin iddia kurmaz ("bu gruba odaklanan bir derlemeye rastlanmamıştır").
2. **Derlemede:** derlemeye alınacak çalışmaların var olup olmadığı, sayısı ve bulguları Giriş'e değil Bulgular'a aittir; boşluk cümlesi sentez düzeyinde kalır. Yazarın ön taramada gördükleri devir notuna gider. Derlemede ve sistematik derlemede Giriş taramadan önce yazılabilir, ama boşluk ve amaç paragrafları tarama ve Bulgular kabul edildikten sonra aynı yazara dar bir revizyonla yeniden okutulur (protokol § H, "Sıra"; tam modda Giriş'in son gözden geçirmesi aynı biçimde Sonuç'tan önce yapılır).
3. **Özgün araştırmada:** önceki çalışmaların bulguları Giriş'te literatür olarak verilir; Giriş'e girmeyen yalnız araştırmanın kendi sonuçlarıdır.

**Çerçeve notu** (tartışmalı merkez sorular, protokol Aşama 2)
1. Not metne girmez; atıfları kısa verir. Her soru: seçenekler, kaynaklar, seçilen cevap ve gerekçe, birimlere yönlendirme, kullanılacak dil.
2. Not onaylanana kadar birimler bu sorularda nötr dil kullanır.

**Makalede Yöntem ve Bulgular (özgün araştırma)**
1. Yöntem, raporlama kılavuzunun (STROBE, PRISMA 2020, CONSORT vb.) ilgili maddelerini sırayla karşılar; brife madde listesi eklenir.
2. Bulgular yorum içermez; her sayı tablo veya kaynakla birebir eşleşir; yüzdelerin paydası verilir.
3. Tartışma bulguları aşmaz; sınırlılıklar Tartışma'nın ayrı paragrafında toplanır.

**Derlemede Yöntem ve sentez (anlatısal veya sistematik derleme)**
1. Yöntem tarama stratejisini (veri tabanları, arama dizisi, tarih aralığı, dahil etme ve dışlama ölçütleri, tarih) yeniden üretilebilir biçimde yazar; anlatısal derlemede SANRA (bir raporlama kılavuzu değil, kalite değerlendirme ölçeğidir; maddeleri birimlere bölünür), sistematik derlemede PRISMA 2020 maddeleri brife eklenir. Sistematik derlemede yazar taramayı kendisi yapmaz: protokolü, arama günlüğünü ve `prisma_sayilari.md`'yi (protokol § J) kaynak gösterir; akış şemasındaki her sayı o dosyadan alınır.
2. Sentez bölümü çalışma çalışma özet değil, tema temadır; her temada çalışmaların tasarımı, yılı, örneklemi ve sonuçları karşılaştırılır. Çalışmaların bulgusu ile yazarın sentezi ayrı durur.
3. Tartışma sentezi aşmaz; kanıtın gücü ve boşluklar ayrı yazılır; sınırlılıklar Tartışma'nın ayrı paragrafındadır.

## Revizyon mesajı

```markdown
**{{BIRIM}}, tur {{N}} revizyonu.** Raporlar: `{{CK}}/_yonetim/denetim/{{BIRIM}}_kaynak_tur{{N}}.md` ve `{{BIRIM}}_alan_tur{{N}}.md` (varsa `{{BIRIM}}_yontem_tur{{N}}.md`). Hepsini bütünüyle oku.

Dosyanın önceki hâli `{{CK}}/bolumler/_arsiv/{{BIRIM}}_rev{{N}}_{{TARIH}}.md` olarak yedeklendi.

**Bağlayıcı kararlar** (`revizyon_kararlari.md`, "{{BIRIM}}, tur {{N}}"):
1. {{KARAR_1}} (kapsam kaydı kaynağın lafzıyla)
2. ...

**Denetçiler ayrıştığında:** {{SECIM_VE_GEREKCE}}

**Kurallar:** Bütün KRİTİK bulguları gider; bir KRİTİK bulgunun yanlış olduğunu düşünüyorsan metni değiştirmeden önce kanıtıyla (kaynağın yeri, alıntı) itiraz et, orkestratör üçüncü bir okuyucuya baktırır. ÖNEMLİ bulguları gider veya itirazını gerekçesiyle yaz. KÜÇÜK bulguları makul ölçüde gider. Yeni kararlara uy. Hacim: {{HACIM}}; genişlettiğin yerde nereden kısalttığını devir notunda göster. Devir notunun sonuna `#### Denetim cevapları (tur {{N}})` tablosu ekle: bulgu kodu | karar (düzeltildi / kısmen / itiraz) | yer | not. Her kod ayrı satırda.

Bitince 3 cümleyle bildir: kapanan kritik sayısı, itirazlar, yeni kelime ve atıf sayısı.
```

Revizyon mesajını göndermeden önce: kararları `revizyon_kararlari.md`'ye yaz; mesajdaki her kapsam kaydını kaynak başlığıyla karşılaştır. Önceki projede tek kelimelik bir kayıp kritik bir hataya yol açtı.
