# Proje tanımı

> Aşama 0'ın sonucu. Kullanıcı teyit ettikten sonra sonraki bütün aşamalar bu dosyaya bağlıdır. Değişiklik kullanıcı kararıyla olur ve karar defterine (A bölümü) işlenir.
>
> **Teyit:** {{TEYIT_TARIHI}} · **Kullanıcının asıl talimatı:** aşağıda § 9'da aynen.

## 1. Çalışma

| Alan | Değer | Kaynak |
|---|---|---|
| Tür | {{TUR}} <!-- doktora tezi / yüksek lisans tezi / makale: özgün araştırma, sistematik derleme, anlatısal derleme, politika analizi --> | kullanıcı / öneri |
| Mod | {{MOD}} <!-- tam / hafif / ara düzen (protokol § H) --> | |
| Denetim turu | {{DENETIM_TURU}} <!-- tam modda ve ara düzende 2, hafif modda 1 --> | |
| Disiplin ve alt alan | {{DISIPLIN}} | |
| Konu veya taslak başlık | {{BASLIK}} | |
| Kurum ve kılavuz / hedef dergi | {{KURUM}} | |
| Kılavuzun resmî metni | {{KILAVUZ_BAGLANTISI}} <!-- bulunmadıysa "bulunamadı"; biçim kuralı varsayılmaz --> | |
| Dil ve okur | {{DIL_OKUR}} | |
| Düzey | {{DUZEY}} | |

## 2. Türe göre kararlar

<!-- Tezde: özgün katkı, danışman beklentisi, sistematik tarama. Makalede: kelime ve kaynak sınırı, yapı (IMRaD), atıf sistemi, raporlama kılavuzu, ön kayıt, etik kurul. -->

- **Özgün katkı / tek katkı:** {{KATKI}}
- **Yapı:** {{YAPI}}
- **Atıf sistemi:** {{ATIF_SISTEMI}} <!-- dipnot / numaralı (Vancouver) / yazar–tarih (APA) -->
- **Raporlama kılavuzu:** {{RAPORLAMA}}
- **Ön kayıt ve etik:** {{ETIK}}
- **Hedef hacim:** toplam {{TOPLAM_HACIM}}; birim başına `yazim_kilavuzu.md` § 6.2'de (tek kaynak).
- **Durum tarihi:** {{DURUM_TARIHI}} <!-- verilerin, mevzuatın ve literatürün esas alındığı tarih -->

## 3. Yöntem ve kaynaklar

- **Ana yöntem:** {{YONTEM}}
- **Karşılaştırma birimleri ve gerekçesi:** {{KARSILASTIRMA}}
- **Veri setleri ve erişim koşulları:** {{VERI}}
- **Kaynak erişimi:** {{ERISIM}} <!-- kurumsal kütüphane, PubMed, veri portalları; oturum açma ve CAPTCHA kullanıcıya aittir -->
- **Kullanılabilecek araçlar:** {{ARACLAR}}
- **Mevcut materyal:** {{MATERYAL}}

## 4. İşleyiş

- **Model ve akıl yürütme düzeyi:** {{MODEL}}
- **Kota kuralı:** {{KOTA}} <!-- Aşama 0'da ölçülen haftalık kullanım (saatiyle) ve eşik. Önerilen: gönderimde bekleme, yalnız onay noktalarında dur; eşiğe gelince dur, rapor ver, onay bekle. Eşik önce dolan haftalık sayaca uygulanır; 5 saatlik pencere %90'ı geçince yeni dalga yok (protokol Tur 4, madde 10). -->
- **Onay noktaları:** {{ONAY}}
- **Okuma sınırlarının yeri:** {{SINIRLILIKLAR}}
- **Çıktı:** {{CIKTI}} <!-- Markdown ana metin; kurum kılavuzuna göre Word ve PDF -->
- **Türkçe dil cilası:** {{DIL_CILASI}} <!-- protokol Tur 4 madde 15: "yazar teslimden önce `aynen` ile uygular" / "uygulanmaz" -->
- **Araç paketi:** {{ARAC_PAKETI}} <!-- istendi / istenmedi (Aşama 0 kararı); kurulumda kopyalandıysa yanına "kopyalandı" -->
- **Ortam profili:** {{ORTAM}} <!-- protokol Aşama 0, "Ortam profili": istemci (masaüstü uygulaması / CLI); düzey (temel / önerilen / genişletilmiş); var olan araçlar ve erişimler; eksikler, kullanılan yedekler (§ I) ve her eksiğin çıktıya etkisi. Eksikler teslim notunun "Bilinen sınırlar" bölümüne taşınır. -->
- **Varsayılan politikalar:** {{POLITIKALAR}} <!-- protokol Aşama 0'daki listeden; kullanıcının değiştirdikleri işaretli: ayrı kök klasör, "devam et"in kapsamı, kişisel sağlık verisi, beyanlar için yer tutucu -->

## 5. Plan ve iş birimleri (Aşama 2'de doldurulur)

| Birim | Başlıklar | Asıl yer notu |
|---|---|---|
| | | |

Hacim ve atıf sınırları yalnız `yazim_kilavuzu.md` § 6.2'de tutulur (tek kaynak; süreç betiği oradan okur); burada tekrar edilmez.

## 6. Klasör düzeni

- Proje kökü: `{{KOK}}`
- Çıktı klasörü: `{{CK}}` <!-- varsayılan: calisma -->
- Ana metin: `{{CK}}/{{ANA_METIN}}` <!-- varsayılan: Ana metin.md -->

## 7. Açık sorular

<!-- Cevabı bekleyen sorular ve uygulanan varsayılan. -->

## 8. Değişiklikler

<!-- Tarih — değişiklik — karar numarası. -->

## 9. Kullanıcının asıl talimatı (aynen)

{{ASIL_TALIMAT}}
