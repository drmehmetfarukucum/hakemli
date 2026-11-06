# Araç paketi (isteğe bağlı)

Bu klasör skill'le birlikte gelir ama **kendiliğinden kurulmaz**. Orkestratör, kullanıcının onayıyla klasörün içeriğini projedeki `<çıktı klasörü>/_araclar/` altına kopyalar. Kopyalamadan önce kullanıcıya ne yapacaklarını ve neye ihtiyaç duyduklarını söyler (aşağıda "Gereken ortam").

İki araç vardır:

| Araç | Dosyalar | Ne yapar |
|---|---|---|
| Süreç betiği | `surec_denetimi.py`, `surec_ayarlari.json` | Birim dosyalarını ve ana metni mekanik olarak denetler: hacim, atıf eşleşmesi, iç yönetim dili, cümle uzunluğu, kabul edilen birimin denetim raporu ve karar defteri kaydı, birleştirilmiş bölümün süreç raporu, `ilerleme.md` tutarlılığı. Sonuç `_yonetim/denetim/surec_durumu.md`. Yalnız okur, rapor yazar. |
| Word/PDF üretimi | `uret.sh`, `ara_surum_uret.js`, `dogrula.js`, `pdf_metin.js`, `word_guncelle_pdf.applescript`, `ayarlar.ornek_*.json`, `kaynakca_eslestirme.json` | Markdown ana metinden kurum veya dergi biçiminde `.docx` üretir; macOS'ta Microsoft Word ile içindekiler ve PDF'i günceller; çıktıyı otomatik denetler. Metni değiştirmez. |

`ornek_marmara_bicim_kurallari.md`: Bir kurum kılavuzunun nasıl özetleneceğine örnek (Marmara Üniversitesi SBE). Kural tablosu, kılavuzun sessiz kaldığı yerlerde seçilen varsayılanlar ve sapmalar sayfa numaralarıyla yazılır. Yeni kurum için aynı yapıda `<kurum>_bicim_kurallari.md` yazılır; **kılavuzun resmî metni bulunup okunmadan biçim kuralı yazılmaz.**

## Kurulum (orkestratör, kullanıcı onayından sonra)

1. Kopyala: `cp -R <skill>/assets/araclar/. <çıktı klasörü>/_araclar/`
2. **Süreç betiği:** `surec_ayarlari.json` içinde `ana_metin`, `birimler`, `bolumler`, `atif_turu` ve (tam modda) `surec_raporu` alanlarını plana göre doldur. Hacim sınırları `yazim_kilavuzu.md` §6.2 tablosundan okunur. Çalıştır: `python3 <çıktı klasörü>/_araclar/surec_denetimi.py`.
3. **Word/PDF:** Kurum veya dergi kılavuzunun resmî metnini bul ve `<kurum>_bicim_kurallari.md` olarak özetle. `ayarlar.ornek_marmara_tez.json` (tez, dipnot), `ayarlar.ornek_makale.json` (Türkçe makale, numaralı atıf) veya `ayarlar.ornek_makale_apa_en.json` (İngilizce makale, APA 7 yazar–tarih) dosyasını `ayarlar.json` adıyla kopyala; yolları, `bicim`, `kapak` ve `bolumler` alanlarını kurallara göre değiştir. Çalıştır (proje kökünden): `bash <çıktı klasörü>/_araclar/uret.sh --tarih YYYY-AA-GG`. Ayar dosyası bozuksa, zorunlu alan (`ana_metin`, `birim_klasoru`, `cikti_klasoru`, `cikti_adi`, `kayit_klasoru`, `bolumler`) eksikse, sayısal biçim alanı sayı değilse veya tarih takvimde yoksa araç hangi alanın yanlış olduğunu söyleyip durur.

## Süreç betiği ayrıntıları

- **Çıkış kodları:** 0 kırmızı yok; 1 kırmızı madde var; 2 ayar veya zorunlu dosya hatası. Kod 2'de `surec_durumu.md` "Betik hata verdi: …" diye güncellenir, eski yeşil rapor yerinde kalmaz.
- **Ayar:** `_` ile başlayan anahtarlar açıklamadır. Tanınmayan anahtar kırmızıdır; yanlış tipte değer, geçersiz regex veya `{kod}` dışında yer tutucu taşıyan rapor kalıbı çıkış 2 verir. `atif_turu` yalnız `"dipnot"` veya `"anahtar"` olur; `anahtar` hem numaralı hem yazar–tarih sistem içindir.
- **Atıf sözdizimi:** `[@a]`, `[@a; @b]`, `[@a, s. 12]`, `[-@a]`. Kaynak tanımları yalnız `### Birim kaynakçası (<BİRİM>)` kısmından okunur. Eşleşme tek yönlüdür: metindeki her anahtarın tanımı aranır; kaynakçada olup metinde kullanılmayan künyeyi Word aracı uyarır.
- **Denetimler:** hacim ve atıf sınırı; atıf eşleşmesi ve yinelenen tanım; atıf türüyle uyuşmayan işaret (anahtar modunda `[^x]`, dipnot modunda `[@x]`); iç yönetim dili; cümle uzunluğu (paragraf içi satır sonları birleştirilerek); birimde, ana metinde ve yönetim dosyalarında doldurulmamış `{{…}}` (yorumlar hariç); karar defterinde yinelenen `### K-nnn — …` numarası; kabul edilen birimde iki rapor ve karar defteri kaydı (yorumlar çıkarılarak); `revizyonda (tur n)` durumunda o turun raporları (`denetimde (tur n)` iken eksik rapor yalnız nottur); `rapor_bitis_isareti` (örnek ayarda `<!-- RAPOR SONU -->`) son satırda yoksa "rapor yarım"; teslimden sonra kalan `DEVAM EDİYOR`; teslim edilmiş birimde devir notu kısmı; iki sürüm izi (iki yazar işareti, iki devir notu, yinelenen başlık); `bolumler/_arsiv/<BİRİM>_kabul_<YYYY-AA-GG>.md` varsa en yenisiyle karşılaştırma ("kabulden sonra değişmiş"); ana metnin başlangıç ve bitiş başlığı.
- **Revizyon, devir notu, çerçeve notu:** `revizyonda (tur n)` durumundaki birim için `denetim/revizyon_kararlari.md`'de `## <BİRİM>, tur n` kaydı aranır; yoksa "revizyon mesajı kayıtsız" kırmızıdır. `devir_notu.md`'deki "Dayandığı `ilerleme.md` güncellemesi:" `ilerleme.md`'nin "Son güncelleme:" satırından eskiyse not düşülür; devir notundaki "Son karar: K-nnn" defterin son numarasından farklıysa kırmızıdır. Dolu bir `cerceve_notu.md` için `CN_kaynak_tur*.md` ve `CN_alan_tur*.md` aranır; rapor yokken not onaya sunulmuş veya onaylanmışsa kırmızı, değilse nottur.
- **Notlar bölümü:** kırmızı sayılmayan durumlar: ayarda birim yok (plan onayından önce), planlanmamış birimler (ayarda var, ilerlemede ve diskte yok), ana metin henüz yok (birleştirilmiş birim yoksa), süren denetim, teslim edilmiş görünen ama durumu güncellenmemiş birim, kaynakçada olup metinde atıf yapılmayan künye (anahtarlı atıf).
- **Betiğin denetlemedikleri:** Rapor her zaman bu bölümle biter: içerik ve kaynak doğruluğu, kaynağın gerçekten okunup okunmadığı, `ilerleme.md` §1–§7 uyumu, takılmış oturum veya ajan, "devam et"in kapsamı; her birinin yanında onu kimin denetlediği yazar. Ayrıca o çalıştırmada atlanan denetimler listelenir (ör. kabul arşivi yok, rapor bitiş işareti tanımlı değil). Bu satırlar protokolün § 1 G kuralıyla kullanıcıya taşınır.
- **Türkçe dışı çalışma:** Varsayılan kısaltma listesinde İngilizceler de vardır; iç dil kalıpları için `surec_ayarlari.json`'daki `_ingilizce_ic_dil_ornegi` `ic_dil` alanına taşınır.

## Künye doğrulama (isteğe bağlı)

`kunye_dogrula.py`, künyedeki DOI'yi Crossref'te, PMID'yi PubMed'de sorgular ve kayıtla karşılaştırır: ilk yazarın soyadı, yıl, başlık örtüşmesi, dergi (yalnız bilgi). Uydurma veya yanlış künyeyi denetçiden önce yakalamak içindir; kaynak denetçisinin yerine geçmez. Yalnız okur, rapor yazar. Python 3.9+, ek paket yok; internet gerekir.

- **Çalıştırma:** `python3 <çıktı klasörü>/_araclar/kunye_dogrula.py bolumler/<BİRİM>_….md --kapsam <BİRİM> --onbellek <çıktı klasörü>/_araclar/kunye_onbellek.json` (ana metin için dosyayı ve `--kapsam ana_metin` vermek yeter; birden çok dosya verilebilir). Künyeler `- [@anahtar] …` satırlarından ve `[^etiket]: …` dipnot tanımlarından okunur (girintili devam satırları dahil, yorum ve kod blokları hariç; Markdown kaçışları `\_ \( …`, yumuşak tire ve sıfır genişlikli karakterler DOI'den temizlenir). Rapor `_yonetim/denetim/kunye_dogrulama_<kapsam>.md` (kapsam verilmezse tek dosyada dosya adı, çokta `toplu`; `--rapor` ile değişir), son satırı `<!-- RAPOR SONU -->`. Rapor girdi veya önbellek dosyasının (sembolik bağlantı dahil) ya da `# Künye doğrulama` ile başlamayan bir dosyanın üzerine yazılmaz; bu durumda çıkış 2.
- **Durumlar:** `doğru`; `uyarı` (yıl ±1, ilk yazar ilk sırada değil, başlık örtüşmesi %50–80, künyede yıl yok); `uyuşmaz` (ilk yazar yok, yıl farkı 1'den büyük, başlık örtüşmesi %50'nin altında, aynı eserin PMID kaydındaki DOI künyedekinden farklı); `Crossref/PubMed'de bulunamadı` (doi.org'da elle açılır; uydurma şüphesidir, kanıtı değil: DataCite/mEDRA DOI'si veya yeni kayıt olabilir); `kimliksiz`; `ağ hatası` (şeması beklenmedik yanıt dahil). Geri çekilme, endişe bildirimi ve düzeltme Crossref `updated-by`/`update-to`/`relation` alanlarından ve PubMed bağlantılarından yazılır; **geri çekilmiş yayın kritiktir**. Kimlik geri çekme bildiriminin kendisine aitse "geri çekme bildirimi (yayının kendisi değil)" yazılır, kritik sayılmaz. Bir dipnotta birden çok eser varsa eser sınırı kimliğin bitişi, "; " (öncesinde yıl varsa) veya "Ayrıca bkz." gibi sözdür; DOI ile PMID aynı eser varsayılmaz.
- **Çıkış kodları:** 0 sorun yok (uyarılar raporda); 1 en az bir kritik (Crossref/PubMed'de bulunamadı, uyuşmaz, geri çekilmiş yayın); 2 girdi hatası (dosya yok, boş, UTF-8 değil, varsayılan rapor yeri yok, rapor yolu korumalı, önbellek dosyası bu aracın değil; rapor yolu yazılabilirse "Betik hata verdi" raporu yazılır); 3 kısmi (ağ hatası, kimliksiz künye, `--cevrimdisi` veya hiç künye yok, ör. kapanmamış kod çiti; kritik yok).
- **Ağ:** Yalnız `api.crossref.org` ve `eutils.ncbi.nlm.nih.gov`'a bağlanır, yalnız DOI ve PMID gönderir. Zaman aşımı 20 sn, istekler arası en az 0,5 sn, bir tekrar; bir makinede art arda 3 hatadan sonra kalanlar sorgulanmaz. Ağ yoksa çökmez: künyeler `ağ hatası` olur, rapor yine yazılır. Ağ hatası satırları için araç sonra yeniden çalıştırılır. `--onbellek` yanıtları saklar: bulunan kayıt 30 gün (geri çekilme sonradan gelebilir), bulunamayan 7 gün (yeni kayıtlı DOI'ler); gelecek tarihli veya bozuk kayıt yok sayılıp yeniden sorgulanır. `--cevrimdisi` ağa çıkmadan yalnız DOI/PMID çıkarır ve kimliksizleri listeler.
- **Bildirim:** Raporda ve ekranda "KULLANICIYA BİLDİRİLECEKLER" bloğu: kimliksiz künyeler (kaynak denetçisi elle doğrular), ağ hatası ve nedeni, çevrimdışı çalışma, künye bulunamaması ve kapanmamış kod çiti. Orkestratör bloğu kullanıcıya aynen iletir.
- **Sınırlar:** DOI'siz Türkçe dergi, kitap, mevzuat ve karar doğrulanmaz (DergiPark/TR Dizin sorgusu yok); cilt, sayı, sayfa ve yazar listesinin tamamı karşılaştırılmaz; çeviri başlık "uyuşmaz" görünebilir; eser sınırı bulgusal olduğundan çok eserli dipnotta kimliksiz bir eserin önce gelmesi yazar veya yıl uyarısı doğurabilir.

## Gereken ortam

- **Süreç betiği:** Python 3.9 veya üstü; ek paket yok.
- **Word/PDF:** Node.js 18 veya üstü. İlk çalıştırmada `uret.sh` iki npm paketini (`docx@9.14.0`, `jszip@3.10.2`) sistem geneline değil, yerel bir klasöre kurar (varsayılan `~/.cache/hakemli/node_env`, `TEZ_DOCX_ORTAM` ile değişir); bunun için internet gerekir. İçindekiler sayfa numaraları ve PDF için macOS ve Microsoft Word gerekir; Word, belgeyi kendi korumalı klasöründe işler ve ilk çalıştırmada macOS izin isteyebilir. Word yoksa `--word-yok` ile yalnız `.docx` üretilir. Word adımının süre sınırı `TEZ_WORD_SURE` (saniye; varsayılan 3600) ile değişir; 72 bin kelime ve 860 dipnotluk bir tez yaklaşık 23 dakika sürdü. Word adımı başarısız olur veya süre dolarsa araç yalnız kendi açtığı belgeyi kaydetmeden kapatır ve Word'ün uyarı ayarını (display alerts) eski değerine döndürür; yapamazsa bunu bildirim bloğunda söyler. Python, pandoc ve LibreOffice gerekmez.

## `ayarlar.json` — kuruma bağlı alanlar (`bicim`)

| Alan | Anlamı | Marmara örneği |
|---|---|---|
| `sayfa_cm`, `kenar_cm` | Kâğıt ve kenar boşlukları (üst/alt bilgi dahil) | A4; 2,5 cm; 1,5 cm |
| `yazi_tipi`, `dil` | Yazı tipi ve belge dili. `en` ile başlayan dilde taslak notundaki tarih İngilizce ay adıyla, özet yer tutucuları ve yazılmamış bölüm notu İngilizce yazılır | Times New Roman; tr-TR |
| `metin` | Punto, satır çarpanı, paragraf önü/sonu (nk), ilk satır girintisi, iki yana yaslama | 11; 1,6; 6/6; 1,25 cm; evet |
| `dipnot` | Punto, tam satır aralığı (nk), yaslama | 9; 12; evet |
| `bolum_basligi` | Punto, önü/sonu, yeni sayfa, tümü büyük harf | 12; 30/30; evet; evet |
| `alt_baslik` | Punto, önü/sonu | 12; 15/1,5 |
| `sayfa_numarasi_punto`, `tablo_punto` | | 10; 10 |
| `baslik_numaralandirma` | `hukuk` (I./A./1.), `ondalik` (1./1.1./1.1.1.), `serbest` | hukuk |
| `kapaklar` | Dış ve iç kapak | evet |
| `on_kisim` | Ön kısımların sırası: `ozet`, `abstract`, `onsoz`, `icindekiler`, `kisaltmalar`, `okuma_notu`; boş liste ön kısmı kaldırır | kılavuz 8.4 sırası |
| `on_kisim_basliklari` | Başlık metinleri (ÖZET, ABSTRACT, …, KAYNAKÇA) | |
| `ozet_kelime_siniri`, `oz_dosyasi` | Özet sınırı; Özet/Abstract birim dosyası (`## Özet`, `## Anahtar Kelimeler`, `## Abstract`, `## Keywords`; çok paragraflı özet paragraf paragraf basılır; dosya veya başlık yoksa yer tutucu basılır ve uyarılır) | 250; `Oz_abstract.md` |
| `ozet_dilleri` | Basılacak özetler: `tr` (Özet), `en` (Abstract); varsayılan `["tr", "en"]`, İngilizce makalede `["en"]` | `["tr", "en"]` |
| `calisma_notlari` | Birim sonu "Kaynak kontrolü" ve "Araştırma notu" kısımları basılsın mı (ana metindeki aynı adlı başlıklar ve altları dahil). Ara sürümde `true`; **teslim sürümünde `false`** | `true` |
| `ana_metin_bolumleri` | Ana metindeki `##` başlıklarının adları (Giriş, İçindekiler, Kısaltmalar, Kaynakça) ve alınmayacaklar | |
| `durum_tarihi_etiketi` | Ana metin başındaki `**<etiket>:** …` satırı okuma notuna alınır | Hukuki durum tarihi |
| `kaynakca_kategorileri`, `kaynakca_siralama` | Kategoriler (boş liste: tek liste) ve sıralama (`alfabetik`, `atif_sirasi`) | 4 kategori; alfabetik |
| `atif` | `tur`: `dipnot`, `numarali` veya `yazar_tarih` (başka değerde araç durur); numaralıda `numara_bicimi`, `kaynakca_numara_bicimi`; yazar–tarihte `ve`, `vd`, `yil_yok` (verilmezse İngilizcede `&`, `et al.`, `n.d.`; Türkçede `ve`, `vd.`, `t.y.`), `vd_esigi` (bu sayıda ve üstünde yazar "et al."; varsayılan 3), `yazar_yil_ayraci` (varsayılan `", "`), `coklu_ayrac` (varsayılan `"; "`) | dipnot |

`kapak` alanı kapak satırlarını (kurum, anabilim dalı, program, tez türü, öğrenci, yer ve yıl, jüri) tutar. Kişisel bilgiler yer tutucu kalır; kullanıcı kendisi doldurur.

## Anahtarlı atıf: numaralı (Vancouver vb.) ve yazar–tarih (APA, Harvard, Chicago)

Markdown'da anahtarlar kalır; numara veya yazar–tarih etiketi yalnız Word çıktısında üretilir. Sözdizimi:

| Metinde | Numaralı | Yazar–tarih |
|---|---|---|
| `[@smith2020]` | `[1]` | `(Smith, 2020)` |
| `[@lee2019; @smith2020]` | `[1,2]`; ardışıklar `[4–6]` | `(Lee & Kim, 2019; Smith, 2020)` (alfabetik) |
| `[@smith2020, s. 12; @lee2019]` (virgülden sonrası yer bilgisi: s., ss., p., pp., bölüm, tablo…) | `[1, s. 12; 2]` (aralık sıkıştırılmaz) | `(Lee & Kim, 2019; Smith, 2020, s. 12)` |
| `Smith [-@smith2020]` (anlatı atfı, yalnız yıl) | `Smith [1]` | `Smith (2020)` |

Birim kaynakçası `### Birim kaynakçası (<BİRİM>)` başlığı altındadır; birim ve ana kaynakçada her girdi `- [@anahtar] Künye…` diye başlar. Kaynakçada karşılığı olmayan anahtar Word'de `?anahtar` işaretiyle görünür (ör. `[?yok2020]`), rapora uyarı olarak ve `beklenen.json`'a `eksik_anahtar` olarak yazılır; doğrulama bu durumda KALDI verir. Atıf yapılmayan künye kaynakçaya alınmaz, uyarılır. Numaralıda kaynakça atıf sırasıyla numaralı tek listedir; yazar–tarihte alfabetik tek liste (kategori tanımlıysa kategorili), girdilerde anahtar ve numara yoktur. Süreç betiğinde `"atif_turu": "anahtar"` ayarı aynı eşleşmeyi birim düzeyinde sınar.

**Yazar–tarih etiketi nasıl türetilir.** Önce APA biçimi denenir: yıl parantezinden önceki kısım yazarlardır (`Soyad, A. B., Soyad2, C., & Soyad3, D. (2020).`; Türkçe künyede `ve`; kurum yazarı `World Health Organization. (2020).`; yılsız eser `(n.d.)`/`(t.y.)`). Tutmazsa Vancouver/AMA denenir (`Smith J, Lee K, Kim H. Başlık. Dergi. 2020;12(3):45-67.`, `Smith J, et al. …`, kurum yazarı `World Medical Association. Başlık. Dergi. 2013;…`). İkisi de tutmazsa Word'de etiket yerine anahtar basılır, künye `beklenen.json`'da `etiket_turetilemedi` listesine girer ve doğrulama KALDI verir; çözüm künyeyi bu biçimlerden birine göre düzeltmek ya da elle etiket yazmaktır: `- [@who2020] {WHO, 2020} World Health Organization. (2020). …` (etiket künyeden silinir). Yazar sayısı `vd_esigi`nin altındaysa adlar sayılır (`Smith`, `Smith & Lee`, `Smith, Lee & Kim`), eşik ve üstünde `Smith et al.` yazılır. Aynı yazarın eserleri tek parantezde birleşir: `(Smith, 2019, 2020)`.

**Erişim etiketleri.** Anahtarlı sistemde (numaralı ve yazar–tarih) erişim etiketi kaynakça girdisinin sonunda durur: `- [@a] Künye… [tam metin]`. Word aracı `[tam metin]`, `[özet]`, `[bibliyografik]`, `[ikincil aktarım]` etiketlerini (ve İngilizce karşılıklarını) son metinden siler ve sayısını rapora yazar. Etiket atfın içine yazılmışsa (`[@a, s. 12, özet]`) yer bilgisinden düşürülür (`[2, s. 12]`), bildirim bloğu "kaynakça girdisine taşıyın" der. Son belgede etiket kalırsa doğrulama KALDI verir. Dipnotlu sistemde etiket dipnotun içinde kalır.

**2020a/2020b.** Atıf yapılan eserlerden yazar(lar)ı ve yılı aynı olanlara künyedeki başlığa göre alfabetik harf verilir (APA 7; baştaki "The/A/An" sayılmaz). Harf metindeki etikette (`Smith, 2020a`) ve kaynakça girdisinin yılında (`(2020)` → `(2020a)`, `(n.d.)` → `(n.d.-a)`, Vancouver'da `2020;` → `2020a;`) birlikte uygulanır ve rapora "otomatik harf verildi" diye yazılır. Künyede harf zaten varsa ya da etiket elle verilmişse harfe dokunulmaz. Yazar listeleri farklı olup kısaltılmış etiketi aynı çıkan eserler (iki ayrı `Smith et al., 2021`) harfle ayrılmaz; APA 7 bunlar için ayırt edecek kadar çok yazar adı ister, araç bunu yapmaz: uyarır, `beklenen.json`'a `ayni_etiket` olarak yazar ve doğrulama KALDI verir. Çözüm `{Smith, Lee et al., 2021}` gibi ayırt edici elle etikettir.

**Yazar–tarih stilleri.** Aynı araç üç yaygın stile ayarla uyar; tablodaki ayarlar `bicim.atif` içine yazılır (`tur: "yazar_tarih"`). Kurum veya derginin kılavuzu ayrıntıda farklıysa kılavuz esastır.

| Stil | `ve` | `vd` | `vd_esigi` | `yazar_yil_ayraci` | `coklu_ayrac` | `yil_yok` | Örnek | Desteklenmez |
|---|---|---|---|---|---|---|---|---|
| APA 7 | `&` | `et al.` | 3 | `", "` | `"; "` | `n.d.` | `(Lee & Kim, 2019; Smith et al., 2020, p. 4)` | Anlatı atfında "and" (yazar elle yazar: `Lee and Kim [-@lee2019]`); kurum adının ilk atıfta kısaltmasıyla verilip sonra kısaltılması (`{WHO, 2020}` ile sabit etiket verilebilir); aynı "et al." etiketini ek adlarla ayırma |
| Harvard (Cite Them Right) | `and` | `et al.` | 4 | `", "` | `"; "` | `no date` | `(Smith, Lee and Kim, 2020)` | Kuruma göre değişen Harvard varyantları (kılavuza bakın); parantez içindeki sıra her zaman alfabetiktir |
| Chicago yazar–tarih | `and` | `et al.` | 4 (18. baskı: 3) | `" "` | `"; "` | `n.d.` | `(Smith and Lee 2020, 12)` | Üç yazarda dizi virgülü (`Smith, Lee, and Kim`; araç `Smith, Lee and Kim` yazar); parantez içindeki sıra yazara bırakılmaz, alfabetiktir |

Bütün stillerde: ilk atıfta bütün yazarları sayıp sonraki atıflarda kısaltan kurallar (ör. APA 6'nın 3–5 yazar kuralı) desteklenmez, etiket her atıfta aynıdır; yer bilgisi metinde yazıldığı gibi basılır (Chicago için `[@a, 12]`, APA için `[@a, p. 12]`).

## Çıktılar ve kullanıcıya bildirim

Her çalıştırmanın sonunda tek bir **"KULLANICIYA BİLDİRİLECEKLER"** bloğu yazılır (ekranda, `_dogrulama.txt`'nin sonunda; üretim raporunun başında da aracın kendi kısmı). Her satır ne olduğunu, nedenini ve kullanıcının ne yapabileceğini söyler: geçici ayar (`_durum`), kaynakçada karşılığı olmayan anahtar, etiketi türetilemeyen künye, otomatik harf verilenler, harfle ayrılamayan etiket çakışması, karar bekleyen şüpheli eşleşmeler, yazılmamış bölümler, atıf yapılmayan künyeler, Özet eksikliği; `uret.sh`'de ayrıca Node yok veya eski, npm kurulumu (internet) başarısız, Word yok, Otomasyon izni yok, zaman aşımı, Word hatası, PDF oluşmadı, `--word-yok`, KALDI denetimleri. Bildirilecek bir şey yoksa "Bildirilecek sınır yok." yazılır. Orkestratör bu bloğu kullanıcıya aynen iletir.

`uret.sh` çıkış kodları:

| Kod | Anlamı |
|---|---|
| 0 | Tam: istenen bütün çıktılar üretildi, denetimler geçti (`--word-yok` ile ertelenen içindekiler denetimi hariç) |
| 1 | Çıktı üretildi ama en az bir denetim KALDI ya da doğrulama çalışmadı (3'ten önceliklidir) |
| 2 | Hiçbir çıktı üretilmedi: seçenek hatası, Node yok veya 18'den eski, npm kurulumu (internet) başarısız, ayar veya kaynak hatası |
| 3 | Kısmi: `.docx` üretildi ve denetimler geçti ama Word adımı istendiği hâlde yapılamadı (Word yok, Otomasyon izni yok, zaman aşımı, Word hatası, PDF oluşmadı); içindekiler sayfa numaraları ve/veya PDF eksik. Word'süz çözüm: `.docx`'i Word'de açıp ⌘A, F9 (fn+F9) ile alanları güncellemek ve PDF olarak kaydetmek; izin için Sistem Ayarları > Gizlilik ve Güvenlik > Otomasyon |

Dosyalar:

- `<cikti_klasoru>/<cikti_adi>.docx` ve `.pdf`
- `<kayit_klasoru>/<ad>_rapor.txt`: atıf sayıları, kaynakça birleştirmeleri, **şüpheli eşleşmeler** (karar `kaynakca_eslestirme.json`'a yazılır), alınmayan kısımlar, uyarılar.
- `<kayit_klasoru>/<ad>_dogrulama.txt`: otomatik denetimlerin sonucu (atıf eşleşmesi, karşılıksız anahtar ve türetilemeyen yazar–tarih etiketi, Markdown kalıntısı (`[@`, `[-@`, `[?`, `{{…}}` dahil), devir notu sızıntısı, başlık hiyerarşisi ve numaralandırma, bölüm ve sayfa numaraları, sayfa yapısı, stiller, içindekiler, PDF metni ve sayfa dizisi).
- `beklenen.json` ve rapor `.docx` başarıyla yazıldıktan sonra yazılır. Aynı adlı eski PDF her çalıştırmada silinir; PDF yalnız Word bu çalıştırmada ürettiyse vardır.

**`--word-yok` ve `--taslak`.** `uret.sh --word-yok` ile (ya da Word adımı yapılamadığında: Word yok, izin yok, zaman aşımı, Word hatası) Word adımı atlanır ve `dogrula.js` `--taslak` ile çalışır: Word'ün dolduracağı içindekiler sayfa numaraları denetimi KALDI yerine ERTELENDİ yazılır ve sonuç satırında ayrıca sayılır (`36/37 denetim geçti; 1 ertelendi`). Ertelenen denetim başarısızlık sayılmaz ama teslimden önce Word'lü bir çalıştırma gerekir. Elle: `node dogrula.js <docx> <beklenen.json> [--pdf-metin dosya] [--taslak]` (seçenekler herhangi bir sırada).

## Metin nereden okunur

- Giriş ve ana metinde `## <plan_adi> — <başlık>` biçiminde birleştirilmiş bölümler ana metinden alınır.
- Henüz birleştirilmemiş bölümler için birim dosyaları (`bolumler/<KOD>_….md`) kullanılır: metin alınır; kaynak kontrolü ve araştırma notu `calisma_notlari` açıksa alınır; **devir notu (`### Orkestratöre devir notu`, `### Devir notu (…)`), yoğunlaştırma notu ve altındaki her şey alınmaz.** Birleştirilmiş bölümün birim dosyası yalnız devir notu sızıntısını ve birleştirme sonrası farkı yoklamak için okunur.
- Markdown dosyalarında UTF-8 BOM ve Windows satır sonları (CRLF) sorun çıkarmaz.
- Dosyası olmayan birimler için "[Bu kısım (…) henüz yazılmamıştır.]" notu konur. Hiç yazılmamış bölümler İçindekiler üretilen düzende (tez) İçindekiler'in altında listelenir; İçindekiler'siz düzende (makale) bölüm başlığıyla birlikte "[Bu bölüm henüz yazılmamıştır.]" notu metne konur.
- Dipnotlu sistemde kaynakça tekilleştirilir: birebir aynı metin, güçlü kimlik (DOI, ISBN, PMID, YÖK Tez No., kanun ve karar numaraları) veya aynı belirli bağlantı birleştirir. DOI, ISBN, PMID veya Tez No.'su çelişen künyeler başka bir eşleşme olsa da birleştirilmez (rapora not düşülür); yalın alan adı ve site veya dergi ana sayfası bağlantısı eşleşme kanıtı sayılmaz.
