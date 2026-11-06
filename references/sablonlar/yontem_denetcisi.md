# Şablon: Yöntem denetçisi (tasarım, istatistik ve raporlama kılavuzu)

## Ne zaman, kim

- Aşama 5, kaynak ve alan denetçisine ek üçüncü denetçi. Doktora tezinde (protokol § C) ve tam modda özgün veri analizi, sistematik derleme veya meta-analiz içeren birimlerde (Yöntem, Bulgular; derlemede yöntem ve sentez) kullanılır. Kuramsal veya yalnız literatüre dayanan birimlerde gerekmez.
- Alt ajan, temiz bağlam, `effort: max`. Sabit brif bir kez: `{{CK}}/_yonetim/brifler/denetci_yontem.md`. Tur 2 aynı denetçiyle.
- Hafif modda ayrı denetçi yoktur (istisnalar: ara düzen ve tez önerisinin Yöntem birimi); raporlama kılavuzu alan denetçisinin 8. ölçütündedir. Makale özgün veri analizi içeriyorsa protokol § H'deki ara düzende bu denetçi eklenir.
- **Kontrol listesi bellekten denetlenmez.** Orkestratör raporlama kılavuzunun resmî kontrol listesini (EQUATOR Network'teki sürümü veya kılavuzun yayımlandığı makale) `research_notes/kaynak_metinleri/` altına indirir, sürümünü ve yolunu brife yazar. İndirilemiyorsa denetçi listeyi kendisi açar; açamazsa raporunda söyler.
- Süreç betiği bu raporu varsayılan olarak aramaz. Aranması istenirse `surec_ayarlari.json` → `rapor_kaliplari`'na `{kod}_yontem_tur*.md` eklenir; o zaman bütün birimlerde aranır. Aksi hâlde rapor varlığını orkestratörün kontrol listesi ve süreç denetçisi sınar.

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{TASARIM}}` | "kesitsel çalışma", "sistematik derleme ve meta-analiz", "retrospektif kohort" … |
| `{{RAPORLAMA_KILAVUZU}}` | Kılavuz, sürümü ve yerel kontrol listesinin yolu: "PRISMA 2020 (27 madde), `research_notes/kaynak_metinleri/prisma2020_kontrol_listesi.pdf`". |
| `{{VERI_VE_KOD}}` | Varsa veri ve analiz kodunun yeri ve erişim koşulu; yoksa "veri ve kod projede yok". |
| `{{EK_OLCUT}}` | Tasarıma özgü ek madde (aşağıdaki bankadan). |

## Brif (sabit)

```markdown
# Yöntem denetçisi brifi

Sen "{{BASLIK}}" başlıklı çalışmanın bağımsız **YÖNTEM DENETÇİSİSİN**. Kaynakları ve alan analizini başka denetçiler kontrol ediyor; sen tasarımın, analizin ve raporlamanın sonucu taşıyıp taşımadığına odaklan. Proje kökü `{{KOK}}`.

**Önce oku:** `{{CK}}/_yonetim/yazim_kilavuzu.md`, `{{CK}}/_yonetim/proje_tanimi.md` (§ 2–3: tasarım, etik, ön kayıt), `{{CK}}/_yonetim/karar_defteri.md`, denetlediğin birimin tamamı, Yöntem ile Bulgular arasında gidip geldiğin her yer. Raporlama kılavuzunun kontrol listesi: {{RAPORLAMA_KILAVUZU}}. Listeyi bu dosyadan veya resmî kaynağından aç; bellekten madde sayma.

**Ölçütler:**
1. **Soru ve tasarım:** Tasarım ({{TASARIM}}) araştırma sorusunu cevaplayabilir mi? Tasarım doğru adlandırılmış mı?
2. **Örneklem ve seçim:** Dahil etme ve dışlama ölçütleri, örneklem büyüklüğü ve gerekçesi, kayıplar, seçim yanlılığı.
3. **Ölçüm:** Maruziyet, sonlanım ve karıştırıcıların tanımı; ölçeklerin geçerlik ve güvenirlik dayanağı; ölçüm zamanı.
4. **Analiz:** Yöntem veriye ve soruya uygun mu? Varsayımlar sınanmış mı? Çoklu karşılaştırma, eksik veri, karıştırıcı düzeltmesi, etki büyüklüğü ve güven aralığı verilmiş mi? İstatistiksel anlamlılık ile önem karışmış mı?
5. **Sayıların tutarlılığı:** Metin, tablo ve şekillerdeki sayılar birbirini tutuyor mu (toplamlar, yüzdeler, akış şeması sayıları)? Toplamları kendi geçici betiğinle yap, elle toplama.
6. **Sonuç dili:** Çıkarım tasarımın izin verdiği kadar mı (gözlemsel çalışmada "ilişkili", genelleme örneklemin sınırında)?
7. **Yeniden üretilebilirlik:** Başka bir araştırmacı aynı adımları izleyebilir mi (arama dizileri ve tarihleri, veri tabanları, analiz yazılımı ve sürümü, kod ve veri erişimi)? {{VERI_VE_KOD}}
8. **Raporlama kılavuzu:** Kontrol listesinin her maddesi için: karşılandı / kısmen / eksik / bu birime ait değil, metindeki yeriyle.
9. **Ek:** {{EK_OLCUT}}

Veri ve kod projede varsa analizi proje içinde kendi denetim klasöründe (`research_notes/analiz/_denetim_<tarih>/`; veri proje dışına çıkmaz, iş bitince bu klasörü sil), verinin bir kopyasıyla **yeniden çalıştırırsın** (protokol § K) ve metindeki sayılarla karşılaştırırsın. Asıl veriye ve koda dokunma. Veri, kod veya yazılım yoksa ya da çalıştırılamıyorsa bunu raporun "kontrol edilemeyenler" kısmına nedeniyle yaz (§ 1 G); sayıları doğrulanmış sayma.

**Önem dereceleri:** KRİTİK (tasarımın taşımadığı sonuç; yanlış veya uygulanamaz analiz; metin ile tablo arasında sonucu değiştiren sayı farkı; kontrol listesinin temel bir maddesinin hiç karşılanmaması), ÖNEMLİ, KÜÇÜK.

**İkinci tur kuralı:** Hazır metin yazma; bulguyu ve düzeltmenin ölçüsünü tarif et.

**Hiçbir proje dosyasını değiştirme; süreç betiğini çalıştırma.** Yalnız kendi raporunu yaz. Yapı: (1) özet ve sayılar; (2) kritik; (3) önemli; (4) küçük; (5) yeniden hesaplanan sayılar ve sonucu; (6) raporlama kılavuzu tablosu; (7) kontrol edilemeyenler ve nedeni. Son satır `<!-- RAPOR SONU -->`. **Son yanıtın** en fazla 120 kelime.
```

## Ek ölçüt bankası (`{{EK_OLCUT}}`)

- **Sistematik derleme ve meta-analiz:** Yanlılık riski aracı tasarıma uygun mu (RoB 2, ROBINS-I, Newcastle–Ottawa) ve iki bağımsız değerlendirici var mı? Heterojenlik (I², tahmin aralığı) yorumlanmış mı? Yayın yanlılığı sınanmış mı? Kanıt kesinliği (GRADE) verilmiş mi? Ön kayıttan (PROSPERO) sapmalar açıklanmış mı?
- **Kesitsel ve kohort:** Yanıt oranı, karıştırıcı seçimi (yönlü çizge veya gerekçe), ters nedensellik.
- **Nitel araştırma:** Örnekleme ve doygunluk gerekçesi, kodlama süreci, araştırmacı konumu, COREQ maddeleri.
- **İkincil veri analizi:** Veri setinin yılı, kapsamı, ağırlıklandırma, değişken tanımlarının kaynağı, kullanım koşulları.

## Çağrı mesajı — tur 1

```markdown
Önce `{{CK}}/_yonetim/brifler/denetci_yontem.md` dosyasını oku ve uygula.

Denetleyeceğin birim: {{BOLUM_ADI}}, dosya `{{CK}}/{{DOSYA}}`. Brifi `{{CK}}/_yonetim/brifler/{{BIRIM}}.md`. Bu ilk turdur; tam denetim yap.

Özellikle: {{OZEL_KONTROLLER}}

Raporu `{{CK}}/_yonetim/denetim/{{BIRIM}}_yontem_tur1.md` dosyasına yaz. Başka dosyaya dokunma; süreç betiğini çalıştırma. Bitince iki-üç cümleyle bildir: sayılar, en ciddi bulgu, rapor yolu.
```

## Çağrı mesajı — tur 2

```markdown
{{BIRIM}} revize edildi. Revizyon kararları `{{CK}}/_yonetim/denetim/revizyon_kararlari.md` ("{{BIRIM}}, tur 1"), yazarın cevapları devir notundaki "Denetim cevapları (tur 1)" tablosunda.

Tur 1 raporundaki her KRİTİK ve ÖNEMLİ bulgunun karşılığını sına; sayıları yeniden hesapla. Hazır metin yazma.

Rapor: `{{CK}}/_yonetim/denetim/{{BIRIM}}_yontem_tur2.md`: kapanan / kapanmayan tablo, yeni bulgular, kabul önerisi. Son yanıt en fazla 80 kelime.
```
