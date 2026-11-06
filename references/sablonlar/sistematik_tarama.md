# Şablon: Sistematik tarama (protokol § J)

## Ne zaman, kim

- Sistematik derleme ve meta-analizde; tezde "literatürde boşluk var" iddiasının dayanağı olan taramada. Anlatısal derlemede gerekmez (SANRA yeterlidir).
- Aşama 1'deki serbest akışlar kapsamı belirler; bu akış Aşama 2'den önce başlar, Yöntem ve Bulgular birimleri bu dosyalara dayanır.
- Bütün dosyalar `research_notes/sistematik/` altındadır. Sayılar dosyalardan betikle üretilir; hiçbir sayı bellekten yazılmaz.
- Her eleme ve veri çıkarma adımını iki bağımsız ajan yapar (temiz bağlam, `effort: max`, birbirinin çıktısını görmeden). Uyuşmazlığı üçüncü bir ajan veya kullanıcı çözer.

| Adım | Kim | Çıktı |
|---|---|---|
| 1. Protokol | Ajan taslak yazar, kullanıcı onaylar | `protokol.md` (PRISMA-P maddeleriyle) |
| 2. Arama | Ajan; ücretli veri tabanında kullanıcı | `arama_gunlugu.md`, `ham/<veritabanı>.ris` veya `.csv` |
| 3. Tekilleştirme | Betik | `kayitlar.csv` (tekil), `tekillestirme.md` (kaç kayıt düştü, hangi kurala göre) |
| 4. Başlık–özet elemesi | İki ajan, sonra uzlaşma | `eleme_baslik_ozet.csv` |
| 5. Tam metin elemesi | İki ajan, sonra uzlaşma | `eleme_tam_metin.csv` (dışlama gerekçeli) |
| 6. Veri çıkarma ve yanlılık riski | İki ajan, sonra uzlaşma | `veri_cikarma.csv`, `yanlilik_riski.csv` |
| 7. Sayılar | Betik | `prisma_sayilari.md` |
| 8. Sentez | Yazar; meta-analizde kod ve veri | `analiz/` (kod, veri, çıktı), yöntem denetçisi yeniden çalıştırır |

## Doldurulacaklar

| Yer tutucu | Ne yazılır |
|---|---|
| `{{SORU}}` | PICO/PECO biçiminde soru. |
| `{{OLCUTLER}}` | Dahil etme ve dışlama ölçütleri (çalışma türü, popülasyon, maruziyet, sonlanım, dil, yıl). |
| `{{VERITABANLARI}}` | PubMed/MEDLINE, Embase, Web of Science, Scopus, Cochrane, TR Dizin … ve erişim yolu. |
| `{{ARAC}}` | Yanlılık riski aracı: RoB 2, ROBINS-I, Newcastle–Ottawa, JBI. |

## Arama brifi

```markdown
Sen "{{BASLIK}}" çalışmasının arama ajanısın. Soru: {{SORU}}. Ölçütler: {{OLCUTLER}}. Veri tabanları: {{VERITABANLARI}}.

1. Her veri tabanı için arama dizisini yaz (kontrollü sözcükler, ör. MeSH, ve serbest sözcükler; alan etiketleri). Diziyi `research_notes/sistematik/arama_gunlugu.md`'ye tam metniyle, tarih, filtre ve sonuç sayısıyla yaz.
2. Erişebildiğin veri tabanında aramayı çalıştır, sonuçları `ham/` altına RIS veya CSV olarak kaydet. PubMed eklentisi yoksa E-utilities (esearch, efetch) kullanılabilir. Ücretli veri tabanı için diziyi hazırla, aramayı kullanıcının yapacağını ve dosyayı nereye koyacağını yaz.
3. Sonuç sayısını uydurma; çalıştıramadığın aramaya sayı yazma.
Son yanıtın en fazla 100 kelime: veri tabanı başına sayı ve kullanıcıdan beklenenler.
```

## Eleme brifi (iki ajana ayrı ayrı)

```markdown
Sen bağımsız bir eleme değerlendiricisisin (değerlendirici {{A_VEYA_B}}). Öbür değerlendiricinin kararlarını görmüyorsun ve aramaman gerekiyor.

Ölçütler: {{OLCUTLER}}. Kayıtlar: `research_notes/sistematik/kayitlar.csv` (kayit_id, başlık, özet, yıl, DOI, PMID).
Her kayıt için karar ver: dahil / dışla / belirsiz. Dışla kararında hangi ölçüte takıldığını kısa yaz. Belirsizleri tam metin aşamasına bırak.
Çıktı: `research_notes/sistematik/eleme_{{ASAMA}}_{{A_VEYA_B}}.csv` (kayit_id, karar, gerekce). Başka dosyaya yazma. Dosyanın son satırı `# RAPOR SONU`.
Son yanıtın en fazla 60 kelime: kaç dahil, kaç dışla, kaç belirsiz.
```

Uzlaşma: orkestratör iki dosyayı betikle karşılaştırır. Uyuşan kararlar doğrudan geçer; uyuşmayanlar üçüncü bir ajana (aynı brif, yalnız uyuşmayan kayıtlar) veya kullanıcıya gider. Birleşik dosya `eleme_<aşama>.csv`: kayit_id, karar_A, karar_B, uzlasma, gerekce. Uyuşma oranı (yüzde ve Cohen kappa) `prisma_sayilari.md`'ye yazılır.

## Veri çıkarma ve yanlılık riski

Form önceden yazılır (çalışma kimliği, ülke, tasarım, örneklem, maruziyet ve sonlanım tanımları, etki ölçüsü ve güven aralığı, düzeltilen karıştırıcılar). İki ajan aynı formu bağımsız doldurur; farklar tam metinden üçüncü bir ajanla çözülür. Yanlılık riski {{ARAC}} ile aynı biçimde değerlendirilir. Tam metne erişilemeyen çalışma "tam metin yok" diye dışlama gerekçesine yazılır; özetten veri çıkarılmaz.

## PRISMA sayıları (betik)

```python
# research_notes/sistematik/ altında çalıştır: python3 -I prisma_say.py
import csv, pathlib
def say(dosya, alan="uzlasma"):
    sat = list(csv.DictReader(open(dosya, encoding="utf-8-sig")))
    return {k: sum(1 for s in sat if s[alan] == k) for k in ("dahil", "dışla", "belirsiz")}, len(sat)
ham = sum(1 for p in pathlib.Path("ham").glob("*") for _ in open(p, encoding="utf-8-sig") if _.startswith(("TY  -", "PMID-")))
bo, n_bo = say("eleme_baslik_ozet.csv")
tm, n_tm = say("eleme_tam_metin.csv")
print(f"Ham kayıt (RIS/MEDLINE başlıkları): {ham}\nTekil kayıt: {n_bo}\n"
      f"Başlık–özette dışlanan: {bo['dışla']}\nTam metne alınan: {n_tm}\n"
      f"Tam metinde dışlanan: {tm['dışla']}\nDahil edilen: {tm['dahil']}")
```

Betik CSV ham dosyaları saymaz; CSV ile gelen ham kayıtlar `arama_gunlugu.md`'deki sayıyla ayrıca eklenir. Tam metinde dışlanan çalışmaların gerekçe dağılımı `eleme_tam_metin.csv`'nin `gerekce` sütunundan sayılır. Çıktıyı `prisma_sayilari.md`'ye yaz; Yöntem ve Bulgular birimleri sayıları yalnız bu dosyadan alır.
