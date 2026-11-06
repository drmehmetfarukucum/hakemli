# Hakemli — Tez ve makale için denetimli yazım

[![Lisans: MIT](https://img.shields.io/badge/lisans-MIT-3d434d)](LICENSE)
[![Claude Skill](https://img.shields.io/badge/Claude_Skill-3d434d)](SKILL.md)
[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-3d434d)](assets/araclar/README.md)
[![Node 18+](https://img.shields.io/badge/node-18%2B-3d434d)](assets/araclar/README.md)

Hakemli, tez, makale ve derleme yazımını Claude ile, hakemli bir derginin işleyişine benzer bir düzende yürüten bir Claude skill'idir. Metni bir orkestratör planlar; birimleri ayrı yazarlar yazar; her birimi birbirini görmeyen iki denetçi okur. Kaynak denetçisi her atfı kaynağından açar, alan denetçisi analizi ve dili denetler. Kararlar ve durum dosyalarda tutulur, bu yüzden çalışma günlerce ve birçok oturum boyunca kaldığı yerden sürer.

Skill, 72 bin kelimelik gerçek bir hukuk incelemesi yazılırken geliştirildi; orada karşılaşılan her hata için yeni bir kural yazıldı. Halk sağlığı başta olmak üzere tıp, sosyal bilimler ve tarih için de uyarlamaları vardır.

**Birlikte kullanılması önerilen skill:** Türkçe metinlerde son metni [Aynen](https://github.com/drmehmetfarukucum/aynen) skill'iyle işlemeniz önerilir. Aynen, metni yapay zekâ izlerinden arındırır; söylediğini ise aynen korur ve anlam denetiminden geçirir. Denetimden geçmiş bir metne uygulandığında değişen cümleleri bir kez daha bağımsız okumadan geçirmek iyi olur.

## Ne yapar, ne yapmaz

**Yapar**
- Çalışmayı, her biri bir öneriyle gelen sorularla netleştirir: tür, disiplin, kurum veya dergi, atıf sistemi, hacim, kota, kaynak erişimi.
- Ortamı yoklar ve neyin var olduğunu, neyin eksik olduğunu, bunun çıktıya etkisini baştan söyler. Eksik araç işi durdurmaz.
- Metni birimlere böler, yazarları ve denetçileri ayrı oturumlarda veya alt ajanlarda çalıştırır, revizyon kararlarını yazıya geçirir.
- Kaynak, yazar, sayfa, DOI veya sayı uydurmayı yasaklar; her atfın erişim düzeyini (tam metin, özet, künye) kaydeder.
- Yapamadığını gizlemez: erişilemeyen kaynakları, ertelenen denetimleri ve geçici biçim kurallarını kullanıcıya ve teslim notuna yazar.
- İsteğe bağlı araçlarla birim dosyalarını mekanik olarak denetler, künyeleri Crossref ve PubMed'den doğrular, kurum veya dergi biçiminde Word ve PDF üretir.

**Yapmaz**
- Metni orkestratörün kendisi yazmaz; denetçiler hazır metin yazmaz.
- Oturum açmaz, şifre girmez, CAPTCHA aşmaz. Kurumsal kütüphaneye girişi kullanıcı yapar.
- Dış modellerin (Gemini, ChatGPT, Codex) çıktısını doğrulamadan metne almaz; kişisel veriyi onlara göndermez.

## Nasıl çalışır

| Aşama | Ne olur |
|---|---|
| 0. Sorular | Önkoşulu çözülmüş sorular turlar hâlinde, her biri bir öneriyle sorulur; ortam yoklanır; tam mod (tez) veya hafif mod (makale) seçilir. |
| 1. Ön araştırma | Paralel tarama akışları, ön araştırma raporu, çerçeve seçimi. Sistematik derlemede yeniden üretilebilir tarama akışı. |
| 2. Plan ve Giriş | İçindekiler, birim sınırları, Giriş; kullanıcı onayı. |
| 3–4. Yazım | Her birim için kısa bir görev tanımı (brif); yazar önce argüman iskeletini, sonra metni yazar ve teslimden önce öz denetim yapar. |
| 5. Kalite döngüsü | Künye ön kontrolü, iki bağımsız denetçi, revizyon, ikinci tur, bağımsız son okuma, kabul. |
| 6. Birleştirme ve çıktı | Süreç kapısı, birleştirme, bütünlük ve rastgele örneklem denetimi, son bütün metin denetimi, isteğe bağlı hakem gözüyle okuma, Word ve PDF. |
| 7. Devam et | Yeni oturum durumu dosyalardan kurar; tutarsızlık varsa önce onu çözer. |

Ayrıntılar `references/protokol.md` dosyasındadır.

## Yetenek düzeyleri

| Düzey | Ne gerekir | Çıktıya etkisi |
|---|---|---|
| Temel | Claude Code, web araması, açık erişim | Bütün süreç çalışır. Ücretli kaynakların çoğu özetten doğrulanır; bu Sınırlılıklar'a yazılır. |
| Önerilen | + Claude in Chrome uzantısı ve kurumsal kütüphane erişimi | Kaynaklar tam metinden okunur ve denetlenir. Kalite farkının asıl kaynağı budur. |
| Genişletilmiş | + Gemini, ChatGPT, Codex, Microsoft Word | İkinci görüş, model kalibrasyonu, içindekiler sayfa numaralı Word ve PDF. Yoksa hiçbir adım eksik kalmaz. |

## Kurulum

Claude Code'da (masaüstü uygulaması veya CLI):

```bash
git clone https://github.com/drmehmetfarukucum/hakemli ~/.claude/skills/hakemli
```

Kurmadan önce incelemek isterseniz depoyu bir güvenlik tarayıcısından (ör. [SkillSpector](https://github.com/NVIDIA/SkillSpector)) geçirebilirsiniz; aşağıdaki "Güvenlik" bölümü bulguları açıklar.

İsteğe bağlı araç paketi için Python 3.9+, Word/PDF için Node.js 18+ ve macOS'ta Microsoft Word gerekir; ayrıntı `assets/araclar/README.md` dosyasındadır. Araçlar yalnız kullanıcı onay verirse projeye kopyalanır.

Sık kullanacaksanız kurumunuzu, kütüphane erişiminizi ve tercihlerinizi `~/.claude/hakemli/profil.md` dosyasına yazabilirsiniz (iskelet: `references/iskeletler/kullanici_profili.md`); skill o zaman bunları her çalışmada yeniden sormaz.

## Kullanım

Çalışmanın yapılacağı boş bir klasörde:

```
/hakemli Havalimanı çalışanlarında vardiyalı çalışma ve uyku: anlatısal derleme
```

Skill soruları sorar, kurulumu yapar ve ön araştırmaya geçer. Sonraki oturumlarda çoğunlukla "devam et" yazmak yeter. Dergiden hakem raporları geldiğinde "hakem raporları geldi" deyin.

## İçinde neler var

```
SKILL.md                      başlangıç adımları
references/protokol.md        protokol (aşamalar, kalıcı kurallar, hafif mod, ortam yedekleri, dış modeller)
references/sablonlar/         yazar, kaynak, alan, yöntem, süreç, bütünlük, örneklem, son okuma, hakem şablonları
references/iskeletler/        yönetim dosyası iskeletleri (proje tanımı, ilerleme, karar defteri …)
assets/araclar/               isteğe bağlı araçlar: süreç denetimi, künye doğrulama, Word/PDF üretimi ve doğrulaması
evals/                        test senaryoları (skill-creator biçimi)
```

## Nasıl sınandı

- **Gerçek proje:** Protokolün ilk sürümleri 72 bin kelimelik, 860 dipnotlu bir hukuk incelemesinde kullanıldı. Word aracı aynı projeyi gerçek Microsoft Word ile 42/42 doğrulamayla üretti.
- **Pilot:** Aynı görev tanımıyla iki modelin yazdığı birer Giriş, kör kaynak ve alan denetiminden, ayrıca Codex ve Gemini değerlendirmesinden geçti. Akıcı metnin her zaman doğru metin olmadığı burada görüldü; ders protokole yazıldı.
- **Gözden geçirme:** Skill kendi karar ağacını "grilling" yöntemiyle sorguladı; Codex ve Gemini bağımsız inceleme yaptı; bulgular düzeltildi.
- **Zorlama testleri:** Araçlar bozuk, eksik ve kötü niyetli girdilerle denendi. Süreç betiği için 98 durum, künye aracı için internetli ve internetsiz denemeler, Word aracı için numaralı, yazar–tarih (APA, Harvard, Chicago) ve dipnotlu örnekler.
- **Gerçek Word:** Word açıkken ve kapalıyken normal üretim, zaman aşımı ve otomasyon izni reddi gerçek Word ile denendi.

## Sınırlar

- Skill Claude Code'da (macOS masaüstü uygulaması ve CLI) geliştirildi ve sınandı; başka istemcilerde bazı araçlar olmayabilir, yedekleri protokolün § I bölümündedir.
- Word ve PDF adımı macOS ve Microsoft Word gerektirir; yoksa Markdown ve `.docx` üretilir.
- Künye aracı yalnız DOI ve PMID'si olan künyeleri doğrular; Türkçe dergiler, kitaplar ve mevzuat kaynak denetçisine kalır.
- Yazar–tarih etiketi künyeden çıkarılır; APA, Vancouver ve kurum yazarı biçimleri dışındaki künyeler için elle etiket gerekir.
- Uzun çalışmalar haftalık kullanım kotasının önemli bir kısmını tüketebilir; skill kotayı ölçer ve eşikte durur.

## Güvenlik

SkillSpector taramasının sonucu CAUTION (risk 14/100) çıkar. Taramanın iki bulgusu da beklenen bulgulardır:
- `SKILL.md` izinli araç listesi (`allowed-tools`) beyan etmez. Bu bilinçlidir: liste araçları sormadan kullanma izni verirdi.
- `assets/araclar/kunye_dogrula.py` internete bağlanır: yalnız DOI ve PMID'yi `api.crossref.org` ve `eutils.ncbi.nlm.nih.gov` adreslerine gönderir, başka adrese yönlendirmeyi reddeder.

Araçlar skill kurulunca kendiliğinden çalışmaz; yalnız kullanıcı onay verirse projeye kopyalanır. Word aracı yalnız kendi açtığı belgeyi kapatır ve Word'ün uyarı ayarını eski değerine döndürür.

## Katkı

Hata bildirimi ve önerileri GitHub "Issues" üzerinden bekliyorum. Kendi disiplininiz için § B'ye (disipline göre uyarlama) bir satır eklemek en kolay katkıdır.

## Lisans

MIT. Ayrıntı için [LICENSE](LICENSE).

## English summary

Hakemli ("peer-reviewed" in Turkish) is a Claude skill that runs thesis, article and review writing as a multi-session writer–auditor workflow. An orchestrator plans and records decisions in files; writers draft units; two independent auditors check every unit, one opening each citation at its source, the other checking analysis and style. It never fabricates sources, records the access level of every citation, and tells the user what it could not do. Optional tools audit unit files, verify references against Crossref and PubMed, and produce Word and PDF in an institution's or journal's format. The skill text is in Turkish; it supports Turkish and English manuscripts.
