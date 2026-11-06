#!/usr/bin/env python3
"""Süreç denetimi: birim dosyalarını ve birleşik ana metni mekanik olarak denetler.

Kullanım:  python3 <çıktı klasörü>/_araclar/surec_denetimi.py [--ayar surec_ayarlari.json]

Birim ve bölüm adları, hacim tablosunun yeri, rapor adları ve aranacak kalıplar
`surec_ayarlari.json` dosyasından okunur (varsayılan: betikle aynı klasör).
Sonucu <çıktı klasörü>/_yonetim/denetim/surec_durumu.md dosyasına yazar. Yalnız rapor
üretir; metin dosyalarını değiştirmez. Çıkış kodu: 0 temiz, 1 kırmızı madde var, 2 betik
çalışamadı (bozuk ayar, eksik yönetim dosyası); 2'de rapor da hatayı söyler.
"""
import argparse
import collections
import datetime
import difflib
import json
import pathlib
import re
import string
import sys
import traceback

ARACLAR = pathlib.Path(__file__).resolve().parent
OK, NO, YOK = "✅", "🔴", "—"
YORUM = re.compile(r"<!--.*?-->", re.S)
ATIF_GRUP = re.compile(r"\[(-?@[^\]]+)\]")          # [@a], [@a; @b], [@a, s. 12], [-@a]
DIPNOT = re.compile(r"\[\^([^\]]+)\]")
# Erişim etiketleri (Türkçe ve İngilizce). Atıf içinde yalnız anahtardan sonraki virgüllü bileşen olarak,
# metinde yalnız köşeli parantezin tek içeriği olarak aranır; [Özet](#ozet) bağlantısı etiket sayılmaz.
ETIKET = (r"(?:tam\s+metin|[öo]zet|bibliyografik|ikincil\s+aktar[ıi]m|full\s+text|abstract|bibliographic"
          r"|secondary(?:\s+(?:citation|source))?)")
ETIKET_BILESEN = re.compile(r"\s*" + ETIKET + r"\s*[.,;:]?\s*", re.I)
ETIKET_CIPLAK = re.compile(r"\[\s*(" + ETIKET + r")\s*[.]?\s*\](?!\()", re.I)


def erisim_etiketleri(m):
    """Metindeki erişim etiketleri: [tam metin], [@a, özet, s. 12] → ['tam metin', 'özet']."""
    m = YORUM.sub("", m)
    bulgu = [" ".join(x.group(1).split()) for x in ETIKET_CIPLAK.finditer(m)]
    for grup in ATIF_GRUP.findall(m):
        for p in grup.split(";"):
            bulgu += [" ".join(x.split()).rstrip(".,;:") for x in p.split(",")[1:] if ETIKET_BILESEN.fullmatch(x)]
    return bulgu
KABUL = re.compile(r"kabul edildi|onaylandı|birleştirildi")
TESLIM_SONRASI = ("teslim edildi", "denetimde", "revizyonda", "kabul edildi", "birleştirildi", "onaylandı")
DEVIR = re.compile(r"^#{3,4} .*[Dd]evir notu", re.M)
DEVAM = re.compile(r"DEVAM ED[İI]YOR")
# Betiğin hiçbir çalıştırmada denetleyemedikleri ve onları kimin denetlediği (rapora her zaman yazılır).
DENETLENMEYEN = [
    ("İçerik ve kaynak doğruluğu (atfın cümleyi desteklemesi, sayılar, künye)", "kaynak ve alan denetçileri; örneklem denetçisi"),
    ("Kaynağın gerçekten okunup okunmadığı, erişim etiketinin doğruluğu", "kaynak denetçisi; örneklem denetçisi"),
    ("ilerleme.md §1 (birim durumları) ile §7 (sıradaki adımlar) arasındaki uyum", "orkestratör, Aşama 7 kapısı"),
    ("Çalışan bir oturum veya ajan olup olmadığı (takılmış iş)", "orkestratör, Aşama 7 kapısı"),
    ("\"Devam et\" mesajının hangi onayı verdiği", "orkestratör, Aşama 7 kapısı"),
]

VARSAYILAN = {
    "cikti_klasoru": "..",
    "ana_metin": None,
    "giris_kodu": "G",
    "birimler": {},
    "bolumler": {},
    "surec_raporu": {},
    "rapor_kaliplari": ["{kod}_kaynak_tur*.md", "{kod}_alan_tur*.md"],
    "kabul_kaydi": "{kod} kabul",
    "kabul_kaydi_ozel": {},
    "hacim": None,
    "kilavuz_hacim_bolumu": ["### 6.2", "### 6.3"],
    "takma_adlar": {"Giriş": "G", "Sonuç": "S"},
    "atif_turu": "dipnot",
    "ic_dil": [r"\bK-\d{3}[a-z]?\b", r"[Aa]sıl yer", r"[Kk]arar defter", r"[Dd]evir not",
               r"[Oo]rkestrat", r"[Çç]erçeve not", r"\bdn\. ?[a-z]+\d*[a-z]?-\d+"],
    "ic_dil_birim_kodlari": True,
    "eski_kalip": [],
    "cumle": {"ort_alt": 15, "ort_ust": 25, "uzun": 35},
    "bolum_payi": 1.05,
    "birim_sonu_basliklari": ["Birim kaynakçası", "Kaynak kontrolü", "Giriş bölümü için kaynak kontrolü"],
    "bolum_sonu_deseni": r"(kaynak kontrolü|araştırma notu)",
    "ana_metin_baslangic": "## Giriş",
    "ana_metin_bitis": "## Kaynakça",
    "ilerleme": {"birimler": "## 1. İş birimleri", "sonraki": "## 2. Bölüm durumu",
                 "onay": "## 3. Bekleyen onay noktası"},
    "kisaltmalar": ["m", "s", "f", "b", "vb", "vd", "dn", "bkz", "ör", "No", "Prof", "Doç", "Dr", "Av",
                    "md", "krş", "çev", "haz", "ed", "bs", "Ü", "ark", "al", "Fig", "Tab", "vol", "ss",
                    "e.g", "i.e", "et al", "vs", "cf", "approx", "Eq"],
    "sayi_sonrasi_kelimeler": ["CD", "HD", "Ceza", "Hukuk", "Daire", "bası", "madde", "fıkra", "Birleşim",
                               "Dönem", "hafta", "gün", "Asliye", "Adli", "yüzyıl", "sınıf", "basamak"],
    "rapor_bitis_isareti": None,
}


class BetikHatasi(Exception):
    """Betiğin çalışamadığı durum; mesaj terminale ve surec_durumu.md'ye yazılır."""


def ayar_oku(yol):
    """(ayar, kırmızı maddeler). Okunamayan veya tipi bozuk ayar BetikHatasi verir."""
    if not yol.exists():
        raise BetikHatasi(f"ayar dosyası yok: {yol}")
    try:
        kullanici = json.loads(yol.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        raise BetikHatasi(f"ayar dosyası geçerli JSON değil ({yol.name}, satır {e.lineno}, sütun {e.colno}: {e.msg})")
    except (OSError, UnicodeDecodeError) as e:
        raise BetikHatasi(f"ayar dosyası okunamadı ({yol}): {e}")
    if not isinstance(kullanici, dict):
        raise BetikHatasi(f"ayar dosyasının üst düzeyi bir JSON nesnesi ({{ … }}) olmalı: {yol.name}")
    a, kir = dict(VARSAYILAN), []
    for k, v in kullanici.items():
        if k.startswith("_"):
            continue
        if k not in VARSAYILAN:
            yakin = difflib.get_close_matches(k, VARSAYILAN, 1)
            kir.append(f"- **Ayar:** ayarda tanınmayan anahtar \"{k}\""
                       + (f" (\"{yakin[0]}\" mi?)" if yakin else "") + "; yok sayıldı")
            continue
        if isinstance(v, dict) and isinstance(a.get(k), dict) and k in ("cumle", "ilerleme", "takma_adlar"):
            a[k] = {**a[k], **v}
        else:
            a[k] = v
    ayar_dogrula(a)
    return a, kir


def ayar_dogrula(a):
    def hata(alan, ne):
        raise BetikHatasi(f"ayarda \"{alan}\" alanı hatalı: {ne}")

    def sayi(x):
        return isinstance(x, (int, float)) and not isinstance(x, bool)

    def desen(alan, d):
        try:
            re.compile(d)
        except re.error as e:
            hata(alan, f"düzenli ifade derlenemedi: {d!r} ({e})")

    tip_adi = {dict: "nesne ({…})", list: "liste ([…])", str: "metin", bool: "true veya false"}
    for k, v in VARSAYILAN.items():
        if v is None:
            if a[k] is not None and k != "hacim" and not isinstance(a[k], str):
                hata(k, "metin veya null olmalı")
        elif sayi(v):
            if not sayi(a[k]):
                hata(k, "sayı olmalı")
        elif not isinstance(a[k], type(v)):
            hata(k, f"{tip_adi[type(v)]} olmalı")
        elif isinstance(v, list) and not all(isinstance(x, str) for x in a[k]):
            hata(k, "listedeki her öğe metin olmalı")
    if a["atif_turu"] not in ("dipnot", "anahtar"):
        hata("atif_turu", f"\"{a['atif_turu']}\" tanınmıyor; yalnız \"dipnot\" veya \"anahtar\" olabilir. "
                          "Numaralı (Vancouver) ve yazar–tarih (APA vb.) sistemler için \"anahtar\" kullanın")
    for k in ("ort_alt", "ort_ust", "uzun"):
        if not sayi(a["cumle"].get(k)):
            hata("cumle", f"\"{k}\" sayı olmalı")
    if a["hacim"] is not None:
        if not isinstance(a["hacim"], dict):
            hata("hacim", "null veya {\"birim\": [alt, üst, atıf_sınırı], …} olmalı")
        for b, v in a["hacim"].items():
            if not (isinstance(v, list) and len(v) == 3 and all(sayi(x) for x in v)):
                hata("hacim", f"\"{b}\" girdisi üç sayı olmalı: [alt, üst, atıf_sınırı]")
    for k in ("birimler", "takma_adlar", "surec_raporu", "kabul_kaydi_ozel", "ilerleme"):
        if not all(isinstance(x, str) for x in a[k].values()):
            hata(k, "değerler metin olmalı")
    if not all(isinstance(x, list) and all(isinstance(y, str) for y in x) for x in a["bolumler"].values()):
        hata("bolumler", "her bölümün değeri birim kodlarının listesi olmalı")
    if len(a["kilavuz_hacim_bolumu"]) != 2:
        hata("kilavuz_hacim_bolumu", "iki başlık olmalı (ör. [\"### 6.2\", \"### 6.3\"])")
    for k in ("ic_dil", "eski_kalip"):
        for d in a[k]:
            desen(k, d)
    desen("bolum_sonu_deseni", a["bolum_sonu_deseni"])
    for k, kaliplar in (("rapor_kaliplari", a["rapor_kaliplari"]), ("kabul_kaydi", [a["kabul_kaydi"]])):
        for kal in kaliplar:
            try:
                alanlar = {f for _, f, _, _ in string.Formatter().parse(kal) if f is not None}
            except ValueError as e:
                hata(k, f"{kal!r} okunamadı ({e})")
            if alanlar - {"kod"}:
                hata(k, f"{kal!r} içinde yalnız {{kod}} yer tutucusu olabilir; bulunan: {sorted(alanlar - {'kod'})}")


def oku(p):
    p = pathlib.Path(p)
    try:
        return p.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        raise BetikHatasi(f"gerekli dosya yok: {p}")
    except UnicodeDecodeError:
        raise BetikHatasi(f"dosya UTF-8 olarak okunamadı: {p}")
    except OSError as e:
        raise BetikHatasi(f"dosya okunamadı ({e.strerror}): {p}")


def yorumsuz(t):
    """HTML yorumlarını siler; satır numaraları korunur."""
    return YORUM.sub(lambda m: "\n" * m.group().count("\n"), t)


def durum_duz(durum):
    """ilerleme.md durum hücresi: biçim işaretleri ve fazla boşluk atılır, küçük harfe çevrilir."""
    return " ".join(re.sub(r"[*_`]", "", durum).split()).lower()


def tarih_oku(s):
    """'GG.AA.YYYY SS:DD' veya 'YYYY-AA-GG SS:DD' (saat isteğe bağlı); okunamazsa None."""
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2})[:.](\d{2}))?", s)
    if m:
        g, a, y, sa, dk = m.groups()
    else:
        m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?", s)
        if not m:
            return None
        y, a, g, sa, dk = m.groups()
    try:
        return datetime.datetime(int(y), int(a), int(g), int(sa or 0), int(dk or 0))
    except ValueError:
        return None


class Denetim:
    def __init__(self, ayar, ayar_kir=()):
        self.a = ayar
        self.ayar_kir = list(ayar_kir)
        self.notlar, self.planlanmamis, self.atlanan, self.arsivsiz = [], [], [], []
        self.ilr_baslik_yok = False
        self.kok = (ARACLAR / ayar["cikti_klasoru"]).resolve()
        self.yon = self.kok / "_yonetim"
        self.bol = self.kok / "bolumler"
        self.den = self.yon / "denetim"
        self.rapor = self.den / "surec_durumu.md"
        if ayar["ana_metin"]:
            self.ana = self.kok / ayar["ana_metin"]
        else:
            adaylar = sorted(self.kok.glob("*.md"))
            self.ana = adaylar[0] if len(adaylar) == 1 else None
        c = ayar["cumle"]
        self.ort_alt, self.ort_ust, self.uzun = c["ort_alt"], c["ort_ust"], c["uzun"]
        ic = list(ayar["ic_dil"])
        if ayar["ic_dil_birim_kodlari"]:
            kodlar = [re.escape(k) for k in ayar["birimler"] if len(k) >= 2]
            if kodlar:
                ic.append(r"\b(?:" + "|".join(kodlar) + r")\b")
        self.ic_dil = ic
        self.eski = list(ayar["eski_kalip"])
        kis = "|".join(re.escape(k) for k in ayar["kisaltmalar"])
        self.kis_re = re.compile(r"\b(" + kis + r")\.") if kis else None
        sk = "|".join(re.escape(k) for k in ayar["sayi_sonrasi_kelimeler"])
        self.sayi_re = re.compile(r"(\d)\.(\s+(?:" + sk + r"))") if sk else None
        bas = "|".join(re.escape(b) for b in ayar["birim_sonu_basliklari"])
        self.birim_sonu = re.compile(r"^### (" + bas + r")", re.M)
        self.bolum_sonu = re.compile(r"^### .*" + ayar["bolum_sonu_deseni"], re.M | re.I)
        self.anahtarli = ayar["atif_turu"] == "anahtar"

    # ---------------------------------------------------------------- ölçüm
    def hacim_sinirlari(self, kir):
        if self.a["hacim"] is not None:
            return {k: tuple(v) for k, v in self.a["hacim"].items()}
        yol = self.yon / "yazim_kilavuzu.md"
        if not yol.exists():
            raise BetikHatasi(f"_yonetim/yazim_kilavuzu.md yok ({yol}); hacim sınırları okunamadı. "
                              "Dosyayı kurun ya da ayarda \"hacim\" alanını doldurun")
        t = oku(yol)
        b1, b2 = self.a["kilavuz_hacim_bolumu"]
        if b1 not in t:
            return {}
        bas = t.index(b1)
        son = t.index(b2, bas) if b2 in t[bas:] else len(t)
        adlar = set(self.a["birimler"]) | set(self.a["takma_adlar"])
        sinir = {}
        for sat in yorumsuz(t[bas:son]).splitlines():
            if not sat.strip().startswith("|") or "{{" in sat:  # doldurulmamış satır yer tutucu olarak raporlanır
                continue
            h = [x.strip() for x in sat.strip().strip("|").split("|")]
            if h[0].startswith(("Birim", "---", ":-")):
                continue
            ad_l = [x.strip("*` ") for x in re.split(r",\s*", h[0])]
            sayi = re.findall(r"\d[\d.]*", h[1]) if len(h) > 1 else []
            if len(h) != 3:
                neden = f"3 sütun olmalı, {len(h)} var"
            elif len(sayi) < 2:
                neden = "ikinci sütunda alt ve üst kelime sayısı okunamadı (ör. \"4.000–5.000 kelime\")"
            elif not h[2].isdigit():
                neden = f"üçüncü sütun yalnız sayı olmalı (\"{h[2]}\")"
            else:
                alt, ust = (int(n.replace(".", "")) for n in sayi[:2])
                for ad in ad_l:
                    sinir[self.a["takma_adlar"].get(ad, ad)] = (alt, ust, int(h[2]))
                continue
            if any(ad in adlar for ad in ad_l):
                self.kirmizi(kir, "Hacim tablosu", f"\"{h[0]}\" satırı okunamadı: {neden}")
        return sinir

    def govde(self, t):
        m = self.birim_sonu.search(t)
        return t[:m.start()] if m else t

    @staticmethod
    def kaynakca_kismi(t):
        """`### Birim kaynakçası` başlığından sonraki `### ` başlığına kadar; başlık yoksa None."""
        m = re.search(r"^### Birim kaynakçası\b.*$", t, re.M)
        if not m:
            return None
        s = re.compile(r"^### ", re.M).search(t, m.end())
        return t[m.end():s.start() if s else len(t)]

    @staticmethod
    def metin_ayir(g):
        return "\n".join(s for s in g.split("\n") if not re.match(r"\[\^[^\]]+\]:", s))

    @staticmethod
    def temizle(m):
        return re.sub(r"\[\^[^\]]+\]|\[-?@[^\]]+\]", "", YORUM.sub("", m))

    def kelime(self, m):
        satir = [re.sub(r"[#*|>]", " ", s) for s in self.temizle(m).split("\n") if not s.startswith("|---")]
        return len(" ".join(satir).split())

    def paragraflar(self, m):
        """Boş satırla ayrılan paragraflar; paragraf içindeki satır sonları birleştirilir.
        Başlık, tablo ve alıntı satırları atlanır; liste maddesi yeni paragraf sayılır."""
        sonuc, blok = [], []
        for s in self.temizle(m).split("\n") + [""]:
            s = s.strip()
            atla = s.startswith(("#", "|", ">"))
            if not s or atla or re.match(r"(?:[-*+]|\d+[.)])\s", s):
                if blok:
                    sonuc.append(" ".join(blok))
                blok = [s] if s and not atla else []
            else:
                blok.append(s)
        return sonuc

    def cumleler(self, m):
        paragraflar = self.paragraflar(m)
        sonuc = []
        for p in paragraflar:
            p = re.sub(r"[*_`]", "", p)
            p = re.sub(r"<[^>]+>", "URL", p)
            p = re.sub(r"(\d)\.(\d)", r"\1§\2", p)
            p = re.sub(r"\b([IVX]+)\.(?=[A-Z0-9])", r"\1§", p)
            p = re.sub(r"\b([A-ZÇĞİÖŞÜ])\.", r"\1§", p)
            if self.kis_re:
                p = self.kis_re.sub(r"\1§", p)
            if self.sayi_re:
                p = self.sayi_re.sub(r"\1§\2", p)
            for c in re.split(r"(?<=[.!?…])[\"”)]*\s+", p):
                if len(c.split()) >= 3:
                    sonuc.append(c.replace("§", "."))
        return sonuc

    @staticmethod
    def anahtarlar(m):
        """Metindeki kaynak anahtarları, geçiş sırasıyla. [@a, s. 12] ve [-@a] → a."""
        sonuc = []
        for grup in ATIF_GRUP.findall(m):
            for p in grup.split(";"):
                k = re.match(r"\s*-?@([^\s,;\]]+)", p)
                sonuc.append(k.group(1) if k else p.strip())
        return sonuc

    def atif(self, tanim_metni, m):
        """(tanımlar, referanslar) listeleri. Dipnotta [^x]: satırları; anahtarlı sistemde
        tanim_metni birim kaynakçası veya ana kaynakçadır ('- [@x] Künye')."""
        if self.anahtarli:
            return re.findall(r"^\s*[-*]?\s*\[@([^\]\s;,]+)\]", tanim_metni, re.M), self.anahtarlar(m)
        return re.findall(r"^\[\^([^\]]+)\]:", tanim_metni, re.M), DIPNOT.findall(m)

    def atif_sorunlari(self, ad, govde, tan_l, kir):
        """Yinelenen tanım ve atıf türüyle uyuşmayan işaret; kırmızı varsa True."""
        sorun = False
        cift = sorted(k for k, n in collections.Counter(tan_l).items() if n > 1)
        if cift:
            tur = "kaynak anahtarı" if self.anahtarli else "dipnot etiketi"
            self.kirmizi(kir, ad, f"aynı {tur} birden çok kez tanımlı: {cift[:6]}")
            sorun = True
        # Anahtarlı sistemde erişim etiketi metinde değil, kaynakça girdisinin sonunda durur (kılavuz § 3.3).
        etiket = erisim_etiketleri(govde) if self.anahtarli else []
        if etiket:
            self.kirmizi(kir, ad, f"metinde {len(etiket)} erişim etiketi var (ör. {etiket[:3]}); "
                                  "anahtarlı sistemde etiket kaynakça girdisinin sonuna taşınmalı")
            sorun = True
        yabanci = DIPNOT.findall(govde) if self.anahtarli else self.anahtarlar(govde)
        if yabanci:
            ne = "dipnot işareti [^…]" if self.anahtarli else "kaynak anahtarı [@…]"
            self.kirmizi(kir, ad, f"atıf türü \"{self.a['atif_turu']}\", ama metinde {len(yabanci)} {ne} var "
                                  f"(ör. {yabanci[:3]}); eski işaretler dönüştürülmeli")
            sorun = True
        return sorun

    def desen_bul(self, desenler, m):
        t = self.temizle(m)
        bulgu = []
        for d in desenler:
            for b in re.finditer(d, t):
                bulgu.append(t[max(0, b.start() - 30):b.end() + 20].replace("\n", " "))
        return bulgu

    def olc(self, g):
        m = self.metin_ayir(g)
        c = self.cumleler(m)
        uz = [len(x.split()) for x in c]
        return {
            "kelime": self.kelime(m), "ic": self.desen_bul(self.ic_dil, m), "eski": self.desen_bul(self.eski, m),
            "ort": sum(uz) / len(uz) if uz else 0, "uzun": [x for x in c if len(x.split()) > self.uzun],
        }

    # ---------------------------------------------------------------- yönetim dosyaları
    def ilerleme_satirlari(self, kir):
        yol = self.yon / "ilerleme.md"
        if not yol.exists():
            raise BetikHatasi(f"_yonetim/ilerleme.md yok ({yol}); proje kurulmamış ya da ayardaki "
                              "\"cikti_klasoru\" yanlış")
        t = oku(yol)
        i = self.a["ilerleme"]
        if i["birimler"] not in t:
            self.ilr_baslik_yok = True
            self.kirmizi(kir, "ilerleme.md", f"\"{i['birimler']}\" başlığı yok; birim durumları okunamadı")
            return {}, t
        bas = t.index(i["birimler"])
        son = t.index(i["sonraki"], bas) if i["sonraki"] in t[bas:] else len(t)
        sat = {}
        for s in t[bas:son].splitlines():
            if not s.strip().startswith("|"):
                continue
            h = [x.strip() for x in s.strip().strip("|").split("|")]
            kod = h[0].strip("*` ")
            if kod not in self.a["birimler"]:
                continue
            if len(h) < 7:
                self.kirmizi(kir, kod, f"ilerleme.md satırının sütun sayısı hatalı ({len(h)}; en az 7 olmalı)")
                h += [""] * (7 - len(h))
            sat[kod] = {"durum": h[2], "dosya": h[4], "tur": h[5], "kabul": h[6]}
        return sat, t

    @staticmethod
    def kirmizi(liste, ad, neden):
        liste.append(f"- **{ad}:** {neden}")

    def birim_satiri(self, b, sinir, ilr, kd, kir):
        yol = self.bol / self.a["birimler"][b]
        durum = ilr.get(b, {}).get("durum", "kayıt yok")
        dd = durum_duz(durum)
        kabul = not dd.startswith("askıda") and bool(KABUL.search(dd))
        bekliyor = dd.startswith("bekliyor")
        kisa = re.sub(r"\*", "", durum)[:34]
        if not yol.exists():
            # ilerleme.md'de satırı olmayan ve dosyası olmayan birim henüz planlanmamış sayılır.
            if b not in ilr and not self.ilr_baslik_yok:
                self.planlanmamis.append(b)
            if bekliyor or b not in ilr:
                return None
            if any(x in dd for x in ("yazımda", "başlatılıyor", "askıda")):
                return [b, kisa] + [YOK] * 8 + ["dosya henüz yok"]
            self.kirmizi(kir, b, f"ilerleme.md durumu \"{durum[:40]}\" ama dosya yok")
            return [b, kisa] + [YOK] * 8 + [f"{NO} dosya yok"]
        tum = oku(yol)
        g = self.govde(tum)
        o = self.olc(g)
        m = self.metin_ayir(g)
        if self.anahtarli:
            kc = self.kaynakca_kismi(tum)
            if kc is None:
                self.kirmizi(kir, b, "\"### Birim kaynakçası\" başlığı yok; kaynak tanımları okunamadı")
            tan_l, ref_l = self.atif(kc or "", m)
        else:
            tan_l, ref_l = self.atif(tum, m)
        tan, ref = set(tan_l), set(ref_l)
        isaret = len(ref_l)
        say = len(ref) if self.anahtarli else len(tan)
        sorun = self.atif_sorunlari(b, g, tan_l, kir)
        if b not in sinir:
            self.kirmizi(kir, b, "hacim sınırı yok (yazim_kilavuzu.md §6.2 tablosunda veya ayardaki 'hacim' alanında satırı yok)")
        alt, ust, dn = sinir.get(b, (0, 10**9, 10**9))
        h = OK if alt <= o["kelime"] <= ust else NO
        if h == NO:
            self.kirmizi(kir, b, f"hacim {o['kelime']} kelime; sınır {alt}–{ust}")
        d = OK if say <= dn else NO
        if d == NO:
            self.kirmizi(kir, b, f"{say} {'kaynak' if self.anahtarli else 'dipnot'}; üst sınır {dn}")
        fark = sorted(ref - tan) if self.anahtarli else sorted((ref - tan) | (tan - ref))
        rt = OK if not fark and not sorun else NO
        if fark:
            self.kirmizi(kir, b, f"atıf eşleşmesi bozuk: {fark[:6]}")
        if self.anahtarli and tan - ref:
            self.notlar.append(f"{b}: birim kaynakçasında olup metinde atıf yapılmayan anahtar "
                               f"({len(tan - ref)}): {sorted(tan - ref)[:6]}")
        ic = OK if not o["ic"] else NO
        if o["ic"]:
            self.kirmizi(kir, b, f"iç yönetim dili ({len(o['ic'])}): {o['ic'][:3]}")
        es = OK if not o["eski"] else NO
        if o["eski"]:
            self.kirmizi(kir, b, f"eski kalıp ({len(o['eski'])}): {o['eski'][:3]}")
        or_ = OK if self.ort_alt <= o["ort"] <= self.ort_ust else NO
        if or_ == NO:
            self.kirmizi(kir, b, f"ortalama cümle {o['ort']:.1f} kelime; hedef {self.ort_alt}–{self.ort_ust}")
        uz = OK if not o["uzun"] else NO
        if o["uzun"]:
            self.kirmizi(kir, b, f"{len(o['uzun'])} cümle {self.uzun} kelimeyi aşıyor; ilki: {o['uzun'][0][:90]}…")
        rap = kay = YOK
        raporlar = []
        tur = re.match(r"(revizyonda|denetimde)\s*\(\s*tur\s*(\d+)", dd)
        if kabul:
            bulunan = [sorted(self.den.glob(k.format(kod=b))) for k in self.a["rapor_kaliplari"]]
            raporlar = [r for x in bulunan for r in x]
            rap = OK if all(bulunan) else NO
            if rap == NO:
                sayi = ", ".join(f"{k.format(kod=b)}: {len(x)}" for k, x in zip(self.a["rapor_kaliplari"], bulunan))
                self.kirmizi(kir, b, f"kabul edilmiş, ama denetim raporu eksik ({sayi})")
            aranan = self.a["kabul_kaydi_ozel"].get(b, self.a["kabul_kaydi"].format(kod=b))
            var = aranan in kd
            kay = OK if var else NO
            if not var:
                self.kirmizi(kir, b, f"kabul edilmiş, ama karar defterinde \"{aranan}\" bulunamadı")
        elif tur:
            adlar = [k.format(kod=b).replace("*", tur.group(2)) for k in self.a["rapor_kaliplari"]]
            eksik = [x for x in adlar if not (self.den / x).exists()]
            raporlar = [self.den / x for x in adlar if x not in eksik] if tur.group(1) == "revizyonda" else []
            rap = OK if not eksik else NO
            # Denetim sürerken raporun eksik olması olağandır; revizyon ise iki rapor olmadan başlamaz.
            if eksik and tur.group(1) == "denetimde":
                rap = YOK
                self.notlar.append(f"{b}: denetim sürüyor, bu turun raporu henüz yok: {eksik}")
            elif eksik:
                self.kirmizi(kir, b, f"durum \"{tur.group(1)} (tur {tur.group(2)})\", ama bu turun raporu yok: {eksik}")
            if tur.group(1) == "revizyonda" and not self.revizyon_kaydi(b, tur.group(2)):
                self.kirmizi(kir, b, f"revizyon mesajı kayıtsız: denetim/revizyon_kararlari.md'de "
                                     f"\"{b}, tur {tur.group(2)}\" başlıklı kayıt yok")
        bitis = (self.a["rapor_bitis_isareti"] or "").strip()
        yarim = [r.name for r in raporlar if bitis and (oku(r).rstrip().splitlines() or [""])[-1].strip() != bitis]
        if yarim:
            rap = NO
            self.kirmizi(kir, b, f"rapor yarım görünüyor (son satırda \"{bitis}\" yok): {yarim}")
        tut = []
        if bekliyor:
            tut.append("durum 'bekliyor' ama dosya var")
        s = re.search(r"([\d.]+) kelime", durum)
        if s:
            yaz = int(s.group(1).replace(".", ""))
            if abs(yaz - o["kelime"]) > 0.03 * o["kelime"]:
                tut.append(f"kelime: ilerleme {yaz}, dosya {o['kelime']}")
        s = re.search(r"(\d+) (?:dn|kaynak)", durum)
        if s and int(s.group(1)) != say:
            tut.append(f"atıf: ilerleme {s.group(1)}, dosya {say}")
        sat = ilr.get(b)
        if sat is None:
            if not self.ilr_baslik_yok:
                tut.append("ilerleme.md'de satır yok")
        elif kabul and "✔" not in sat["kabul"]:
            tut.append("kabul sütunu işaretsiz")
        if tut:
            self.kirmizi(kir, b, "ilerleme.md tutarsız: " + "; ".join(tut))
        iz = self.durum_izleri(b, tum, dd, kabul, kir)
        return [b, kisa, f"{h} {o['kelime']} ({alt}–{ust})", f"{d} {say} (≤{dn}; işaret {isaret})",
                rt, ic, es, f"{or_} {o['ort']:.1f}", f"{uz} {len(o['uzun'])}", f"{rap} / {kay}",
                f"{OK if not tut and not iz else NO}"]

    def revizyon_kaydi(self, b, n):
        """revizyon_kararlari.md'de '## <BİRİM>, tur n' benzeri başlık ('B1a — tur 1', 'B1a (tur 1)' da olur)."""
        yol = self.den / "revizyon_kararlari.md"
        if not yol.is_file():
            return False
        desen = r"^#{2,4} [^\n]*?\b" + re.escape(b) + r"\b[^\n]*?\b(?i:tur)\s*" + n + r"\b"
        return bool(re.search(desen, yorumsuz(oku(yol)), re.M))

    def durum_izleri(self, b, tum, dd, kabul, kir):
        """Teslimde kalan yarım notu, iki sürüm izi, kabulden sonra değişiklik; kırmızı varsa True."""
        n0 = len(kir)
        if dd.startswith(TESLIM_SONRASI) and DEVAM.search(tum):
            self.kirmizi(kir, b, f"durum \"{dd[:30]}\", ama dosyada \"DEVAM EDİYOR\" notu kalmış")
        # Devir notu teslim ölçütüdür; kabulden sonra birim dosyası yalnız arşivdir.
        if dd.startswith(("teslim edildi", "denetimde", "revizyonda")) and not DEVIR.search(tum):
            self.kirmizi(kir, b, f"durum \"{dd[:30]}\", ama dosyada devir notu kısmı yok (teslim ölçütü)")
        if dd.startswith(("yazımda", "başlatılıyor")) and DEVIR.search(tum) and not DEVAM.search(tum):
            self.notlar.append(f"{b}: teslim edilmiş görünüyor; durumu güncelle (durum \"{dd[:30]}\", ama devir "
                               "notu var ve DEVAM EDİYOR notu yok)")
        iz = []
        n = len(re.findall(r"^### .*[Dd]evir notu", tum, re.M))
        if n > 1:
            iz.append(f"{n} devir notu başlığı")
        n = len(re.findall(r"<!--\s*yazar:", tum))
        if n > 1:
            iz.append(f"{n} yazar işareti")
        cift = [x for x, k in collections.Counter(re.findall(r"^### (.+?)\s*$", tum, re.M)).items() if k > 1]
        if cift:
            iz.append(f"yinelenen başlık: {cift[:3]}")
        if iz:
            self.kirmizi(kir, b, "iki sürüm izi: " + "; ".join(iz))
        if kabul:
            arsiv = sorted(self.bol.glob(f"_arsiv/{b}_kabul_*.md"))
            if not arsiv:
                self.arsivsiz.append(b)
            elif oku(arsiv[-1]).rstrip() != tum.rstrip():
                self.kirmizi(kir, b, f"kabulden sonra değişmiş: dosya _arsiv/{arsiv[-1].name} kopyasından farklı")
        return len(kir) > n0

    def ana_metin(self, sinir, kir, ilr):
        var = self.ana is not None and self.ana.is_file()
        if not var or not oku(self.ana).strip():
            ne = "dosya boş" if var else "dosya bulunamadı (ayar: ana_metin)"
            birlesik = [b for b, s in ilr.items() if re.search(r"birleştirildi|onaylandı", durum_duz(s["durum"]))]
            if birlesik:
                self.kirmizi(kir, "Ana metin", f"{ne}, ama birleştirilmiş veya onaylanmış birim var: {birlesik}")
            else:
                self.notlar.append(f"Ana metin: {ne}; birleştirilmiş birim olmadığı için kırmızı sayılmadı.")
            self.atlanan.append(f"ana metin {'boş' if var else 'yok'}: ana metin denetimleri yapılmadı")
            return [["Ana metin", YOK, ne, YOK, YOK, YOK, YOK, YOK]]
        tum = oku(self.ana)
        b1, b2 = self.a["ana_metin_baslangic"], self.a["ana_metin_bitis"]
        m1 = re.search(r"^" + re.escape(b1) + r"(?!\w)", tum, re.M)
        if not m1:
            self.kirmizi(kir, "Ana metin", f"\"{b1}\" başlığı yok (ayar: ana_metin_baslangic); ana metin ölçülmedi")
            self.atlanan.append(f"ana metinde \"{b1}\" yok: ana metin denetimleri yapılmadı")
            return [["Ana metin", YOK, f"\"{b1}\" başlığı yok", YOK, YOK, YOK, YOK, YOK]]
        bas = m1.start()
        m2 = re.compile(r"^" + re.escape(b2) + r"(?!\w)", re.M).search(tum, m1.end())
        son = m2.start() if m2 else len(tum)
        if not m2:
            self.kirmizi(kir, "Ana metin", f"\"{b2}\" başlığı yok (ayar: ana_metin_bitis); bölümler dosya sonuna "
                         "kadar ölçüldü" + ("; kaynakça okunamadığı için atıf eşleşmesi denetlenmedi"
                                            if self.anahtarli else ""))
            if self.anahtarli:
                self.atlanan.append(f"ana metinde \"{b2}\" yok: ana metnin atıf eşleşmesi denetlenmedi")
        if self.anahtarli:
            tan_l, ref_l = self.atif(tum[son:], tum[bas:son])
            tan, ref = set(tan_l), set(ref_l)
            fark = sorted(ref - tan) if m2 else []
            ozet = f"{len(ref)} anahtar / {len(tan)} kaynakça"
            if m2 and tan - ref:
                self.notlar.append(f"Ana metin: kaynakçada olup metinde atıf yapılmayan anahtar ({len(tan - ref)}): "
                                   f"{sorted(tan - ref)[:6]}")
        else:
            # Etiketler bütün dosyadan alınır (tanım satırları hariç); tanımlar dosya sonunda toplanmasa da doğru sayılır.
            tan_l, ref_l = self.atif(tum, self.metin_ayir(tum))
            tan, ref = set(tan_l), set(ref_l)
            fark = sorted((ref - tan) | (tan - ref))
            ozet = f"{len(tan)} tanım / {len(ref)} etiket"
        sorun = self.atif_sorunlari("Ana metin", tum[bas:son], tan_l, kir)
        rt = YOK if self.anahtarli and not m2 else OK if not fark and not sorun else NO
        sat = [["Bütün dosya", YOK, ozet, rt, YOK, YOK, YOK, YOK]]
        if fark:
            self.kirmizi(kir, "Ana metin", f"atıf eşleşmesi bozuk: {fark[:6]}")
        for p in re.split(r"\n(?=## )", tum[bas:son]):
            ad = next((k for k in self.a["bolumler"] if p.lstrip().startswith(f"## {k}")), None)
            if ad is None:
                continue
            rapor = self.a["surec_raporu"].get(ad)
            if rapor and not (self.den / f"surec_denetimi_{rapor}.md").exists():
                self.kirmizi(kir, ad, f"birleştirilmiş, ama surec_denetimi_{rapor}.md yok (birleştirme kapısı)")
            m = self.bolum_sonu.search(p)
            o = self.olc(p[:m.start()] if m else p)
            kodlar = self.a["bolumler"][ad]
            alt = sum(sinir.get(b, (0, 0, 0))[0] for b in kodlar)
            ust = sum(sinir.get(b, (0, 0, 0))[1] for b in kodlar)
            h = OK if not ust or o["kelime"] <= ust * self.a["bolum_payi"] else NO
            if h == NO:
                self.kirmizi(kir, ad, f"hacim {o['kelime']} kelime; bölüm üst sınırı {ust}")
            for ad2, lst in (("iç yönetim dili", o["ic"]), ("eski kalıp", o["eski"])):
                if lst:
                    self.kirmizi(kir, ad, f"{ad2} ({len(lst)}): {lst[:3]}")
            orok = self.ort_alt <= o["ort"] <= self.ort_ust
            if not orok:
                self.kirmizi(kir, ad, f"ortalama cümle {o['ort']:.1f} kelime; hedef {self.ort_alt}–{self.ort_ust}")
            if o["uzun"]:
                self.kirmizi(kir, ad, f"{len(o['uzun'])} cümle {self.uzun} kelimeyi aşıyor; ilki: {o['uzun'][0][:90]}…")
            sat.append([ad, f"{alt}–{ust}", f"{h} {o['kelime']}", YOK, OK if not o["ic"] else NO,
                        OK if not o["eski"] else NO, f"{OK if orok else NO} {o['ort']:.1f}",
                        f"{OK if not o['uzun'] else NO} {len(o['uzun'])}"])
        return sat

    # ---------------------------------------------------------------- rapor
    @staticmethod
    def tablo(bas, satir):
        c = ["| " + " | ".join(bas) + " |", "|" + "---|" * len(bas)]
        return c + ["| " + " | ".join(str(x) for x in s) + " |" for s in satir]

    def devir_notu(self, ilr_met, numara, kir):
        """_yonetim/devir_notu.md: dayandığı ilerleme güncellemesi ve son karar numarası."""
        yol = self.yon / "devir_notu.md"
        if not yol.is_file():
            return
        t = yorumsuz(oku(yol))
        m = re.search(r"Dayandığı\W*ilerleme\.md\W*güncellemesi:\**\s*([^\n]*)", t)
        s = re.search(r"Son güncelleme:\**\s*([^\n]*)", ilr_met)
        if not m:
            self.notlar.append("Devir notu: devir notunda dayandığı güncelleme yok; tazeliği denetlenemedi.")
        elif tarih_oku(m.group(1)) is None or not s or tarih_oku(s.group(1)) is None:
            self.notlar.append("Devir notu: dayandığı güncellemenin veya ilerleme.md 'Son güncelleme' satırının "
                               "tarihi okunamadı; tazeliği denetlenemedi.")
        elif tarih_oku(s.group(1)) > tarih_oku(m.group(1)):
            self.notlar.append(f"Devir notu eski (dayandığı güncelleme {m.group(1).strip()[:16]}, ilerleme.md "
                               f"{s.group(1).strip()[:16]}): yalnız kural özeti olarak okunmalı, sonra _arsiv/'e taşınmalı.")
        k = re.search(r"Son karar:\**\s*K-(\d{3})", t)
        if k and numara and int(k.group(1)) != numara[-1]:
            self.kirmizi(kir, "Devir notu", f"\"Son karar: K-{k.group(1)}\" yazıyor; karar defterinde son numara "
                                            f"K-{numara[-1]:03d}")

    def cerceve_notu(self, onay, ilr_met, kd, kir):
        """Dolu çerçeve notunun iki denetim raporu (rapor kalıplarında {kod} = CN)."""
        yol = self.yon / "cerceve_notu.md"
        dolu = yol.is_file() and any(s.strip() and not s.lstrip().startswith(("#", ">"))
                                     for s in yorumsuz(oku(yol)).splitlines())
        if not dolu:
            self.atlanan.append("çerçeve notu yok veya yalnız başlık: çerçeve notu raporları aranmadı")
            return
        eksik = [k.format(kod="CN") for k in self.a["rapor_kaliplari"] if not list(self.den.glob(k.format(kod="CN")))]
        if not eksik:
            return
        if "çerçeve" in onay.lower():
            self.kirmizi(kir, "Çerçeve notu", f"onaya sunulmuş (ilerleme.md §3), ama denetim raporu yok: {eksik}")
        elif "çerçeve notu onaylandı" in (ilr_met + kd).lower():
            self.kirmizi(kir, "Çerçeve notu", f"onaylandı diye kayıtlı, ama denetim raporu yok: {eksik}")
        else:
            self.notlar.append(f"Çerçeve notu dolu, denetim raporu henüz yok: {eksik}")

    def calistir(self):
        kir = list(self.ayar_kir)
        if not self.a["birimler"]:
            self.notlar.append("Ayarda birim yok; plan onayından önce olağan.")
        sinir = self.hacim_sinirlari(kir)
        ilr, ilr_met = self.ilerleme_satirlari(kir)
        kdy = self.yon / "karar_defteri.md"
        kd = yorumsuz(oku(kdy)) if kdy.exists() else ""
        g = self.a["giris_kodu"]
        if g and g in self.a["birimler"] and g not in ilr and not self.ilr_baslik_yok:
            self.kirmizi(kir, g, "ilerleme.md birim tablosunda Giriş satırı yok")
        bir = [x for x in (self.birim_satiri(b, sinir, ilr, kd, kir) for b in self.a["birimler"]) if x]
        if self.planlanmamis:
            self.notlar.append("Planlanmamış birimler (ayarda var; ilerleme.md'de satırı ve dosyası yok): "
                               + ", ".join(self.planlanmamis))
        ana = self.ana_metin(sinir, kir, ilr)
        dosyalar = sorted(self.yon.rglob("*.md")) + [self.bol / f for f in self.a["birimler"].values()]
        for y in dosyalar + ([self.ana] if self.ana else []):
            if y == self.rapor or not y.is_file():
                continue
            for i, sat in enumerate(yorumsuz(oku(y)).splitlines(), 1):
                if "{{" in sat:
                    yer = y.relative_to(self.kok) if self.kok in y.parents else y
                    self.kirmizi(kir, "Yer tutucu", f"doldurulmamış yer tutucu: {yer}:{i}")
                    break
        # Kayıt başlığı "### K-0xx — Başlık"; "### K-0xx eki …" ve "### K-0xx(b) inceltmesi" ek sayılır.
        kn = re.findall(r"^### K-(\d{3}[a-z]?)\s+[—–-]\s", kd, re.M)
        cift = sorted(n for n, k in collections.Counter(kn).items() if k > 1)
        if cift:
            self.kirmizi(kir, "Karar defteri", "aynı karar numarası birden çok kayıt başlığında: "
                         + ", ".join(f"K-{n}" for n in cift))
        numara = sorted({int(n) for n in re.findall(r"^### K-(\d{3})", kd, re.M)})
        onay_bas = re.escape(self.a["ilerleme"]["onay"])
        onay = re.search(onay_bas + r"\s+(.+?)\n\n", ilr_met + "\n\n", re.S)
        self.devir_notu(ilr_met, numara, kir)
        self.cerceve_notu(onay.group(1) if onay else "", ilr_met, kd, kir)
        if not kdy.exists():
            self.atlanan.append("karar_defteri.md yok: kabul kaydı ve karar numaraları denetlenmedi")
        if self.ilr_baslik_yok:
            self.atlanan.append("ilerleme.md birim tablosu okunamadı: durum denetimleri yapılmadı")
        if not self.a["rapor_bitis_isareti"]:
            self.atlanan.append("rapor_bitis_isareti tanımlı değil: rapor bütünlüğü denetlenmedi")
        if self.arsivsiz:
            self.atlanan.append(f"kabul arşivi yok ({', '.join(self.arsivsiz)}): kabul sonrası değişiklik denetlenmedi")
        if not self.a["surec_raporu"]:
            self.atlanan.append("surec_raporu boş: birleştirilmiş bölümlerin süreç raporu aranmadı")
        z = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
        atif_adi = "Kaynak" if self.anahtarli else "Dipnot"
        c = ["# Süreç durumu", "",
             f"Üretim: {z}. Bu dosya `_araclar/surec_denetimi.py` tarafından üretilir; elle düzenlenmez.", ""]
        c += ["## Dosyalardan okunan değerler", "",
              f"- Son karar numarası: {f'K-{numara[-1]:03d}' if numara else 'yok'}",
              f"- Bekleyen onay noktası: {onay.group(1).strip() if onay else 'bulunamadı'}",
              f"- Hacim sınırı okunan birim sayısı: {len(sinir)}",
              f"- Kırmızı madde sayısı: {len(kir)}", ""]
        c += ["## Birimler", ""]
        c += self.tablo(["Birim", "Durum (ilerleme.md)", "Kelime (sınır)", atif_adi, "Ref–tanım", "İç dil",
                         "Eski kalıp", "Ort. cümle", f">{self.uzun} kelime", "Rapor / karar def.", "İlerleme"], bir)
        c += ["", "## Birleşik ana metin", ""]
        c += self.tablo(["Kısım", "Sınır", "Kelime", "Ref–tanım", "İç dil", "Eski kalıp", "Ort. cümle",
                         f">{self.uzun} kelime"], ana)
        c += ["", "## Kırmızı maddeler", ""] + (kir or ["Kırmızı madde yok."]) + [""]
        if self.notlar:
            c += ["## Notlar", ""] + [f"- {n}" for n in self.notlar] + [""]
        c += ["## Betiğin denetlemedikleri", "", "Hiçbir çalıştırmada (yanında denetleyen):", ""]
        c += [f"- {ne} — {kim}" for ne, kim in DENETLENMEYEN]
        c += ["", "Bu çalıştırmada atlananlar:", ""] + [f"- {x}" for x in self.atlanan or ["Yok."]] + [""]
        c += ["## Ölçüm notu", "",
              "Kelime sayısı atıfları ve birim sonu kısımlarını dışarıda bırakır, başlıkları içerir. Cümle "
              "ölçümü kısaltmaları ve tarihleri korumaya çalışan basit bir ayırıcıyla yapılır; kısa farklar "
              "normaldir. Her kırmızı maddenin gerekçesi karar defterinin D bölümündedir.", ""]
        self.den.mkdir(parents=True, exist_ok=True)
        self.rapor.write_text("\n".join(c), encoding="utf-8")
        print(f"Rapor: {self.rapor}\nKırmızı madde: {len(kir)}")
        return 1 if kir else 0


def hata_raporu(kok, mesaj):
    """Betik çalışamadığında eski raporun yerinde kalmaması için kısa bir rapor yazar."""
    if not (kok / "_yonetim").is_dir():
        return
    den = kok / "_yonetim" / "denetim"
    den.mkdir(exist_ok=True)
    z = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
    (den / "surec_durumu.md").write_text("\n".join([
        "# Süreç durumu", "",
        f"Üretim: {z}. Bu dosya `_araclar/surec_denetimi.py` tarafından üretilir; elle düzenlenmez.", "",
        f"**Betik hata verdi:** {mesaj}", "",
        "Denetim yapılamadı; önceki sonuç geçerli değildir. Hata giderilince betik yeniden çalıştırılır.", ""]),
        encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--ayar", default=str(ARACLAR / "surec_ayarlari.json"))
    arg = p.parse_args()
    kok = (ARACLAR / VARSAYILAN["cikti_klasoru"]).resolve()
    try:
        ayar, kir = ayar_oku(pathlib.Path(arg.ayar))
        kok = (ARACLAR / ayar["cikti_klasoru"]).resolve()
        return Denetim(ayar, kir).calistir()
    except BetikHatasi as e:
        mesaj = str(e)
    except Exception as e:  # beklenmeyen hata da eski raporu geçersiz kılar
        traceback.print_exc()
        mesaj = f"beklenmeyen hata ({type(e).__name__}: {e}); ayrıntı terminalde"
    print(f"HATA: {mesaj}", file=sys.stderr)
    hata_raporu(kok, mesaj)
    return 2


if __name__ == "__main__":
    sys.exit(main())
