#!/usr/bin/env python3
"""Künye doğrulama: Markdown künyelerindeki DOI ve PMID'leri Crossref ve PubMed'de sorgular.

Kullanım:  python3 <çıktı klasörü>/_araclar/kunye_dogrula.py DOSYA.md [DOSYA2.md …]
           [--rapor yol.md] [--kapsam ad] [--onbellek yanitlar.json] [--cevrimdisi]

Künyeler `- [@anahtar] …` satırlarından ve `[^etiket]: …` dipnot tanımlarından okunur
(girintili devam satırları dahil). Yalnız api.crossref.org ve eutils.ncbi.nlm.nih.gov'a
bağlanır; yalnız DOI ve PMID gönderir. Rapor varsayılan olarak
<çıktı klasörü>/_yonetim/denetim/kunye_dogrulama_<kapsam>.md. Metin dosyalarını değiştirmez;
girdi, önbellek veya bu aracın raporu olmayan bir dosyanın üzerine rapor yazmaz.
Çıkış kodu: 0 sorun yok; 1 en az bir kritik (Crossref/PubMed'de bulunamadı, uyuşmaz, geri çekilmiş
yayın); 2 girdi hatası; 3 kısmi (ağ hatası, kimliksiz künye, çevrimdışı çalışma veya hiç künye yok;
kritik yok).
"""
import argparse
import dataclasses
import datetime
import html
import http.client
import json
import os
import pathlib
import re
import sys
import tempfile
import time
import traceback
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ARACLAR = pathlib.Path(__file__).resolve().parent
KOK = ARACLAR.parent                      # surec_denetimi.py ile aynı: _araclar/..

# --- Ağ ---
CROSSREF = "https://api.crossref.org/works/"
PUBMED = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
IZINLI = {"api.crossref.org", "eutils.ncbi.nlm.nih.gov"}
UA = "kunye_dogrula/1.0 (hakemli kunye dogrulama araci; Python-urllib)"
ZAMAN_ASIMI = 20                          # sn, her istek için
BEKLEME = 0.5                             # sn, iki istek arası en az (NCBI anahtarsız sınırı 3/sn)
TEKRAR_BEKLEME = 2.0                      # sn, tek tekrar denemeden önce
ARDISIK_HATA_SINIRI = 3                   # aynı makinede art arda bu kadar hata: kalanlar sorgulanmaz
PUBMED_PAKET = 50                         # tek esummary isteğindeki PMID sayısı
ONBELLEK_GUN = 30                         # bulunan kayıt: daha eskisi yeniden sorgulanır (geri çekilme sonradan gelir)
# Bulunamayan kayıt kısa saklanır: yayıncılar DOI'yi makale çıktıktan günler sonra Crossref'e yatırabilir,
# PubMed dizinlemesi de gecikir; yeni kayıtlı bir eser bir hafta sonra yeniden sorgulanır.
ONBELLEK_YOK_GUN = 7

# --- Karşılaştırma eşikleri ---
# Başlık: kayıttaki başlığın içerik kelimelerinden künyede geçenlerin oranı (örtüşme, Jaccard değil;
# künyede yazar ve dergi kelimeleri de olduğundan). %80 ve üstü birkaç yazım farkına, Amerikan/İngiliz
# yazımına, eksik bir iki kelimeye izin verir; %50–80 çoğunlukla kısaltılmış alt başlık veya farklı sürüm;
# %50'nin altı büyük olasılıkla başka bir eserdir.
BASLIK_DOGRU = 0.80
BASLIK_UYARI = 0.50
# Dergi: dergi adının kelimelerinden künyede tam ya da kısaltma (ön ek, en az 3 harf; "J" = Journal)
# olarak geçenlerin oranı. Yalnız bilgi; durumu etkilemez.
DERGI_ESIK = 0.60
# İlk yazar: soyadından önce künyede yalnız o yazarın kendi adı veya baş harfleri (ad önde yazılan
# Türkçe dipnot biçimi: "Ahmet Yılmaz") ve unvan gelebilir; önünde başka bir ad varsa sıra kaymıştır
# (uyarı), soyadı hiç yoksa uyuşmaz. Karakter sayısına dayalı pencere kısa Vancouver adlarında
# ("Kaya A, Şahin M") sıra kaymasını kaçırdığı için kullanılmaz.
UNVAN = {"prof", "dr", "doc", "yrd", "uzm", "av", "phd", "md"}

# "Bulunamadı" uydurma kanıtı değildir (DataCite/mEDRA DOI'si, yeni kayıt); etiket bunu söyler.
DOGRU, UYARI, UYUSMAZ, BULUNAMADI, KIMLIKSIZ, AG, CEVRIMDISI = (
    "doğru", "uyarı", "uyuşmaz", "Crossref/PubMed'de bulunamadı", "kimliksiz", "ağ hatası", "çevrimdışı")
SIRA = {BULUNAMADI: 0, UYUSMAZ: 1, AG: 2, UYARI: 3, DOGRU: 4}   # birleştirmede en kötü kazanır
GERI = "geri çekilme"
RAPOR_BASI = "# Künye doğrulama"          # yalnız bu satırla başlayan dosyanın üzerine yazılır

YORUM = re.compile(r"<!--.*?-->", re.S)
CIT = re.compile(r"^\s*(```|~~~)")
KACIS = re.compile(r"\\([_*\[\]()<>#])")                 # pandoc/Markdown kaçışı: 10.1016/j.x\_y
GORUNMEZ = re.compile("[\u00ad\u200b\u200c\u200d\u2060\ufeff]")   # yumuşak tire, sıfır genişlikli
# Eser ayracı: "; " + harf (Vancouver'daki "2021;372" boşluksuz, "1998; 351" rakamla sürer) veya
# cümle/; sonrası "Ayrıca bkz.", "see also" gibi yeni eseri başlatan söz.
ESER_AYRACI = re.compile(r";\s+(?=[^\W\d_])", re.I)
YENI_ESER = re.compile(r"[.;]\s+(?=(?:ayrıca|bkz|bk\.|krş|karş|örn|ör\.|see|cf\.|also)\b)", re.I)
KISA_PARCA = 25                           # harf; bundan kısa parça tek başına künye olamaz
ANAHTAR_SATIRI = re.compile(r"^\s*[-*+]\s+\[@([^\]\s;,]+)\]\s*(.*)$")
DIPNOT_TANIMI = re.compile(r"^\[\^([^\]]+)\]:\s*(.*)$")
DOI_URL = re.compile(r"https?://(?:dx\.)?doi\.org/\S+", re.I)
DOI = re.compile(r"10\.\d{4,9}/[^\s\"'<>\[\]|`]+")
PMID = re.compile(r"\bPMID\s*[:=]?\s*(\d{1,9})\b|pubmed\.ncbi\.nlm\.nih\.gov/(\d{1,9})"
                  r"|ncbi\.nlm\.nih\.gov/pubmed/(\d{1,9})", re.I)
ISBN = re.compile(r"\bISBN\b", re.I)
URL = re.compile(r"https?://\S+|\bdoi:\s*|\bPMID\s*[:=]?\s*\d+", re.I)
GIRIS_SOZU = re.compile(r"^(?:bkz|bk|bakiniz|ayrica|krs|kars|orn|or|ornegin|aktaran|akt|see|cf|eg|e g|also|"
                        r"ayrintili bilgi icin|ayrinti icin)\s+")
AYLAR = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
DURAK = {"the", "and", "for", "with", "from", "into", "its", "are", "was", "were", "this", "that",
         "than", "via", "über", "und", "der", "die", "das", "des", "les", "une", "pour", "ile",
         "bir", "icin", "olarak", "gibi", "daha", "olan", "veya", "uzerine", "uzerinde"}


class GirdiHatasi(Exception):
    """Girdi veya seçenek hatası: çıkış 2."""


class AgHatasi(Exception):
    """Sorgu yapılamadı: künye "ağ hatası" olur."""


class SemaHatasi(ValueError):
    """Yanıt veya önbellek kaydı beklenen yapıda değil: yalnız o kayıt "ağ hatası" olur."""


@dataclasses.dataclass
class Kimlik:
    tur: str        # "DOI" veya "PMID"
    deger: str      # DOI küçük harf
    son: int        # tarama metnindeki bitiş konumu (bölütleme için)


@dataclasses.dataclass
class Kunye:
    dosya: pathlib.Path
    satir: int
    tur: str        # "anahtar" veya "dipnot"
    etiket: str
    metin: str
    kimlikler: list = dataclasses.field(default_factory=list)
    bulgular: list = dataclasses.field(default_factory=list)
    durum: str = ""


# ---------------------------------------------------------------- okuma

def kunyeleri_oku(yol):
    """(künyeler, biçim notları)."""
    if not yol.exists():
        raise GirdiHatasi(f"dosya yok: {yol}")
    if not yol.is_file():
        raise GirdiHatasi(f"dosya değil: {yol}")
    try:
        metin = yol.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as e:
        raise GirdiHatasi(f"dosya UTF-8 metin değil ({yol}, bayt {e.start})")
    except OSError as e:
        raise GirdiHatasi(f"dosya okunamadı ({yol}): {e}")
    if not metin.strip():
        raise GirdiHatasi(f"dosya boş: {yol}")
    if "\x00" in metin:
        raise GirdiHatasi(f"dosya ikili veri içeriyor, Markdown değil: {yol}")
    metin = metin.replace("\r\n", "\n").replace("\r", "\n")
    metin = YORUM.sub(lambda m: "\n" * m.group(0).count("\n"), metin)   # satır numaraları korunur
    satirlar, sonuc, i, cit, cit_satiri = metin.split("\n"), [], 0, None, 0
    while i < len(satirlar):
        s = satirlar[i]
        c = CIT.match(s)
        if c and cit is None:
            cit, cit_satiri = c.group(1), i + 1
        elif c and c.group(1) == cit:                      # çit aynı işaretle kapanır
            cit = None
        m = None if cit or c else (ANAHTAR_SATIRI.match(s) or DIPNOT_TANIMI.match(s))
        if not m:
            i += 1
            continue
        parca, j = [m.group(2).strip()], i + 1
        while (j < len(satirlar) and satirlar[j].strip() and satirlar[j][:1] in " \t"
               and not ANAHTAR_SATIRI.match(satirlar[j])):
            parca.append(satirlar[j].strip())
            j += 1
        k = Kunye(yol, i + 1, "anahtar" if s.lstrip()[:1] in "-*+" else "dipnot", m.group(1),
                  " ".join(p for p in parca if p))
        k.kimlikler = kimlikleri_cikar(k.metin)
        sonuc.append(k)
        i = j
    notlar = [f"{yol}:{cit_satiri}: kapanmamış {cit} kod çiti; o satırdan sonrası künye olarak okunmadı"] if cit else []
    return sonuc, notlar


def tarama_metni(metin):
    """Markdown kaçışları (\\_ \\* \\( …) çözülür, yumuşak tire ve sıfır genişlikli karakterler silinir,
    doi.org bağlantılarındaki %2F vb. çözülür; DOI deseni ve bölütleme bu metinde çalışır."""
    metin = KACIS.sub(r"\1", GORUNMEZ.sub("", metin))
    return DOI_URL.sub(lambda m: urllib.parse.unquote(m.group(0)), metin)


def doi_temizle(d):
    onceki = None
    while d != onceki:
        onceki = d
        d = d.rstrip(".,;:*_'\"")
        if d.endswith(")") and d.count(")") > d.count("("):
            d = d[:-1]
    return d


def kimlikleri_cikar(metin):
    t, kim, gorulen = tarama_metni(metin), [], set()
    for m in DOI.finditer(t):
        d = doi_temizle(m.group(0))
        if "/" in d and d.split("/", 1)[1] and ("DOI", d.lower()) not in gorulen:
            gorulen.add(("DOI", d.lower()))
            kim.append(Kimlik("DOI", d.lower(), m.start() + len(d)))
    for m in PMID.finditer(t):
        p = str(int(next(g for g in m.groups() if g)))
        if ("PMID", p) not in gorulen:
            gorulen.add(("PMID", p))
            kim.append(Kimlik("PMID", p, m.end()))
    return sorted(kim, key=lambda k: k.son)


def harf_sayisi(s):
    return len(re.sub(r"[\W\d_]+", "", DOI.sub("", URL.sub("", s))))


def bolutler(k):
    """Kimlik → (karşılaştırılacak metin parçası, aynı eserin kimlikleri). Bir DOI ile bir PMID'nin aynı
    eser olduğu varsayılmaz. Kimlik çoğunlukla künyenin sonunda olduğundan parça, önceki kimliğin
    bitişinden bu kimliğin bitişine kadardır; kimlik dışında KISA_PARCA harften az metni olan parça
    (ör. DOI'den sonra gelen "PMID: 123") aynı eserin ikinci kimliğidir, öncekine eklenir. Parçanın
    başında kimliksiz başka bir eser varsa son eser ayracından ("Ayrıca bkz.", ya da öncesinde yıl
    bulunan "; " + harf) sonrası alınır; ayraçtan sonra en az KISA_PARCA harf kalmalıdır. Yıl şartı,
    yazarları ";" ile ayıran biçimlerde (MDPI: "Page, M.J.; McKenzie, J.E.") yanlış kesmeyi önler."""
    t = tarama_metni(k.metin)
    gruplar, bas = [], 0
    for x in k.kimlikler:
        parca = t[bas:x.son]
        if gruplar and harf_sayisi(parca) < KISA_PARCA:
            gruplar[-1][0] += parca
            gruplar[-1][1].append(x)
        else:
            gruplar.append([parca, [x]])
        bas = x.son
    sonuc = {}
    for metin, kimlikler in gruplar:
        ayraclar = [m for m in YENI_ESER.finditer(metin)]
        ayraclar += [m for m in ESER_AYRACI.finditer(metin)
                     if kunye_yili(metin[:m.start()]) and harf_sayisi(metin[:m.start()]) >= KISA_PARCA]
        for m in sorted(ayraclar, key=lambda m: m.end(), reverse=True):
            if harf_sayisi(metin[m.end():]) >= KISA_PARCA:
                metin = metin[m.end():]
                break
        for x in kimlikler:
            sonuc[(x.tur, x.deger)] = (metin, kimlikler)
    return sonuc


# ---------------------------------------------------------------- normalizasyon

def normal(s):
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    s = s.replace("İ", "i").replace("ı", "i").casefold()
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    for a, b in (("æ", "ae"), ("œ", "oe"), ("ø", "o"), ("ł", "l"), ("đ", "d"), ("ð", "d"), ("þ", "th")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def karsilastirma_metni(parca):
    """Kimlik, bağlantı ve elle etiket ({Smith, 2020}) çıkarılır; giriş sözleri (Bkz., see) atılır."""
    s = re.sub(r"^\s*\{[^}]*\}", " ", parca)
    s = normal(DOI.sub(" ", URL.sub(" ", s)))
    onceki = None
    while s != onceki:
        onceki, s = s, GIRIS_SOZU.sub("", s)
    return s


def icerik_kelimeleri(s):
    return list(dict.fromkeys(t for t in normal(s).split() if (len(t) >= 3 or t.isdigit()) and t not in DURAK))


def kunye_yili(parca):
    s = DOI.sub(" ", URL.sub(" ", parca))
    yil = r"(1[89]\d\d|20\d\d)"
    bu_yil = datetime.date.today().year
    for desen in (rf"\({yil}[a-z]?(?:[,;][^)]*)?\)", rf"(?<!\d){yil}[a-z]?\s*;", rf"(?<!\d){yil}\s+(?:{AYLAR})"):
        for m in re.finditer(desen, s, re.I):
            if int(m.group(1)) <= bu_yil + 1:
                return int(m.group(1))
    for m in re.finditer(rf"(?<!\d){yil}(?!\d)", s):
        if int(m.group(1)) <= bu_yil + 1:
            return int(m.group(1))
    return None


# ---------------------------------------------------------------- yanıt özetleme

def guncelleme_turu(s):
    s = (s or "").lower()
    if re.search(r"retract|withdraw|removal", s):
        return GERI
    if "concern" in s:
        return "endişe bildirimi"
    if re.search(r"correct|errat|corrigend", s):
        return "düzeltme"
    return None


def yillar(*tarihler):
    y = []
    for t in tarihler:
        try:
            v = int(t["date-parts"][0][0])
        except (KeyError, IndexError, TypeError, ValueError):
            continue
        if v not in y:
            y.append(v)
    return y


def metinler(x):
    """Metin veya metin listesi beklenen alan; başka tipteki öğeler atılır."""
    if isinstance(x, str):
        return [x] if x.strip() else []
    return [s for s in x if isinstance(s, str) and s.strip()] if isinstance(x, list) else []


def ozet_gecerli(o):
    """Yanıt özeti (ve önbellek kaydı) karşılaştırmanın beklediği tiplerde mi?"""
    def metin_ya_da_yok(x):
        return x is None or isinstance(x, str)

    def metin_listesi(x):
        return isinstance(x, list) and all(isinstance(s, str) for s in x)

    return (isinstance(o, dict) and metin_ya_da_yok(o.get("yazar")) and metin_ya_da_yok(o.get("ad"))
            and metin_ya_da_yok(o.get("doi")) and isinstance(o.get("kurum_yazar"), bool)
            and metin_listesi(o.get("basliklar")) and metin_listesi(o.get("dergiler"))
            and isinstance(o.get("yillar"), list)
            and all(isinstance(v, int) and not isinstance(v, bool) for v in o["yillar"])
            and isinstance(o.get("guncelleme"), list)
            and all(isinstance(g, dict) and isinstance(g.get("tur"), str) and isinstance(g.get("yon"), str)
                    for g in o["guncelleme"]))


def iliski_yonu(anahtar):
    """Crossref relation anahtarı: "...-by" bu eser güncellendi; "...-of/-to" bu kayıt bildirimdir."""
    if anahtar.endswith("-by"):
        return "sonradan"
    if anahtar.endswith(("-of", "-to")):
        return "bildirim"
    return "ilişki"


def crossref_ozet(m):
    if not isinstance(m, dict):
        raise SemaHatasi("'message' nesne değil")
    for alan in ("author", "title", "original-title", "short-title", "container-title",
                 "short-container-title", "updated-by", "update-to"):
        if m.get(alan) is not None and not isinstance(m[alan], list):
            raise SemaHatasi(f"'{alan}' liste değil")
    if m.get("relation") is not None and not isinstance(m["relation"], dict):
        raise SemaHatasi("'relation' nesne değil")
    yazarlar = [a for a in m.get("author") or [] if isinstance(a, dict)]
    ilk = next((a for a in yazarlar if a.get("sequence") == "first"), yazarlar[0] if yazarlar else None)
    yazar, ad, kurum = None, None, False
    if ilk:
        aile, isim, verilen = (next(iter(metinler(ilk.get(a))), None) for a in ("family", "name", "given"))
        yazar = aile or isim or (verilen.split(" ")[-1] if verilen else None)
        ad = verilen if aile else None
        kurum = not aile and bool(isim)
    basliklar = [b for alan in ("title", "original-title", "short-title") for b in metinler(m.get(alan))]
    gun = []
    for yon, liste in (("sonradan", m.get("updated-by") or []), ("bildirim", m.get("update-to") or [])):
        for u in liste:
            if not isinstance(u, dict):
                continue
            tur = guncelleme_turu(f"{u.get('type', '')} {u.get('label', '')}")
            if tur:
                gun.append({"tur": tur, "yon": yon, "doi": next(iter(metinler(u.get("DOI"))), ""),
                            "yil": (yillar(u.get("updated") or {}) or [None])[0]})
    for anahtar, liste in (m.get("relation") or {}).items():
        tur = guncelleme_turu(str(anahtar))
        if tur:
            for r in liste if isinstance(liste, list) else [liste]:
                gun.append({"tur": tur, "yon": iliski_yonu(str(anahtar)), "yil": None,
                            "doi": next(iter(metinler(r.get("id"))), "") if isinstance(r, dict) else ""})
    if any(re.match(r"\s*(retracted|withdrawn)\b", b, re.I) for b in basliklar) and not any(
            g["tur"] == GERI and g["yon"] != "bildirim" for g in gun):
        gun.append({"tur": GERI, "yon": "sonradan", "doi": "", "yil": None, "kaynak": "başlık"})
    o = {"yazar": yazar, "ad": ad, "kurum_yazar": kurum, "basliklar": basliklar,
         "yillar": yillar(m.get("issued"), m.get("published-print"), m.get("published-online"), m.get("published")),
         "dergiler": [d for alan in ("container-title", "short-container-title") for d in metinler(m.get(alan))],
         "guncelleme": gun, "doi": None}
    if not ozet_gecerli(o):
        raise SemaHatasi("Crossref kaydı beklenen yapıda değil")
    return o


def pubmed_ozet(r):
    for alan in ("authors", "references", "pubtype", "articleids"):
        if r.get(alan) is not None and not isinstance(r[alan], list):
            raise SemaHatasi(f"'{alan}' liste değil")
    yazar, bas_harf, kurum = None, None, False
    for a in r.get("authors") or []:
        ad = next(iter(metinler(a.get("name"))), "").strip() if isinstance(a, dict) else ""
        if not ad:
            continue
        if a.get("authtype") == "CollectiveName":
            yazar, kurum = ad, True
        else:
            p = ad.split(" ")
            if len(p) > 1 and re.fullmatch(r"[A-Z]{1,4}", p[-1]):     # "Wakefield AJ"
                yazar, bas_harf = " ".join(p[:-1]), p[-1]
            else:
                yazar = ad
        break
    y = []
    for t in (r.get("pubdate"), r.get("epubdate"), r.get("sortpubdate")):
        m = re.match(r"\s*(\d{4})", t if isinstance(t, str) else "")
        if m and int(m.group(1)) not in y:
            y.append(int(m.group(1)))
    gun = []
    for ref in r.get("references") or []:          # "Retraction in", "Expression of concern in", "Erratum in"
        if not isinstance(ref, dict):
            continue
        rt = next(iter(metinler(ref.get("reftype"))), "")
        tur = guncelleme_turu(rt)
        if tur:
            ym = re.search(r"\b(19|20)\d\d\b", next(iter(metinler(ref.get("refsource"))), ""))
            gun.append({"tur": tur, "yon": "sonradan" if rt.endswith(" in") else "bildirim",
                        "doi": f"PMID {ref.get('pmid')}" if ref.get("pmid") else "",
                        "yil": int(ym.group(0)) if ym else None})
    turler = metinler(r.get("pubtype"))
    for pt, yon in (("Retracted Publication", "sonradan"), ("Retraction of Publication", "bildirim")):
        if pt in turler and not any(g["tur"] == GERI and g["yon"] == yon for g in gun):
            gun.append({"tur": GERI, "yon": yon, "doi": "", "yil": None})
    doi = next((next(iter(metinler(a.get("value"))), "").lower() or None for a in r.get("articleids") or []
                if isinstance(a, dict) and a.get("idtype") == "doi"), None)
    o = {"yazar": yazar, "ad": bas_harf, "kurum_yazar": kurum, "basliklar": metinler(r.get("title")), "yillar": y,
         "dergiler": metinler(r.get("fulljournalname")) + metinler(r.get("source")),
         "guncelleme": gun, "doi": doi}
    if not ozet_gecerli(o):
        raise SemaHatasi("PubMed kaydı beklenen yapıda değil")
    return o


# ---------------------------------------------------------------- ağ

class AyniMakine(urllib.request.HTTPRedirectHandler):
    """Yönlendirme yalnız izinli makinelere ve https ile izlenir."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlsplit(newurl)
        if u.scheme != "https" or u.hostname not in IZINLI:
            raise urllib.error.URLError(f"izinsiz makineye yönlendirme reddedildi ({u.hostname})")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Istemci:
    def __init__(self):
        self.acici = urllib.request.build_opener(AyniMakine())
        self.son = 0.0
        self.ardisik, self.kesik, self.istek = {}, {}, 0

    def al(self, url):
        """(HTTP kodu, gövde). 404/400/410 kod olarak döner; diğer sorunlar AgHatasi."""
        makine = urllib.parse.urlsplit(url).hostname
        if makine not in IZINLI:
            raise AgHatasi(f"izinsiz makine: {makine}")
        if makine in self.kesik:
            raise AgHatasi(f"{self.kesik[makine]} (art arda {ARDISIK_HATA_SINIRI} hatadan sonra sorgulanmadı)")
        neden = ""
        for deneme in (1, 2):
            bekle = BEKLEME - (time.monotonic() - self.son)
            if bekle > 0:
                time.sleep(bekle)
            self.son = time.monotonic()
            self.istek += 1
            try:
                istek = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
                with self.acici.open(istek, timeout=ZAMAN_ASIMI) as y:
                    govde = y.read()
                self.ardisik[makine] = 0
                return y.status, govde
            except urllib.error.HTTPError as e:
                if e.code in (400, 404, 410):
                    self.ardisik[makine] = 0
                    return e.code, b""
                neden = f"{makine}: HTTP {e.code}" + (" (erişim engellendi)" if e.code in (401, 403, 407) else "")
                if e.code not in (429, 500, 502, 503, 504):
                    break
                ra = e.headers.get("Retry-After", "") if e.headers else ""
                tekrar = min(float(ra), 10.0) if ra.isdigit() else TEKRAR_BEKLEME
            except (urllib.error.URLError, http.client.HTTPException, OSError) as e:
                sebep = getattr(e, "reason", e)
                neden = f"{makine}: {type(sebep).__name__ if not str(sebep) else sebep}"
                tekrar = TEKRAR_BEKLEME
            if deneme == 1:
                time.sleep(tekrar)
        self.ardisik[makine] = self.ardisik.get(makine, 0) + 1
        if self.ardisik[makine] >= ARDISIK_HATA_SINIRI:
            self.kesik[makine] = neden
        raise AgHatasi(neden)


class Onbellek:
    TUR = "kunye_dogrula_onbellek"

    def __init__(self, yol):
        self.yol, self.kullanilan, self.atilan = pathlib.Path(yol), 0, 0
        self.veri = {"_tur": self.TUR, "DOI": {}, "PMID": {}}
        if self.yol.exists():
            try:
                v = json.loads(self.yol.read_text(encoding="utf-8"))
            except (OSError, UnicodeDecodeError, json.JSONDecodeError) as e:
                raise GirdiHatasi(f"önbellek dosyası okunamadı ({self.yol}): {e}")
            if not (isinstance(v, dict) and v.get("_tur") == self.TUR):
                raise GirdiHatasi(f"önbellek dosyası bu aracın önbelleği değil, üzerine yazılmadı: {self.yol}")
            for tur in ("DOI", "PMID"):          # bozuk bölüm veya kayıt yalnız kendini geçersiz kılar
                kayitlar = v.get(tur)
                if not isinstance(kayitlar, dict):
                    self.atilan += kayitlar is not None
                    continue
                for anahtar, k in kayitlar.items():
                    if self.gecerli(k):
                        self.veri[tur][anahtar] = k
                    else:
                        self.atilan += 1

    @staticmethod
    def gecerli(k):
        if not (isinstance(k, dict) and isinstance(k.get("tarih"), str) and isinstance(k.get("kod"), int)):
            return False
        try:
            datetime.date.fromisoformat(k["tarih"])
        except ValueError:
            return False
        return ozet_gecerli(k.get("ozet")) if k["kod"] == 200 else isinstance(k.get("ozet"), str)

    def al(self, tur, deger):
        k = self.veri[tur].get(deger)
        if not k:
            return None
        yas = (datetime.date.today() - datetime.date.fromisoformat(k["tarih"])).days
        if not 0 <= yas <= (ONBELLEK_GUN if k["kod"] == 200 else ONBELLEK_YOK_GUN):   # gelecek tarih de bayat
            return None
        self.kullanilan += 1
        return k

    def koy(self, tur, deger, kod, ozet):
        self.veri[tur][deger] = {"tarih": datetime.date.today().isoformat(), "kod": kod, "ozet": ozet}

    def yaz(self):
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        fd, gecici = tempfile.mkstemp(dir=self.yol.parent, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(self.veri, f, ensure_ascii=False, indent=1)
        os.replace(gecici, self.yol)


YANIT_HATALARI = (ValueError, KeyError, TypeError, AttributeError, IndexError)


def sorgula(kunyeler, istemci, onbellek):
    """{(tur, değer): ("kayit", özet) | ("yok", neden) | ("ag", neden)}. Olumsuz sonuç ("yok") yalnız
    sunucu açıkça "kayıt yok" dediğinde verilir ve önbelleğe yazılır; şeması bozuk yanıt "ag" olur."""
    sonuc = {}
    doiler = list(dict.fromkeys(x.deger for k in kunyeler for x in k.kimlikler if x.tur == "DOI"))
    pmidler = list(dict.fromkeys(x.deger for k in kunyeler for x in k.kimlikler if x.tur == "PMID"))

    def onbellekten(tur, d):
        c = onbellek.al(tur, d) if onbellek else None
        if c:
            sonuc[(tur, d)] = ("kayit", c["ozet"]) if c["kod"] == 200 else ("yok", c["ozet"])
        return bool(c)

    for d in doiler:
        if onbellekten("DOI", d):
            continue
        try:
            kod, govde = istemci.al(CROSSREF + urllib.parse.quote(d, safe=""))
        except AgHatasi as e:
            sonuc[("DOI", d)] = ("ag", str(e))
            continue
        if kod == 200:
            try:
                veri = json.loads(govde)
                ozet = crossref_ozet(veri.get("message") if isinstance(veri, dict) else None)
            except YANIT_HATALARI as e:
                sonuc[("DOI", d)] = ("ag", f"api.crossref.org: yanıt şeması beklenmedik ({e})")
                continue
            sonuc[("DOI", d)] = ("kayit", ozet)
        else:
            ozet = f"Crossref'te kayıt yok (HTTP {kod})"
            sonuc[("DOI", d)] = ("yok", ozet)
        if onbellek:
            onbellek.koy("DOI", d, kod, ozet)
    sorulacak = [p for p in pmidler if not onbellekten("PMID", p)]
    for i in range(0, len(sorulacak), PUBMED_PAKET):
        paket = sorulacak[i:i + PUBMED_PAKET]
        try:
            kod, govde = istemci.al(PUBMED + "?" + urllib.parse.urlencode(
                {"db": "pubmed", "id": ",".join(paket), "retmode": "json"}))
            veri = json.loads(govde) if kod == 200 else None
            if not (isinstance(veri, dict) and isinstance(veri.get("result"), dict)):
                hata = veri.get("error") if isinstance(veri, dict) else None
                raise SemaHatasi(f"HTTP {kod}, " + (f"hata: {hata}" if hata else "'result' yok"))
            sonuclar = veri["result"]
        except AgHatasi as e:
            for p in paket:
                sonuc[("PMID", p)] = ("ag", str(e))
            continue
        except YANIT_HATALARI as e:          # 200 + {"error": …} dahil: olumsuz sonuç sayılmaz, önbelleğe girmez
            for p in paket:
                sonuc[("PMID", p)] = ("ag", f"eutils.ncbi.nlm.nih.gov: yanıt şeması beklenmedik ({e})")
            continue
        for p in paket:
            r = sonuclar.get(p)
            if r is not None and not isinstance(r, dict):
                sonuc[("PMID", p)] = ("ag", "eutils.ncbi.nlm.nih.gov: kayıt nesne değil")
                continue
            if r and not r.get("error"):
                try:
                    ozet = pubmed_ozet(r)
                except YANIT_HATALARI as e:
                    sonuc[("PMID", p)] = ("ag", f"eutils.ncbi.nlm.nih.gov: yanıt şeması beklenmedik ({e})")
                    continue
                sonuc[("PMID", p)] = ("kayit", ozet)
                kod = 200
            else:
                ozet = "PubMed'de kayıt yok" + (f" ({r['error']})" if r and r.get("error") else "")
                sonuc[("PMID", p)] = ("yok", ozet)
                kod = 404
            if onbellek:
                onbellek.koy("PMID", p, kod, ozet)
    return sonuc


# ---------------------------------------------------------------- karşılaştırma

def yazar_denetle(o, metin):
    if not o["yazar"]:
        return None, "kayıtta yazar yok"
    ad = normal(o["yazar"])
    m = re.search(rf"\b{re.escape(ad)}\b", metin) if ad else None
    if not m:
        uzun = max((t for t in ad.split() if len(t) >= 3), key=len, default=None)
        m = re.search(rf"\b{re.escape(uzun)}\b", metin) if uzun else None
    if not m:
        # Kurum yazarı künyede kısaltmayla (WHO) yazılmış olabilir: uyuşmaz yerine uyarı.
        return (UYARI if o["kurum_yazar"] else UYUSMAZ), f"ilk yazar \"{o['yazar']}\" künyede yok"
    ad = normal(o.get("ad") or "").split()

    def kendi_adi(t):
        if t in UNVAN:
            return True
        if not ad:
            return len(t) == 1
        return any(t == a or t == a[0] or (len(t) == 1 and a.startswith(t))
                   or (len(a) <= 3 and t[0] in a) for a in ad)       # "AJ" baş harfleri: "andrew", "j"

    if not all(kendi_adi(t) for t in metin[:m.start()].split()):
        return UYARI, f"ilk yazar \"{o['yazar']}\" künyede ilk sırada görünmüyor"
    return DOGRU, ""


def yil_denetle(o, parca):
    if not o["yillar"]:
        return None, "kayıtta yıl yok"
    y = kunye_yili(parca)
    if y is None:
        return UYARI, "künyede yıl bulunamadı"
    fark = min(abs(y - k) for k in o["yillar"])
    kayit = "/".join(map(str, o["yillar"]))
    if fark == 0:
        return DOGRU, ""
    if fark == 1:
        return UYARI, f"yıl {y}, kayıtta {kayit} (±1; çevrimiçi/baskı farkı olabilir)"
    return UYUSMAZ, f"yıl {y}, kayıtta {kayit}"


def baslik_orani(o, metin):
    kun, en_iyi = set(metin.split()), None
    for b in o["basliklar"]:
        b = re.sub(r"^\s*(retracted|withdrawn)\s*[:.\-]\s*", "", b, flags=re.I)
        adaylar = [b]
        ana = b.split(":")[0]
        if ana != b and len(icerik_kelimeleri(ana)) >= 3:   # alt başlığı yazılmamış künye
            adaylar.append(ana)
        for a in adaylar:
            k = icerik_kelimeleri(a)
            if k:
                oran = sum(t in kun for t in k) / len(k)
                en_iyi = oran if en_iyi is None else max(en_iyi, oran)
    return en_iyi


def dergi_denetle(o, metin):
    kun = metin.split()
    en_iyi = None
    for d in o["dergiler"]:
        k = [t for t in normal(re.sub(r"\([^)]*\)", " ", d)).split() if t not in {"of", "the", "and", "for", "in", "on"}]
        if not k:
            continue
        uyan = sum(1 for t in k if any(u == t or (len(u) >= 3 and t.startswith(u)) or (u == "j" and t == "journal")
                                       for u in kun))
        en_iyi = max(en_iyi or 0, uyan / len(k))
    if en_iyi is None:
        return "—"
    return "uyuşuyor" if en_iyi >= DERGI_ESIK else "farklı olabilir"


def degerlendir(kimlik, parca, cevap, grup):
    """grup: bu kimlikle aynı esere ait kimlikler (bolutler)."""
    tur, deger = kimlik.tur, kimlik.deger
    b = {"kimlik": f"{tur} {deger}", "durum": "", "yazar": "—", "yil": "—", "baslik": "—", "dergi": "—",
         "guncelleme": [], "aciklama": [], "kayit": ""}
    durum, ozet = cevap
    if durum == "ag":
        b["durum"] = AG
        b["aciklama"].append(ozet)
        return b
    if durum == "yok":
        b["durum"] = BULUNAMADI
        adres = f"https://doi.org/{deger}" if tur == "DOI" else f"https://pubmed.ncbi.nlm.nih.gov/{deger}/"
        nerede = "doi.org'da" if tur == "DOI" else "PubMed'de"
        b["aciklama"].append(f"{ozet}; {nerede} elle açın ({adres}); "
                             "uydurma şüphesi, kanıtı değil"
                             + (" (DataCite/mEDRA DOI'si veya yeni kayıt olabilir)" if tur == "DOI" else ""))
        return b
    metin = karsilastirma_metni(parca)
    sonuclar = []
    s, n = yazar_denetle(ozet, metin)
    b["yazar"] = s or "—"
    sonuclar.append(s)
    if n:
        b["aciklama"].append(n)
    s, n = yil_denetle(ozet, parca)
    b["yil"] = s or "—"
    sonuclar.append(s)
    if n:
        b["aciklama"].append(n)
    oran = baslik_orani(ozet, metin)
    if oran is None:
        b["baslik"] = "—"
    else:
        s = DOGRU if oran >= BASLIK_DOGRU else UYARI if oran >= BASLIK_UYARI else UYUSMAZ
        b["baslik"] = f"{s} (%{round(oran * 100)})"
        sonuclar.append(s)
        if s != DOGRU:
            b["aciklama"].append(f"başlık örtüşmesi %{round(oran * 100)}")
    b["dergi"] = dergi_denetle(ozet, metin)
    # Aynı eserde (bolutler grubu) tek DOI ve tek PMID varsa PubMed kaydının DOI'si künyedekiyle aynı olmalı.
    dois = [x.deger for x in grup if x.tur == "DOI"]
    if tur == "PMID" and ozet.get("doi") and len(dois) == 1 and sum(x.tur == "PMID" for x in grup) == 1 \
            and ozet["doi"] != dois[0]:
        sonuclar.append(UYUSMAZ)
        b["aciklama"].append(f"PMID kaydındaki DOI ({ozet['doi']}) künyedeki DOI'den farklı")
    sonuclar = [x for x in sonuclar if x]
    b["durum"] = min(sonuclar, key=SIRA.get) if sonuclar else UYARI
    if not sonuclar:
        b["aciklama"].append("kayıtta karşılaştırılacak alan yok")
    b["guncelleme"] = ozet["guncelleme"]
    baslik = (ozet["basliklar"] or [""])[0]
    b["kayit"] = " · ".join(x for x in (
        ozet["yazar"] or "", "/".join(map(str, ozet["yillar"])),
        (baslik[:90] + "…") if len(baslik) > 90 else baslik, (ozet["dergiler"] or [""])[0]) if x)
    return b


def guncelleme_yazisi(g):
    ek = ", ".join(str(x) for x in (g.get("yil"), g.get("doi")) if x)
    if g.get("kaynak") == "başlık":
        ek = "başlıkta RETRACTED"
    ek = f" ({ek})" if ek else ""
    if g["tur"] == GERI:
        if g["yon"] == "bildirim":
            return "geri çekme bildirimi (yayının kendisi değil)" + ek
        return "GERİ ÇEKİLMİŞ" + (" (ilişki yönü belirsiz; elle bakın)" if g["yon"] == "ilişki" else "") + ek
    return g["tur"] + (" bildirimi" if g["yon"] == "bildirim" and g["tur"] == "düzeltme" else "") + ek


def geri_cekilmis(k):
    """Yayının kendisi geri çekilmiş mi? Kimlik bir geri çekme bildirimine aitse (yon "bildirim")
    yayın geri çekilmiş sayılmaz; yönü belirsiz ilişki temkinle sayılır."""
    return any(g["tur"] == GERI and g["yon"] != "bildirim" for b in k.bulgular for g in b["guncelleme"])


def bildirim_mi(k):
    return any(g["tur"] == GERI and g["yon"] == "bildirim" for b in k.bulgular for g in b["guncelleme"])


def kritik(k):
    return k.durum in (BULUNAMADI, UYUSMAZ) or geri_cekilmis(k)


# ---------------------------------------------------------------- rapor

def hucre(s, uzunluk=None):
    s = str(s).replace("|", "\\|").replace("\n", " ")
    return s[:uzunluk] + "…" if uzunluk and len(s) > uzunluk else s


def yer(k, kok):
    try:
        ad = k.dosya.resolve().relative_to(kok)
    except ValueError:
        ad = k.dosya.name
    return f"{ad}:{k.satir}"


def etiket(k):
    return f"[@{k.etiket}]" if k.tur == "anahtar" else f"[^{k.etiket}]"


def rapor_metni(kunyeler, dosyalar, kapsam, cevrimdisi, istemci, onbellek, notlar):
    kok = KOK.resolve()
    z = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
    sayim = {}
    for k in kunyeler:
        sayim[k.durum] = sayim.get(k.durum, 0) + 1
    kritikler = [k for k in kunyeler if kritik(k)]
    ag = [k for k in kunyeler if k.durum == AG]
    kimliksiz = [k for k in kunyeler if k.durum == KIMLIKSIZ]
    c = [f"# Künye doğrulama — {kapsam}", "",
         f"Üretim: {z}. Bu dosya `_araclar/kunye_dogrula.py` tarafından üretilir; elle düzenlenmez.", "",
         "Girdi: " + ", ".join(f"`{d}`" for d in dosyalar) + ".",
         "Mod: " + ("**çevrimdışı** (ağa çıkılmadı; yalnız DOI/PMID çıkarımı)." if cevrimdisi else
                    f"çevrimiçi; {istemci.istek} istek (Crossref, PubMed)"
                    + (f", önbellekten {onbellek.kullanilan} yanıt" if onbellek else "")
                    + (f", önbellekte {onbellek.atilan} bozuk kayıt yok sayıldı" if onbellek and onbellek.atilan else "")
                    + "."), ""]
    c += ["## Özet", "", "| Durum | Künye |", "|---|---|"]
    for d in (DOGRU, UYARI, UYUSMAZ, BULUNAMADI, KIMLIKSIZ, AG, CEVRIMDISI):
        if sayim.get(d) or d in (DOGRU, UYARI, UYUSMAZ, BULUNAMADI, KIMLIKSIZ, AG) and not cevrimdisi:
            c.append(f"| {d} | {sayim.get(d, 0)} |")
    c.append(f"| **toplam** | {len(kunyeler)} |")
    gun = {}
    for k in kunyeler:
        for t in {g["tur"] for b in k.bulgular for g in b["guncelleme"]}:
            gun[t] = gun.get(t, 0) + 1
    c += ["", f"Yayın sonrası kayıt (künye sayısı): geri çekilmiş yayın {sum(map(geri_cekilmis, kunyeler))}, "
              f"geri çekme bildirimi (yayının kendisi değil; kritik sayılmaz) {sum(map(bildirim_mi, kunyeler))}, "
              f"endişe bildirimi {gun.get('endişe bildirimi', 0)}, düzeltme {gun.get('düzeltme', 0)}. "
              f"Kritik (Crossref/PubMed'de bulunamadı, uyuşmaz, geri çekilmiş yayın): **{len(kritikler)}**.", ""]
    c += ["## Kritik bulgular", ""]
    if not kritikler:
        c += ["Çevrimdışı çalıştırıldı; doğrulama yapılmadı." if cevrimdisi else
              f"Kritik bulgu yok; ama {len(ag)} künye ağ hatası nedeniyle doğrulanamadı." if ag else
              "Kritik bulgu yok.", ""]
    for k in kritikler:
        nedenler = ["GERİ ÇEKİLMİŞ YAYIN"] if geri_cekilmis(k) else []
        if k.durum in (BULUNAMADI, UYUSMAZ):
            nedenler.insert(0, k.durum)
        c.append(f"- **{yer(k, kok)} {etiket(k)}** — {', '.join(nedenler)}")
        c.append(f"  - Künye: {hucre(k.metin, 300)}")
        for b in k.bulgular:
            ek = "; ".join(b["aciklama"] + [guncelleme_yazisi(g) for g in b["guncelleme"]])
            c.append(f"  - {b['kimlik']}: {b['durum']}" + (f" — {ek}" if ek else ""))
            if b["kayit"]:
                c.append(f"    Kayıttaki: {hucre(b['kayit'])}")
    if kritikler:
        c.append("")
    c += ["## Bütün künyeler", "",
          "Kritikler önce, sonra dosya sırası. Yazar, yıl ve başlık sütunları birden çok kimlikte ` / ` ile ayrılır.", "",
          "| # | Yer | Etiket | Kimlik | Durum | İlk yazar | Yıl | Başlık | Dergi (bilgi) | Yayın sonrası | Açıklama |",
          "|---|---|---|---|---|---|---|---|---|---|---|"]
    sirali = sorted(enumerate(kunyeler), key=lambda x: (not kritik(x[1]), x[0]))
    for n, (_, k) in enumerate(sirali, 1):
        bs = k.bulgular

        def birlestir(alan):
            return " / ".join(b[alan] for b in bs) or "—"

        yayin = "; ".join(guncelleme_yazisi(g) for b in bs for g in b["guncelleme"]) or "—"
        if k.durum == KIMLIKSIZ:
            aciklama = "DOI/PMID yok; elle doğrulanmalı" + (" (ISBN var, kitap doğrulanmaz)" if ISBN.search(k.metin) else "")
        elif k.durum == CEVRIMDISI:
            aciklama = "sorgulanmadı (çevrimdışı)"
        else:
            aciklama = "; ".join(x for b in bs for x in b["aciklama"])
        kimlik = ", ".join(f"{x.tur} {x.deger}" for x in k.kimlikler) or "—"
        durum = (f"**GERİ ÇEKİLMİŞ** (künye {k.durum})" if geri_cekilmis(k)
                 else f"**{k.durum}**" if kritik(k) else k.durum)
        c.append(f"| {n} | {hucre(yer(k, kok))} | {hucre(etiket(k))} | {hucre(kimlik)} | "
                 f"{durum} | {hucre(birlestir('yazar'))} | "
                 f"{hucre(birlestir('yil'))} | {hucre(birlestir('baslik'))} | {hucre(birlestir('dergi'))} | "
                 f"{hucre(yayin)} | {hucre(aciklama, 300)} |")
    if not kunyeler:
        c.append("| — | — | — | — | — | — | — | — | — | — | Hiç künye bulunamadı |")
    c += ["", "## KULLANICIYA BİLDİRİLECEKLER", ""]
    bildir = []
    if not kunyeler:
        bildir.append("- **Künye bulunamadı; dosya biçimini kontrol edin.** Dosyada `- [@anahtar] …` satırı "
                      "veya `[^etiket]: …` dipnot tanımı okunamadı (kapanmamış kod çiti, farklı liste işareti "
                      "veya yanlış dosya olabilir). Doğru dosyayla ya da biçim düzeltilince yeniden çalıştırın.")
    if notlar:
        bildir.append("- **Biçim uyarısı:** " + "; ".join(notlar) + ".")
    if cevrimdisi and kunyeler:
        bildir.append(f"- **Çevrimdışı çalıştırıldı:** {sum(k.durum == CEVRIMDISI for k in kunyeler)} künyenin DOI/PMID'si "
                      "çıkarıldı ama hiçbiri sorgulanmadı. Doğrulama için `--cevrimdisi` olmadan yeniden çalıştırın "
                      "ya da kaynak denetçisi elle doğrular.")
    if kimliksiz:
        bildir.append(f"- **Kimliksiz künye ({len(kimliksiz)}):** DOI veya PMID'si olmadığı için doğrulanamadı "
                      "(kitap, Türkçe dergi, mevzuat, yargı kararı, web sayfası olabilir). Kaynak denetçisinin "
                      "bunları elle doğrulaması gerekir:")
        bildir += [f"  - {yer(k, kok)} {etiket(k)}: {hucre(k.metin, 120)}" for k in kimliksiz]
    if ag:
        hamlar = [x for k in ag for b in k.bulgular if b["durum"] == AG for x in b["aciklama"]]
        nedenler = list(dict.fromkeys(re.sub(r" \(art arda .*\)$", "", x) for x in hamlar))
        kesildi = any("art arda" in x for x in hamlar)
        bildir.append(f"- **Ağ hatası nedeniyle doğrulanamayan künye ({len(ag)}).** Neden: "
                      + "; ".join(nedenler[:3]) + (" …" if len(nedenler) > 3 else "")
                      + (f" (art arda {ARDISIK_HATA_SINIRI} hatadan sonra kalanlar sorgulanmadı)" if kesildi else "")
                      + ". İnternet bağlantısını (veya vekil sunucu/güvenlik duvarı ayarını) kontrol edip "
                        "yeniden çalıştırın ya da kaynak denetçisi bu künyeleri elle doğrular:")
        bildir += [f"  - {yer(k, kok)} {etiket(k)}" for k in ag]
    c += bildir or ["Bildirilecek sınır yok."]
    c += ["", "## Betiğin denetlemedikleri", "",
          "- Kimliksiz künyeler (DOI/PMID yok): kitap, Türkçe dergi (DergiPark/TR Dizin sorgulanmaz), mevzuat, "
          "karar, tez — kaynak denetçisi",
          "- Crossref dışındaki DOI kayıt kurumları (DataCite, mEDRA, JaLC) ve yeni kayıtlar: bunlar "
          "\"Crossref/PubMed'de bulunamadı\" görünür; bu uydurma kanıtı değildir — kaynak denetçisi doi.org üzerinden",
          "- Cilt, sayı, sayfa ve yazar listesinin tamamı; künyenin biçimi (APA, Vancouver) — kaynak denetçisi; Word aracı",
          "- Atfın cümleyi desteklemesi, kaynağın okunup okunmadığı — kaynak ve alan denetçileri",
          "- Çeviri başlıklı künyeler (kayıttaki dilden farklı başlık) \"uyuşmaz\" görünebilir — kaynak denetçisi", "",
          "## Eşikler", "",
          f"- Başlık: kayıttaki başlığın içerik kelimelerinin künyede geçme oranı; ≥%{round(BASLIK_DOGRU * 100)} "
          f"doğru, %{round(BASLIK_UYARI * 100)}–{round(BASLIK_DOGRU * 100)} uyarı, altı uyuşmaz.",
          "- İlk yazar: soyadından önce yalnız o yazarın adı, baş harfleri veya unvanı varsa doğru; önünde başka "
          "ad varsa uyarı (sıra kaymış); soyadı yoksa uyuşmaz (kurum yazarında uyarı). Türkçe karakter ve "
          "büyük/küçük harf normalize edilir.",
          "- Yıl: kayıttaki yayın, baskı veya çevrimiçi yıldan biriyle aynıysa doğru; ±1 uyarı; daha fazlası uyuşmaz.",
          f"- Dergi: kısaltma toleranslı, ≥%{round(DERGI_ESIK * 100)} kelime \"uyuşuyor\"; yalnız bilgi.", "",
          "<!-- RAPOR SONU -->", ""]
    return "\n".join(c), bildir


def ayni_dosya(a, b):
    """Çözümlenmiş yol (sembolik bağlantı dahil) ya da var olan iki dosyada aynı düğüm (sabit bağlantı)."""
    try:
        if a.resolve() == b.resolve():
            return True
        return a.exists() and b.exists() and os.path.samefile(a, b)
    except OSError:
        return False


def rapor_korumasi(yol, korunanlar):
    """Rapor yalnız girdi ve önbellek dışındaki, yeni ya da bu aracın yazdığı bir dosyaya yazılır."""
    for k in korunanlar:
        if ayni_dosya(yol, k):
            raise GirdiHatasi(f"rapor yolu bir girdi veya önbellek dosyasıyla aynı, yazılmadı: {yol} = {k}")
    if yol.is_dir():
        raise GirdiHatasi(f"rapor yolu bir klasör: {yol}")
    if yol.exists():
        try:
            with open(yol, encoding="utf-8-sig", errors="replace") as f:
                ilk = f.readline()
        except OSError as e:
            raise GirdiHatasi(f"rapor dosyası okunamadı ({yol}): {e}")
        if not ilk.startswith(RAPOR_BASI):
            raise GirdiHatasi(f"rapor yolunda bu aracın raporu olmayan bir dosya var (ilk satır "
                              f"\"{RAPOR_BASI}\" ile başlamıyor), üzerine yazılmadı: {yol}")


def hata_raporu(yol, kapsam, mesaj, korunanlar):
    """Betik çalışamadığında eski raporun geçerli sanılmaması için kısa rapor (koruma kuralı aynı)."""
    if not yol:
        return
    try:
        rapor_korumasi(yol, korunanlar)
    except GirdiHatasi:
        return
    try:
        yol.parent.mkdir(parents=True, exist_ok=True)
        z = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
        yol.write_text("\n".join([
            f"# Künye doğrulama — {kapsam}", "",
            f"Üretim: {z}. Bu dosya `_araclar/kunye_dogrula.py` tarafından üretilir; elle düzenlenmez.", "",
            f"**Betik hata verdi:** {mesaj}", "",
            "Doğrulama yapılamadı; önceki sonuç geçerli değildir. Hata giderilince betik yeniden çalıştırılır.", "",
            "<!-- RAPOR SONU -->", ""]), encoding="utf-8")
    except OSError:
        pass


def main(argv=None):
    p = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        epilog="Çıkış: 0 sorun yok; 1 kritik; 2 girdi hatası; 3 kısmi (ağ hatası, kimliksiz, çevrimdışı, künye yok).")
    p.add_argument("dosyalar", nargs="+", metavar="DOSYA.md", help="birim dosyası veya ana metin")
    p.add_argument("--rapor", help="rapor yolu (varsayılan <çıktı klasörü>/_yonetim/denetim/kunye_dogrulama_<kapsam>.md)")
    p.add_argument("--kapsam", help="rapor adındaki kapsam (varsayılan: tek dosyada dosya adı, çokta \"toplu\")")
    p.add_argument("--onbellek", metavar="DOSYA.json", help="Crossref/PubMed yanıtlarını bu dosyada sakla ve yeniden kullan")
    p.add_argument("--cevrimdisi", action="store_true", help="ağa çıkma; yalnız DOI/PMID çıkar, kimliksizleri listele")
    a = p.parse_args(argv)
    dosyalar = [pathlib.Path(d) for d in a.dosyalar]
    kapsam = re.sub(r"[^\w.-]+", "_", a.kapsam or (dosyalar[0].stem if len(dosyalar) == 1 else "toplu")) or "toplu"
    rapor = None
    korunanlar = dosyalar + ([pathlib.Path(a.onbellek)] if a.onbellek else [])
    try:
        if a.rapor:
            rapor = pathlib.Path(a.rapor)
        elif (KOK / "_yonetim").is_dir():
            rapor = KOK / "_yonetim" / "denetim" / f"kunye_dogrulama_{kapsam}.md"
        else:
            raise GirdiHatasi(f"varsayılan rapor yeri yok ({KOK / '_yonetim'} bulunamadı; betik "
                              "<çıktı klasörü>/_araclar/ altında değil). --rapor ile yol verin")
        rapor_korumasi(rapor, korunanlar)
        kunyeler, notlar = [], []
        for d in dosyalar:
            kd, nd = kunyeleri_oku(d)
            kunyeler += kd
            notlar += nd
        onbellek = Onbellek(a.onbellek) if a.onbellek and not a.cevrimdisi else None
        istemci = Istemci()
        cevaplar = {} if a.cevrimdisi else sorgula(kunyeler, istemci, onbellek)
        for k in kunyeler:
            if not k.kimlikler:
                k.durum = KIMLIKSIZ
            elif a.cevrimdisi:
                k.durum = CEVRIMDISI
            else:
                parcalar = bolutler(k)
                k.bulgular = []
                for x in k.kimlikler:
                    parca, grup = parcalar[(x.tur, x.deger)]
                    try:
                        k.bulgular.append(degerlendir(x, parca, cevaplar[(x.tur, x.deger)], grup))
                    except YANIT_HATALARI as e:      # öngörülmemiş kayıt yapısı yalnız bu kimliği etkiler
                        k.bulgular.append({"kimlik": f"{x.tur} {x.deger}", "durum": AG, "yazar": "—", "yil": "—",
                                           "baslik": "—", "dergi": "—", "guncelleme": [], "kayit": "",
                                           "aciklama": [f"kayıt karşılaştırılamadı, şema hatası ({type(e).__name__})"]})
                k.durum = min((b["durum"] for b in k.bulgular), key=SIRA.get)
        if onbellek:
            try:
                onbellek.yaz()
            except OSError as e:
                print(f"Uyarı: önbellek yazılamadı ({e})", file=sys.stderr)
        metin, bildir = rapor_metni(kunyeler, a.dosyalar, kapsam, a.cevrimdisi, istemci, onbellek, notlar)
        rapor.parent.mkdir(parents=True, exist_ok=True)
        rapor.write_text(metin, encoding="utf-8")
    except GirdiHatasi as e:
        mesaj = str(e)
    except Exception as e:  # beklenmeyen hata da eski raporu geçersiz kılar
        traceback.print_exc()
        mesaj = f"beklenmeyen hata ({type(e).__name__}: {e}); ayrıntı terminalde"
    else:
        sayim = {}
        for k in kunyeler:
            sayim[k.durum] = sayim.get(k.durum, 0) + 1
        print(f"Rapor: {rapor}")
        print("Künye: " + (", ".join(f"{d} {n}" for d, n in sayim.items()) or "0")
              + f"; geri çekilmiş {sum(geri_cekilmis(k) for k in kunyeler)}")
        print("\nKULLANICIYA BİLDİRİLECEKLER\n" + ("\n".join(bildir) or "Bildirilecek sınır yok."))
        if any(kritik(k) for k in kunyeler):
            return 1
        if not kunyeler or any(k.durum in (AG, KIMLIKSIZ, CEVRIMDISI) for k in kunyeler):
            return 3
        return 0
    print(f"HATA: {mesaj}", file=sys.stderr)
    hata_raporu(rapor, kapsam, mesaj, korunanlar)
    return 2


if __name__ == "__main__":
    sys.exit(main())
