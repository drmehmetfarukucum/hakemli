# Yazım kılavuzu

> Bütün yazarlar ve denetçiler bu dosyayı okur. Kurallar kullanıcı kararıyla değişir; değişiklik karar defterine (A bölümü) ve buraya tarihiyle işlenir. Bölüm numaralarını ve "### 6.2 Hacim hedefleri" tablosunun biçimini süreç betiği okur; değiştirme.
>
> Çalışma: "{{BASLIK}}" · Tür ve mod: {{TUR}}, {{MOD}} · Düzey: {{DUZEY}} · Dil: {{DIL}}

## 1. Kalıcı kurallar

<!-- Protokolün § A'sını buraya AYNEN kopyala. Disipline özgü ek kuralları (§ B) ve türe özgü kuralları (§ C) altına "1.1 Disipline göre" ve "1.2 Türe göre" diye ekle. -->

## 2. Birim dosyasının yapısı ve dosya sahipliği

- **Dosya sahipliği katıdır.** Her yazar yalnız kendi birim dosyasına yazar (`{{CK}}/bolumler/<BİRİM>_<kısımlar>.md`). Ana metne, diğer birim dosyalarına, `_yonetim/` dosyalarına ve araştırma notlarına dokunmaz; önerilerini devir notuna yazar. Geçici dosyalar (indirilen PDF'ler, çıkarılmış metinler, betikler) yazarın kendi geçici klasöründe tutulur.
- **Dosya adları:** {{DOSYA_ADLARI}}
- **Yazar işareti:** Birim dosyasının ilk satırı `<!-- yazar: <oturum veya ajan kimliği> · <tarih> -->`. Başka bir yazarın işaretini taşıyan dosyaya yazılmaz.
- **Dört kısım**, bu sırayla:
  1. **Metin** (dipnotlu sistemde dipnot tanımları metnin hemen sonunda, toplu hâlde, etiket sırasıyla; anahtarlı sistemde metinde yalnız `[@anahtar]`);
  2. **Birim kaynakçası**: başlık `### Birim kaynakçası (<BİRİM>)`; ana kaynakça kategorili ise alt başlıklar onun kategorileri; anahtarlı sistemde her girdi `- [@anahtar] Künye` diye başlar;
  3. **Kaynak kontrolü ve araştırma notu**: başlıklar `### Kaynak kontrolü (<BİRİM>)` ve `### Araştırma notu (<BİRİM>)`; her biri en fazla 250 kelime;
  4. **Orkestratöre devir notu**: başlık `### Orkestratöre devir notu (<BİRİM>)`; alt başlıklar: argüman iskeleti (metne başlamadan önce yazılır); karar defterine işlenecek sonuçlar; diğer birimlere çapraz atıf ihtiyaçları; yeni kaynaklar ve erişim düzeyleri; tam metne yükseltilen kaynaklar; kısaltma önerileri; açık sorular; karar defteri eşleştirmesi (C bölümündeki her ilgili kayıt için metindeki yer, ör. "K-034 → I.A.3").
- 2–4. kısımlarda atıf işareti kullanılmaz.
- **Revizyon turu:** (1) iki raporu da bütünüyle oku; (2) bütün KRİTİK bulguları gider; (3) ÖNEMLİ bulguları gider veya itirazını gerekçesiyle yaz; (4) KÜÇÜK bulguları makul ölçüde gider; (5) revizyon mesajındaki ve karar defterindeki yeni kararlara uy; (6) devir notunun sonuna `#### Denetim cevapları (tur <n>)` tablosu ekle: bulgu kodu | karar (düzeltildi / kısmen / itiraz) | yer | not; her kod ayrı satır.
- Dosya ara aşamalarda kaydedilir. Yazım sürerken dosyanın ikinci satırında `<!-- DEVAM EDİYOR -->` notu bulunur (argüman iskeleti yazıldığı anda konur); yarım kalan başlığın yanına da `<!-- DEVAM EDİYOR: … -->` konabilir. Notlar teslimde silinir; süreç betiği notu olmayan ve devir notu dolu dosyayı teslim edilmiş sayar.

## 3. Biçim kuralları

### 3.1 Başlık düzeyleri

<!-- Ör. `##` bölüm (birleştirmede orkestratör ekler), `###` I., `####` A., `#####` 1. Ondalık numaralandırma (1.1, 1.1.1) kurum veya dergi isterse. -->

### 3.2 Atıf biçimi

<!-- Dipnotlu sistem: önek `[^b2a-1]`, ilk atıf tam künye, sonrakiler kısa ("Soyadı, yıl, s. …"); numaralı göndermeler ("dn. 9") kullanılmaz.
     Numaralı (Vancouver) veya yazar–tarih (APA) sistem: metinde kaynak anahtarı `[@soyad2020]`, birden çok kaynak `[@a2019; @b2021]`, sayfalı `[@a2019, s. 12]`, yazar–tarihte anlatı atfı "Soyad (2020)" için `Soyad [-@soyad2020]`; birim kaynakçasında her girdi `- [@soyad2020] Künye…` biçiminde başlar. Anahtarlar ana metinde de kalır; numarayı (ilk geçiş sırasıyla) veya "(Soyad, 2020)" etiketini yalnız Word aracı üretir. Yazar–tarihte etiket künyedeki yazar ve yıldan türetilir; aynı yazarın aynı yıldaki iki eseri künyede 2020a ve 2020b diye ayrılır.
     Atıf biçiminin örnekleri (makale, kitap, rapor, veri seti, kılavuz, web sayfası) kurum veya dergi kılavuzundan alınır. -->

### 3.3 Erişim etiketleri

`[tam metin]`, `[özet]`, `[bibliyografik]`, `[ikincil aktarım]`. Dipnotlu sistemde etiket dipnotun sonunda kısa yazılır. Anahtarlı sistemde (numaralı, yazar–tarih) etiket atfın içine yazılmaz; birim kaynakçasındaki girdinin sonuna konur: `- [@a] Künye… [tam metin]` (o kaynakta ulaşılan en yüksek düzey). Bir cümle aynı kaynağa daha düşük düzeyde dayanıyorsa (ör. kitabın yalnız özeti okunan bölümü), bu, kaynak kontrolü notunda cümleyle birlikte yazılır. Word aracı etiketleri son metinden siler. Ayrıntı ("şu paragraflar okundu") araştırma notuna gider. Aktarım "aktaran" ile gösterilir.

### 3.4 Kaynakça

<!-- Kategoriler veya tek liste; sıralama (alfabetik / atıf sırası); künye biçimi. -->

### 3.5 Yazım ayrıntıları

<!-- Sayı, tarih, yüzde, ondalık ayırıcı, kısaltmaların ilk geçişi, yabancı terimler, tablo ve şekil numaralandırması. -->

## 4. Terminoloji

<!-- Terim | kullanılacak karşılık | kullanılmayacak | not. Giriş'teki kavramlar kısmına bağlıdır.
     Halk sağlığı ve tıpta başlangıç satırları: olasılık oranı (OR) | odds oranı, "kat risk" | OR "… kat risk" diye yorumlanmaz; güven aralığı (GA) | CI | ilk geçişte açılır; göreli risk (RR), tehlike oranı (HR) aynı biçimde. Kurum adlarına ek kesmesiz: "Dünya Sağlık Örgütünün". Ölçeğin alt boyut adları Türkçe uyarlamanın adlarıyla; uyarlamaya erişilemezse buradaki karşılıklar geçici kullanılır ve bu, kaynak kontrolü notuna yazılır. -->

## 5. Kaynak erişim ipuçları

<!-- Veri tabanları, kurumsal erişim yolu, resmî siteler, bilinen engeller (CAPTCHA, oturum), indirilen dosyanın doğrulanması. -->

## 6. Düzey, hacim ve üslup

### 6.1 Düzey

{{DUZEY_TANIMI}}
<!-- Örnek (yüksek lisans): Konunun temel sorunları doğru kurulur, belli başlı görüşler ve kilit çalışmalar aktarılır, gerekçeli bir sonuca varılır. Her ayrıntı tüketilmez; ikincil tartışmaya bir iki cümleyle değinilir; bir tartışmada bir veya iki güçlü karşı görüş yeterlidir.
     "Yüksek lisans düzeyi" demek tek başına yetmez: ilk birim teslim edilince kullanıcıya bir örnekle gösterilir ve kalibre edilir. -->

### 6.2 Hacim hedefleri

Ana metin hedefleri atıf tanımları, birim kaynakçası, kaynak kontrolü, araştırma notu ve devir notu hariçtir. Hedef aşılabilir, ancak gerekçesi devir notunda yazılır.

| Birim | Ana metin hedefi | Atıf üst sınırı (dipnot veya kaynak) |
|---|---|---|
| Giriş | {{GIRIS_HACIM}} kelime | {{GIRIS_ATIF}} |

<!-- Plan onayından sonra doldurulur. Satır biçimi: "| B1a, B1b | 4.000–5.000 kelime | 70 |". Birim adı kod veya takma ad (Giriş, Sonuç); üçüncü sütun yalnız sayı. Toplam hacim hedefi tablonun altına yazılır. -->

- **Atıf:** Kaynağı göstermeye yetecek kadar. Dipnotlu sistemde bir cümleye kural olarak en fazla bir dipnot ve dipnottaki açıklama en fazla iki kısa cümle; numaralı sistemde dergi kaynak sınırı.
- **Birim sonu kısımları:** Kaynak kontrolü ve araştırma notu her biri en fazla 250 kelime; devir notu kısa.

### 6.3 Üslup

- **Türkçe düşünerek yaz.** Cümle yüklemle biter; özne ile yüklem birbirinden uzaklaşmaz. Ortalama cümle 15–25 kelime; 35 kelimeyi aşan cümle bölünür. Bir paragraf tek bir düşünceyi işler.
- **Ad zincirinden kaçın.** "-ması/-mesi" ve "-ın/-in" zincirleri yerine fiilli cümle kur. *Örnek:* "tükenmişlik düzeyinin belirlenmesinin amaçlanması" yerine "tükenmişliğin ne düzeyde olduğunu belirlemek".
- **Edilgen ve "-mektedir" yığılmasını azalt.** Özneyi göster: "DSÖ … önerir", "çalışmalar … bulmuştur", "bu çalışmada … ölçüldü".
- **Çeviri kokan kalıpları kullanma:** her cümlede "söz konusu", "bu bağlamda", art arda "… bakımından", gereksiz "… olarak", "önem arz etmektedir", "-dığını belirtmek gerekir", "ilgili olarak", "dikkat çekmek gerekir ki", her paragrafta "bir yandan … öte yandan". İki nokta üst üsteyle açılan cümleler, tirelerle açılan uzun ara cümleler ve uzun parantez içi açıklamalar da kullanılmaz.
- **Kendi değerlendirmeni işaretle:** "kanaatimizce", "bu çalışmanın bulgularına göre", "bize göre". Yerleşik bilgi, tek çalışma bulgusu, literatür görüşü ve kendi değerlendirmen ayrı durur.
- **Metinde iç yönetim dili yok:** birim kodu, "asıl yer", karar numarası, "çerçeve notu", "devir notu", "denetçi". Atıflar çalışmanın diliyle yapılır.
- **Yol haritasını kısa tut.** "Bu kısımda önce …, ardından …" paragrafı yalnız bölüm başında ve kısa olur; her alt başlıkta tekrar edilmez. Her paragrafa çapraz atıf yığılmaz.
- **Anlatım paragraf hâlindedir.** Madde işaretli liste istisnadır.
- **Terimler:** Türkçe karşılığı olan terimin Türkçesi kullanılır; yabancı terim yalnız ilk geçişte parantezde verilir.

### 6.4 Önce ve sonra örnekleri

<!-- İlk birim kalibrasyonundan sonra kullanıcının beğendiği ve beğenmediği iki-üç örnek buraya yazılır. -->

### 6.5 Denetçiler için

- **Düzey:** Denetçiler {{DUZEY}} ölçüsünü esas alır. İkincil bir tartışmanın eksikliği kritik bulgu sayılmaz. Genişletme öneren denetçi, aynı yerde nereden kısaltılacağını da gösterir.
- **Hacim ve üslup:** Hacim hedeflerine ve §6.3'e uyum ayrı başlık altında raporlanır.
- **Kaynak denetimi:** Yoğunlaştırılan metinde her atıf hâlâ bağlı olduğu cümleyi desteklemelidir.

### 6.6 Yoğunlaştırmada korunacaklar

1. **Koşullar düşürülmez.** Bir bulguyu, kuralı veya kararı özetleyen cümle sayıyı, yılı, örneklemi, alt grubu, süre koşulunu ve "… ise", "yalnız …" kayıtlarını korur. Birden çok koşul tek cümlede birleşirse her koşulun neye ait olduğu açık kalır.
2. **Tarama sınırı kalıbı.** "Rastlanmamıştır" ve "bulunamamıştır" ifadeleri "bu çalışmada incelenen … arasında" kaydıyla kullanılır. "İlk kez", "hiçbir çalışma" gibi kesin iddialar yalnız tam bir tarama yapılmışsa yazılır.
3. **Nicel literatür ifadeleri.** "Çalışmaların çoğu", "genel kabul" gibi ifadeler en az üç kaynağa dayanır; dayanmıyorsa "incelenen çalışmaların çoğu" kaydıyla yazılır.
4. **Cümle ritmi.** Yedi kelimenin altındaki cümleler art arda üçten fazla kullanılmaz; bağlaçla birleştirilir. Değişmiş bir düzenleme anlatılırken yalnız değişen kısım geçmiş zamanla verilir.
5. **Karar defteri eşleştirmesi.** Yoğunlaştırılan veya yeni yazılan birimin devir notu, karar defterinin C bölümündeki ilgili her kayıt için metindeki yeri bir satırla gösterir.
6. **Hacim doğruluktan önce gelmez.** Kısaltma turu kayıt düşürmeye başlarsa durulur; tavan gerekçeyle yükseltilir.
