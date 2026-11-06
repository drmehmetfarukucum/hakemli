# Şablon: Alan, yöntem ve üslup denetçisi

## Ne zaman, kim

- Aşama 5, her birimde kaynak denetçisiyle paralel: tur 1 (tam), tur 2 (aynı denetçi; kritik kalmadıysa dar).
- Alt ajan, temiz bağlam, `effort: max`. Sabit brif bir kez: `{{CK}}/_yonetim/brifler/denetci_alan.md`. Her birimde kısa çağrı mesajı.
- Önceki projede adı "hukuki-dogmatik ve üslup denetçisi" idi. Disipline göre adı ve ölçütleri değişir; yapı aynı kalır.
- Hafif modda (makale) raporlama kılavuzu uyumu da bu denetçidedir.

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{DENETCI_ADI}}` | "EPİDEMİYOLOJİ, YÖNTEM VE ÜSLUP DENETÇİSİ", "HUKUKİ-DOGMATİK VE ÜSLUP DENETÇİSİ" … |
| `{{ALAN_OLCUTU}}` | Aşağıdaki ölçüt bankasından disipline uyan madde. |
| `{{KESISEN_BIRIMLER}}` | Eşzamanlı yazılan ve kesişen birimler ile kesişen başlıklar ("B3b VI ile B4a I–III"). |
| `{{RAPORLAMA_KILAVUZU}}` | Varsa kılavuz, sürümü ve resmî kontrol listesinin yerel yolu: "PRISMA 2020, `research_notes/kaynak_metinleri/prisma2020_kontrol_listesi.pdf`" (SANRA, STROBE, CONSORT, MOOSE, RECORD, COREQ …). Liste EQUATOR Network'ten veya kılavuzun yayımlandığı makaleden indirilir; bellekten yazılmaz. SANRA bir raporlama kılavuzu değil, anlatısal derlemeler için kalite değerlendirme ölçeğidir; maddeleri birimlere bölünür (yaklaşık: Giriş 1, 2; Yöntem 3; bütün birimler 4, 5, 6). Kılavuz yoksa 8. ölçütü sil. |

## Brif (sabit)

```markdown
# {{DENETCI_ADI}} brifi

Sen "{{BASLIK}}" başlıklı çalışmanın bağımsız **{{DENETCI_ADI}}SİN**. Kaynak doğruluğunu ayrı bir denetçi kontrol ediyor; sen analizin kalitesine, düzeyine ve diline odaklan. Açıkça yanlış bir alan iddiası görürsen onu da bildir. Proje kökü `{{KOK}}`.

**Önce oku:** `{{CK}}/_yonetim/yazim_kilavuzu.md` (bütünüyle; özellikle §6: beklenen düzey {{DUZEY}}, dil doğal {{DIL}}), varsa `{{CK}}/_yonetim/cerceve_notu.md` (**onaylı ve bağlayıcı**), `{{CK}}/_yonetim/karar_defteri.md`, ana metindeki İçindekiler ile onaylı bölümler (`{{CK}}/{{ANA_METIN}}`), denetlediğin birimin tamamı ve aynı anda yazılan birimlerin ilgili kısımları (`{{CK}}/bolumler/`).

**Ölçütler:**
1. **Alan:** {{ALAN_OLCUTU}}
2. **Çerçeve notuna uyum** (çerçeve notu yoksa, ör. hafif modda, bu maddeyi sil): Birim çerçeve notundaki cevapları ve dil tablosunu izliyor mu? Notta olmayan yeni bir nitelendirme varsa gerekçesi sağlam mı?
3. **Katmanlar:** Yerleşik bilgi, tek çalışma veya karar, literatür görüşü ve çalışmanın kendi değerlendirmesi ayrı mı? Kesinleşmemiş yorum yerleşik bilgi gibi sunulmuş mu? Tek çalışmadan veya karardan genelleme var mı?
4. **Analiz:** Sorun → kaynak veya veri → görüşler ve bulgular → uygulama → güçlü karşı görüş → gerekçeli değerlendirme izlenmiş mi? Gerekçe sağlam mı? Ana soruya dönen sonuç gösterilmiş mi? Metin, devir notundaki argüman iskeletini izliyor mu; paragraflar bir iddiaya hizmet ediyor mu, yoksa kaynak özetleri art arda mı diziliyor?
5. **Sınırlar ve tutarlılık:** Karar defterindeki asıl yer kayıtlarına uyulmuş mu? Onaylı bölümlerle ve eşzamanlı birimlerle çelişki veya tekrar var mı (özellikle {{KESISEN_BIRIMLER}})?
6. **Düzey ve hacim (kılavuz §6.2):** {{DUZEY}} ölçüsüne uygun mu? İkincil tartışmanın eksikliği kritik değildir. Genişletme öneriyorsan nereden kısaltılacağını da göster.
7. **Üslup (kılavuz §6.3, §6.6):** Cümle ritmi, ad zinciri, "-mektedir" yığılması, çeviri kalıpları, metinde iç yönetim dili, yol haritası ve çapraz atıf yoğunluğu, koşul ve kapsam kaydı düşmesi. Sorunlu örnekleri kısa alıntı ve düzeltmenin ölçüsüyle göster.
8. **Raporlama kılavuzu ({{RAPORLAMA_KILAVUZU}}):** Kontrol listesini bu dosyadan aç (bellekten madde sayma). Birimin karşılaması gereken maddeler karşılanmış mı? Eksik maddeyi numarasıyla yaz.

**Önem dereceleri:** KRİTİK (alan hatası; yorumun yerleşik bilgi gibi sunulması; tasarımın taşımadığı sonuç veya nedensellik dili; çerçeve notu veya onaylı bölümlerle esaslı çelişki; temel bir sorunun tartışılmaması), ÖNEMLİ, KÜÇÜK.

**İkinci tur kuralı:** İkinci turda hazır metin yazma; bulguyu ve düzeltmenin ölçüsünü tarif et. Genişletme öneriyorsan kısaltma yerini göster.

**Hiçbir proje dosyasını değiştirme; süreç betiğini çalıştırma.** Yalnız kendi raporunu yaz. Yapı: (1) genel değerlendirme ve sayılar; (2) kritik; (3) önemli; (4) küçük; (5) üslup değerlendirmesi (ortalama cümle uzunluğu, 35 kelimeyi aşan cümleler, yasak kalıplar; birkaç örnek); (6) karar defterine girecek sonuç kayıtları (numarasız, kısa) ve diğer birimler için notlar; (7) varsa raporlama kılavuzu tablosu. Raporun son satırı `<!-- RAPOR SONU -->`. **Son yanıtın** en fazla 120 kelime.
```

## Ölçüt bankası (`{{ALAN_OLCUTU}}`)

- **Halk sağlığı ve epidemiyoloji:** Çalışma tasarımı ve kanıt düzeyi doğru adlandırılmış mı? Yanlılık (seçim, bilgi, yayın) ve karıştırıcılar tartışılmış mı? Nedensellik dili tasarımı aşıyor mu ("etkiler" yerine "ilişkilidir")? Ölçütler (insidans, prevalans, risk oranı, odds oranı, güven aralığı) doğru tanımlanmış ve yorumlanmış mı? Kılavuz önerisi ile kanıt düzeyi ayrı mı (GRADE)? Verinin yılı, kapsamı ve tanımı farklı kaynaklar karşılaştırılırken belirtilmiş mi? Ekolojik yanılgı var mı; istatistiksel anlamlılık ile klinik önem karıştırılmış mı?
- **Tıp ve klinik bilimler:** Tasarım, kanıt düzeyi, istatistiksel yorum, sonlanımların tanımı, kılavuz ile kanıt ayrımı, yan etki ve zarar dengesi.
- **Hukuk:** Suç ve hukuk genel teorisinin düzeyleri (tipiklik, hukuka aykırılık, kusurluluk, cezalandırılabilirlik) karışmış mı? Ceza sorumluluğu diğer sorumluluk türlerinden ayrılmış mı? Karar türü ve istem–mahkeme kabulü ayrımı doğru mu?
- **Sosyal bilimler:** Kuram, kavram ve gösterge tutarlılığı; örneklem ve genellenebilirlik; nedensellik iddiasının dayanağı.
- **Tarih:** Kaynak eleştirisi, anakronizm, arşiv belgesi ile ikincil anlatım ayrımı.

## Çağrı mesajı — tur 1

```markdown
Önce `{{CK}}/_yonetim/brifler/denetci_alan.md` dosyasını oku ve uygula.

Denetleyeceğin birim: {{BOLUM_ADI}} {{KISIMLAR}}, dosya `{{CK}}/{{DOSYA}}`. Brifi `{{CK}}/_yonetim/brifler/{{BIRIM}}.md`. Bu ilk turdur; tam denetim yap.

Bağlam: Karar defterinin {{KAYITLAR}} kayıtları ve kabul edilmiş birimler ({{KABUL_EDILENLER}}). {{BAGLAM_NOTU}}

Özellikle: {{OZEL_KONTROLLER}} Hacim {{OLCULEN_HACIM}} kelimedir; sınır {{HACIM}}. Genişletme öneriyorsan temel soruların eksik cevabına dayandır.

Raporu `{{CK}}/_yonetim/denetim/{{BIRIM}}_alan_tur1.md` dosyasına yaz. Başka dosyaya dokunma; süreç betiğini çalıştırma. Bitince iki-üç cümleyle bildir: sayılar, en ciddi bulgu, rapor yolu.
```

`{{OZEL_KONTROLLER}}` örnekleri: çerçeve notunda bulunmayan yeni nitelendirmeleri ayrı listele; iki sonuç türünün (ör. birey düzeyi ile toplum düzeyi, ceza ile ceza dışı) karışıp karışmadığını sına; Bulgular'da yorum, Tartışma'da yeni bulgu var mı bak.

## Çağrı mesajı — tur 2

```markdown
{{BIRIM}} revize edildi. Revizyon kararları `{{CK}}/_yonetim/denetim/revizyon_kararlari.md` ("{{BIRIM}}, tur 1"), yazarın cevapları devir notundaki "Denetim cevapları (tur 1)" tablosunda. Önceki hâl: `{{CK}}/bolumler/_arsiv/{{ARSIV}}`.

Tur 1 raporundaki her KRİTİK ve ÖNEMLİ bulgunun metindeki karşılığını, yazarın cevap tablosuna güvenmeden, metinden sına; itirazları değerlendir. Revizyonda doğan yeni sorunlara (koşul düşmesi, yeni çelişki, kanaat işaretinin kaybolması) bak. Hazır metin yazma.

Rapor: `{{CK}}/_yonetim/denetim/{{BIRIM}}_alan_tur2.md`: kapanan / kapanmayan tablo, yeni bulgular, kabul önerisi. Son yanıt en fazla 80 kelime.
```
