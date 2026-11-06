#!/usr/bin/env node
/*
 * ara_surum_uret.js
 *
 * Akademik bir çalışmanın Markdown kaynaklarından (ana metin ve birim dosyaları) kurum veya dergi kılavuzuna
 * göre biçimlendirilmiş bir .docx ara sürümü üretir. Kuruma bağlı her şey (sayfa, yazı tipi, boşluklar, ön
 * kısımlar, kapak, kaynakça kategorileri, atıf sistemi) ayarlar.json içindeki "bicim" ve "kapak" alanlarından
 * gelir. Varsayılanlar Marmara Üniversitesi SBE kılavuzu örneğidir (ornek_marmara_bicim_kurallari.md).
 * Çalıştırma: uret.sh (README.md).
 *
 * Kaynak dosyalar yalnızca okunur. Metin içeriği değiştirilmez; yalnızca biçim dönüştürülür.
 *
 * Kaynaklar: Giriş ve ana metinde "## <Bölüm adı> — <başlık>" olarak birleştirilmiş bölümler ana metinden okunur.
 * Henüz birleştirilmemiş bölümler için birim dosyaları (bolumler/B3a_…md vb.) kullanılır. Birleştirilmiş bir bölümün
 * birim dosyaları metne alınmaz; yalnızca devir notu yoklaması ve ana metinle tutarlılık denetimi için okunur.
 *
 * Komut satırı:
 *   node ara_surum_uret.js [--tarih YYYY-AA-GG] [--taslak-notu "..."] [--cikti /yol/dosya.docx] [--ayar dosya.json]
 * Çıktılar:
 *   <cikti>.docx, <kayit_klasoru>/<ad>_rapor.txt, <kayit_klasoru>/<ad>_beklenen.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

let D;
try {
  D = require('docx');
} catch (e) {
  console.error('HATA: "docx" paketi bulunamadı. Aracı uret.sh ile çalıştırın (README.md).');
  process.exit(2);
}
const {
  Document, Packer, Paragraph, TextRun, FootnoteReferenceRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TableOfContents, Footer,
  PageNumber, NumberFormat, LevelFormat, Bookmark, ImportedXmlComponent, LineRuleType,
  TabStopType, TableLayoutType, VerticalAlign,
} = D;

// ---------------------------------------------------------------- ayarlar
const ARACLAR = __dirname;
const ARGS = parseArgs(process.argv.slice(2));
const AYAR_YOLU = ARGS.ayar ? path.resolve(ARGS.ayar) : path.join(ARACLAR, 'ayarlar.json');
if (!fs.existsSync(AYAR_YOLU)) {
  console.error(`HATA: ${AYAR_YOLU} yok. ayarlar.ornek_*.json dosyalarından birini ayarlar.json adıyla kopyalayıp kurum kılavuzuna göre düzenleyin (README.md).`);
  process.exit(2);
}
const AYAR = jsonOku(AYAR_YOLU, 'Ayar dosyası');
for (const k of ['ana_metin', 'birim_klasoru', 'cikti_klasoru', 'cikti_adi', 'kayit_klasoru']) {
  if (typeof AYAR[k] !== 'string' || !AYAR[k].trim()) fail(`${AYAR_YOLU}: zorunlu "${k}" alanı eksik veya metin değil.`);
}
if (!Array.isArray(AYAR.bolumler)) fail(`${AYAR_YOLU}: zorunlu "bolumler" alanı eksik veya liste değil.`);
AYAR.bolumler.forEach((b, i) => {
  const yer = `${AYAR_YOLU}: bolumler[${i}]`;
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail(`${yer} bir nesne olmalı.`);
  for (const k of ['plan_adi', 'baslik']) if (typeof b[k] !== 'string' || !b[k].trim()) fail(`${yer}: "${k}" alanı eksik veya metin değil.`);
  if (!Array.isArray(b.birimler)) fail(`${yer}: "birimler" alanı eksik veya liste değil.`);
  b.birimler.forEach((u, j) => { if (!u || typeof u.kod !== 'string' || typeof u.kisimlar !== 'string') fail(`${yer}.birimler[${j}]: "kod" ve "kisimlar" metin olmalı.`); });
});
if (AYAR.bicim !== undefined && (!AYAR.bicim || typeof AYAR.bicim !== 'object' || Array.isArray(AYAR.bicim))) fail(`${AYAR_YOLU}: "bicim" alanı bir nesne olmalı.`);
// Yollar proje köküne göredir; kök varsayılan olarak _araclar'ın iki üstüdür (<kök>/<çıktı klasörü>/_araclar).
const KOK = path.resolve(ARACLAR, AYAR.proje_koku || path.join('..', '..'));
const TARIH = ARGS.tarih || AYAR.tarih;
if (!gercekTarih(TARIH)) fail(`Geçersiz tarih: ${TARIH} (YYYY-AA-GG biçiminde gerçek bir tarih bekleniyor; --tarih ile ya da ayarlar.json "tarih" alanında verin)`);
const CIKTI_ADI = AYAR.cikti_adi.replace('{tarih}', TARIH);
const CIKTI_DOCX = ARGS.cikti ? path.resolve(ARGS.cikti) : path.join(KOK, AYAR.cikti_klasoru, CIKTI_ADI + '.docx');
const KAYIT_DIR = path.join(KOK, AYAR.kayit_klasoru);

// ---------------------------------------------------------------- biçim (twip = 1/20 nk; yarım punto = sz)
// Varsayılanlar Marmara SBE örneğidir. ayarlar.json "bicim" alanı bunların üzerine yazar.
const RAPOR_ONCE = [];
const VARSAYILAN_BICIM = {
  sayfa_cm: { genislik: 21.0, yukseklik: 29.7 },
  kenar_cm: { ust: 2.5, alt: 2.5, sol: 2.5, sag: 2.5, ustbilgi: 1.5, altbilgi: 1.5 },
  yazi_tipi: 'Times New Roman',
  dil: 'tr-TR',
  metin: { punto: 11, satir_carpani: 1.6, once_nk: 6, sonra_nk: 6, girinti_cm: 1.25, iki_yana: true },
  dipnot: { punto: 9, satir_nk: 12, iki_yana: true },
  bolum_basligi: { punto: 12, once_nk: 30, sonra_nk: 30, yeni_sayfa: true, buyuk_harf: true },
  alt_baslik: { punto: 12, once_nk: 15, sonra_nk: 1.5 },
  sayfa_numarasi_punto: 10,
  tablo_punto: 10,
  baslik_numaralandirma: 'hukuk',            // "hukuk" (I. / A. / 1.), "ondalik" (1. / 1.1. / 1.1.1.), "serbest"
  kapaklar: true,                             // dış ve iç kapak
  on_kisim: ['ozet', 'abstract', 'onsoz', 'icindekiler', 'kisaltmalar', 'okuma_notu'],
  on_kisim_basliklari: { ozet: 'ÖZET', abstract: 'ABSTRACT', onsoz: 'ÖNSÖZ', icindekiler: 'İÇİNDEKİLER', kisaltmalar: 'KISALTMALAR', okuma_notu: 'OKUMA NOTU', kaynakca: 'KAYNAKÇA' },
  ozet_kelime_siniri: 250,
  ozet_metin_basinda: false,                 // true: Özet/Abstract kapaksız düzende başlığın altına, Giriş'ten önce
  ozet_dilleri: ['tr', 'en'],                 // basılacak özetler: "tr" (Özet), "en" (Abstract)
  oz_dosyasi: 'Oz_abstract.md',               // birim klasöründe; "## Özet", "## Anahtar Kelimeler", "## Abstract", "## Keywords"
  calisma_notlari: true,                      // false: birim sonu "Kaynak kontrolü" ve "Araştırma notu" basılmaz (teslim sürümü)
  ana_metin_bolumleri: { giris: 'Giriş', icindekiler: 'İçindekiler', kisaltmalar: 'Kısaltmalar', kaynakca: 'Kaynakça', atla: ['İlerleme tablosu'] },
  durum_tarihi_etiketi: 'Durum tarihi',       // ana metin başındaki "**<etiket>:** …" satırı okuma notuna alınır
  kaynakca_kategorileri: ['Mevzuat', 'Yargı kararları', 'Kitaplar, tezler ve makaleler', 'Diğer belgeler'],
  kaynakca_siralama: 'alfabetik',             // "alfabetik" veya "atif_sirasi" (numaralı atıfta her zaman atıf sırası)
  // tur: "dipnot" | "numarali" | "yazar_tarih". ve, vd, yil_yok yalnız yazar–tarihte; verilmezse belge diline göre
  // (en: "&", "et al.", "n.d."; diğer: "ve", "vd.", "t.y.").
  atif: { tur: 'dipnot', numara_bicimi: '[{n}]', kaynakca_numara_bicimi: '{n}. ' },
};
function birlestirAyar(v, a) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return a === undefined ? v : a;
  const o = { ...v };
  for (const k of Object.keys(a)) o[k] = (v && typeof v[k] === 'object' && !Array.isArray(v[k]) && v[k] !== null) ? birlestirAyar(v[k], a[k]) : a[k];
  return o;
}
const BICIM = birlestirAyar(VARSAYILAN_BICIM, AYAR.bicim || {});
for (const y of ['sayfa_cm.genislik', 'sayfa_cm.yukseklik', 'kenar_cm.ust', 'kenar_cm.alt', 'kenar_cm.sol', 'kenar_cm.sag', 'kenar_cm.ustbilgi', 'kenar_cm.altbilgi',
  'metin.punto', 'metin.satir_carpani', 'metin.once_nk', 'metin.sonra_nk', 'metin.girinti_cm', 'dipnot.punto', 'dipnot.satir_nk',
  'bolum_basligi.punto', 'bolum_basligi.once_nk', 'bolum_basligi.sonra_nk', 'alt_baslik.punto', 'alt_baslik.once_nk', 'alt_baslik.sonra_nk',
  'sayfa_numarasi_punto', 'tablo_punto', 'ozet_kelime_siniri']) {
  const v = y.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), BICIM);
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${AYAR_YOLU}: "bicim.${y}" sayı olmalı (şu an: ${JSON.stringify(v)}).`);
}
for (const y of ['on_kisim', 'kaynakca_kategorileri', 'ozet_dilleri']) if (!Array.isArray(BICIM[y])) fail(`${AYAR_YOLU}: "bicim.${y}" liste olmalı.`);
if (!BICIM.atif || typeof BICIM.atif !== 'object') fail(`${AYAR_YOLU}: "bicim.atif" bir nesne olmalı.`);
const ATIF_TURLERI = ['dipnot', 'numarali', 'yazar_tarih'];
if (!ATIF_TURLERI.includes(BICIM.atif.tur)) fail(`${AYAR_YOLU}: bilinmeyen atıf türü "bicim.atif.tur": ${JSON.stringify(BICIM.atif.tur)} (geçerli: ${ATIF_TURLERI.join(', ')}).`);
AYAR.kapak = AYAR.kapak || {};
// Belge dili: İngilizce belgede taslak notundaki tarih, özet yer tutucuları ve yazar–tarih bağlaçları İngilizcedir.
const ING = /^en/i.test(String(BICIM.dil));
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TARIH_METIN = (() => {
  const [y, m, d] = TARIH.split('-').map(Number);
  const bicimle = (dil) => new Intl.DateTimeFormat(dil, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  if (ING) { try { return bicimle(BICIM.dil); } catch (e) { return bicimle('en-US'); } }
  return `${d} ${AYLAR[m - 1]} ${y}`;
})();
const TASLAK_NOTU = String(ARGS['taslak-notu'] || AYAR.taslak_notu || (ING ? 'DRAFT ({tarih_metin})' : 'TASLAK ({tarih_metin})')).replace('{tarih_metin}', TARIH_METIN);
if (AYAR._durum) RAPOR_ONCE.push(`Ayar durumu: ${AYAR._durum} (biçim kuralları kurum veya dergi kılavuzunun resmî metninden doğrulanmadıysa çıktı geçicidir).`);
// Eski ayar adı geriye uyumluluk için okunur.
if (AYAR.kisaltmalar_icindekilerden_once && !(AYAR.bicim && AYAR.bicim.on_kisim)) {
  BICIM.on_kisim = ['ozet', 'abstract', 'onsoz', 'kisaltmalar', 'icindekiler', 'okuma_notu'];
}
const CM = (x) => Math.round(x * 566.929);
const NK = (x) => Math.round(x * 20);
const SZ = (p) => Math.round(p * 2);
const K = BICIM.kenar_cm;
const SAYFA = {
  size: { width: CM(BICIM.sayfa_cm.genislik), height: CM(BICIM.sayfa_cm.yukseklik) },
  margin: { top: CM(K.ust), bottom: CM(K.alt), left: CM(K.sol), right: CM(K.sag), header: CM(K.ustbilgi), footer: CM(K.altbilgi) },
};
const METIN_GENISLIGI = SAYFA.size.width - SAYFA.margin.left - SAYFA.margin.right;
const FONT = BICIM.yazi_tipi;
const GIRINTI = CM(BICIM.metin.girinti_cm);
const NUMARALI = BICIM.atif.tur === 'numarali';
const YAZAR_TARIH = BICIM.atif.tur === 'yazar_tarih';
const ANAHTARLI_ATIF = NUMARALI || YAZAR_TARIH; // metinde [@anahtar], kaynakçada "- [@anahtar] Künye"
const ATIF_ADI = NUMARALI ? 'Numaralı atıf' : 'Yazar–tarih atıf';
const ATIF_VE = BICIM.atif.ve || (ING ? '&' : 've');
const ATIF_VD = BICIM.atif.vd || (ING ? 'et al.' : 'vd.');
const ATIF_YIL_YOK = BICIM.atif.yil_yok || (ING ? 'n.d.' : 't.y.');
// Stil ayarları (yazar–tarih): "et al." eşiği, yazar–yıl ayracı (APA ", ", Chicago " "), çoklu atıf ayracı.
const ATIF_VD_ESIGI = BICIM.atif.vd_esigi === undefined ? 3 : BICIM.atif.vd_esigi;
const ATIF_YY_AYRAC = BICIM.atif.yazar_yil_ayraci === undefined ? ', ' : BICIM.atif.yazar_yil_ayraci;
const ATIF_COKLU_AYRAC = BICIM.atif.coklu_ayrac === undefined ? '; ' : BICIM.atif.coklu_ayrac;
if (!Number.isInteger(ATIF_VD_ESIGI) || ATIF_VD_ESIGI < 2) fail(`${AYAR_YOLU}: "bicim.atif.vd_esigi" 2 veya daha büyük bir tam sayı olmalı (şu an: ${JSON.stringify(ATIF_VD_ESIGI)}).`);
for (const [ad, v] of [['ve', ATIF_VE], ['vd', ATIF_VD], ['yil_yok', ATIF_YIL_YOK], ['yazar_yil_ayraci', ATIF_YY_AYRAC], ['coklu_ayrac', ATIF_COKLU_AYRAC]]) {
  if (typeof v !== 'string') fail(`${AYAR_YOLU}: "bicim.atif.${ad}" metin olmalı (şu an: ${JSON.stringify(v)}).`);
}
const OB = BICIM.on_kisim_basliklari;
const AMB = BICIM.ana_metin_bolumleri;

// ---------------------------------------------------------------- rapor
const UYARILAR = [];
const UYARI_KUMESI = new Set();
const RAPOR = [...RAPOR_ONCE];
/** Uyarıyı kaydeder; aynı ileti bir kez yazılır. */
function warn(msg) { if (UYARI_KUMESI.has(msg)) return; UYARI_KUMESI.add(msg); UYARILAR.push(msg); }
function fail(msg) { console.error('HATA: ' + msg); process.exit(1); }

// ---------------------------------------------------------------- yardımcılar
function parseArgs(a) {
  const DEGERLI_BAYRAKLAR = ['tarih', 'taslak-notu', 'cikti', 'ayar'];
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) fail(`Beklenmeyen argüman: ${a[i]}`);
    const ad = a[i].slice(2);
    if (!DEGERLI_BAYRAKLAR.includes(ad)) fail(`Bilinmeyen seçenek: ${a[i]} (geçerli: ${DEGERLI_BAYRAKLAR.map((x) => '--' + x).join(', ')})`);
    if (a[i + 1] === undefined || a[i + 1].startsWith('--')) fail(`${a[i]} bir değer bekliyor.`);
    o[ad] = a[i + 1]; i++;
  }
  return o;
}
/** "YYYY-AA-GG" biçiminde ve takvimde var olan bir tarih mi? (2026-02-30 ve 2026-13-45 reddedilir) */
function gercekTarih(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return false;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3];
}
/** Markdown veya metin dosyası: UTF-8 BOM silinir, satır sonları LF yapılır. Bütün Markdown okumaları buradan geçer. */
function mdOku(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}
/** JSON dosyası: okunamaz, bozuk veya üst düzeyi nesne değilse Türkçe hata verip çıkar. */
function jsonOku(p, ad) {
  let v;
  try { v = JSON.parse(mdOku(p)); } catch (e) { fail(`${ad} okunamadı (${p}): ${e.message}`); }
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${ad} (${p}) bir JSON nesnesi ({…}) olmalı.`);
  return v;
}
const TR = 'tr-TR';
const upper = (s) => s.toLocaleUpperCase(TR);
const lower = (s) => s.toLocaleLowerCase(TR);
const KUCUK_KALAN = new Set(['ve', 'veya', 'ile', 'ya', 'da', 'de', 'ki']);
/** Başlık harfi: her ana kelimenin ilk harfi büyük (TDK: ve, ile, ya, veya, da, de, ki küçük kalır). */
function baslikHarfi(s) {
  let ilk = true;
  return s.split(/(\s+)/).map((w) => {
    if (/^\s*$/.test(w)) return w;
    const m = w.match(/^([("“'‘\[]*)(.*)$/);
    const pre = m[1]; const core = m[2];
    const sonuc = (!ilk && KUCUK_KALAN.has(lower(core).replace(/[.,;:)]+$/, ''))) ? w
      : (/^[a-zçğıöşü]/.test(core) ? pre + upper(core[0]) + core.slice(1) : w);
    ilk = false;
    return sonuc;
  }).join('');
}
function readLines(p) {
  return mdOku(p).replace(/<!--[\s\S]*?-->/g, '').split('\n');
}
const romanToInt = (r) => {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 }; let n = 0;
  for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; n += a < b ? -a : a; }
  return n;
};
const intToRoman = (n) => {
  const t = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
};
function romanRange(r) {
  const [a, b] = r.split(/[–-]/).map((x) => x.trim());
  const out = []; for (let i = romanToInt(a); i <= romanToInt(b || a); i++) out.push(intToRoman(i));
  return out;
}

// ---------------------------------------------------------------- Markdown: satır içi
const TOKEN_RE = /(\*\*|\*|`[^`\n]+`|<https?:\/\/[^>\s]+>|\[\^[^\]\s]+\]|\[-?@[^\]\n]+\])/g;
/**
 * Atıf işaretini parçalar: "[@a]", "[@a; @b]", "[@a, s. 12]" (virgülden sonrası yer bilgisi), "[-@a]" (yalnız yıl).
 * Her parça {anahtar, yer, yilYalniz}; çözülemeyen parça anahtar olarak ham metniyle döner (eksik anahtar sayılır).
 */
function atifParcala(ham) {
  return ham.slice(1, -1).split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
    const m = x.match(/^(-?)@([^\s,;\]]+)\s*(?:,\s*(.*))?$/);
    if (!m) return { anahtar: x, yer: '', yilYalniz: false, erisim: [] };
    // Erişim etiketi ("tam metin", "özet"…) yer bilgisi değildir: düşürülür, kalan yer bilgisi korunur (runs() bildirir).
    const yerler = (m[3] || '').split(',').map((y) => y.trim()).filter(Boolean);
    const erisim = yerler.filter(erisimEtiketiMi);
    return { anahtar: m[2], yer: erisim.length ? yerler.filter((y) => !erisimEtiketiMi(y)).join(', ') : (m[3] || '').trim(), yilYalniz: m[1] === '-', erisim };
  });
}
// Kaynağa erişim etiketleri: anahtarlı atıfta kaynakça girdisinin sonunda durur ("- [@a] Künye. [tam metin]"), çıktıya girmez.
const ERISIM_ETIKETLERI = ['tam metin', 'ozet', 'bibliyografik', 'ikincil aktarim', 'full text', 'abstract', 'bibliographic', 'secondary'];
const asciiKucuk = (x) => String(x).toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]).replace(/\s+/g, ' ').trim();
/** "özet", "Özet.", "*[Full text]*" içindeki "Full text" gibi: baştaki/sondaki italik işareti ve noktalama yok sayılır. */
function erisimEtiketiMi(x) { return ERISIM_ETIKETLERI.includes(asciiKucuk(x).replace(/^[*_\s]+|[*_\s.;,:]+$/g, '')); }
const ERISIM_METIN = []; // gövdeden silinen tek başına erişim etiketleri (bildirim için örnekler)
/**
 * Anahtarlı atıfta gövdede tek başına duran erişim etiketini ("[@a] [tam metin]", "*[özet]*") önündeki boşlukla birlikte
 * (kaçışlı "\[tam metin\]" dahil) siler; etiket kaynakça girdisinin sonunda durmalıdır. Markdown bağlantısına ("[Özet](#x)")
 * dokunulmaz.
 */
function erisimSil(text, ns) {
  return text.replace(/\s*(\*{1,2}|_)?\\?\[([^[\]\n]{1,40})\]\1(?!\()/g, (m0, sar, ic, i, tum) => {
    if (!erisimEtiketiMi(ic.replace(/\\$/, ''))) return m0;
    ERISIM_METIN.push(`${ns}: …${tum.slice(Math.max(0, i - 35), i).replace(/\s+/g, ' ')}${/^\s/.test(m0) ? ' ' : ''}${m0.trim()}`);
    return '';
  });
}
/** Satır içi Markdown'ı biçimli parçalara ayırır: {text,b,i}, {fn:etiket} veya {cite:[parçalar], ham}. */
function tokenize(s, yer) {
  const ESC = '\u0000';
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, (m, c) => ESC + c.charCodeAt(0) + ESC);
  const restore = (x) => x.replace(/\u0000(\d+)\u0000/g, (m, c) => String.fromCharCode(Number(c)));
  const parts = []; let last = 0; let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s))) {
    if (m.index > last) parts.push({ k: 't', v: s.slice(last, m.index) });
    parts.push({ k: 'm', v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ k: 't', v: s.slice(last) });
  for (const mk of ['**', '*']) {
    const idx = parts.map((p, i) => (p.k === 'm' && p.v === mk ? i : -1)).filter((i) => i >= 0);
    if (idx.length % 2 === 1) {
      parts[idx[idx.length - 1]].k = 't';
      warn(`Eşlenmemiş "${mk}" işareti düz metin bırakıldı (${yer}): …${s.slice(0, 80)}…`);
    }
  }
  let b = false; let it = false; const out = [];
  for (const p of parts) {
    if (p.k === 't') { out.push({ text: restore(p.v), b, i: it }); continue; }
    const v = p.v;
    if (v === '**') { b = !b; continue; }
    if (v === '*') { it = !it; continue; }
    if (v[0] === '`') { out.push({ text: restore(v.slice(1, -1)), b, i: it }); continue; }
    if (v[0] === '<') { out.push({ text: v.slice(1, -1), b, i: it, url: true }); continue; }
    if (v.startsWith('[^')) { out.push({ fn: v.slice(2, -1) }); continue; }
    if (v.startsWith('[@') || v.startsWith('[-@')) { out.push({ cite: atifParcala(v), ham: v }); continue; }
  }
  return out;
}
/** Markdown işaretlerini ayıklanmış düz metin (karşılaştırma ve doğrulama için). */
function plain(s) {
  return tokenize(s, 'düz').map((t) => (t.fn !== undefined || t.cite ? '' : t.text)).join('').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- Markdown: bloklar
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
function extractDefs(lines, ns) {
  const defs = new Map(); const rest = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\[\^([^\]\s]+)\]:\s?(.*)$/);
    if (!m) { rest.push(lines[i]); continue; }
    let text = m[2];
    while (i + 1 < lines.length && /^( {4}|\t)\S/.test(lines[i + 1])) { text += ' ' + lines[i + 1].trim(); i++; }
    const key = ns + ':' + m[1];
    if (defs.has(key)) warn(`${ns}: [^${m[1]}] iki kez tanımlanmış; ilk tanım kullanıldı.`);
    else defs.set(key, text.trim());
  }
  return { defs, rest };
}
function parseTable(rows) {
  const cells = (r) => {
    let s = r.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split(/(?<!\\)\|/).map((c) => c.trim());
  };
  const all = rows.map(cells);
  if (all.length >= 2 && all[1].every((c) => /^:?-{2,}:?$/.test(c))) return { k: 'table', header: all[0], rows: all.slice(2) };
  return { k: 'table', header: null, rows: all };
}
function parseBlocks(lines) {
  const blocks = []; let i = 0;
  const isBreak = (l) => /^\s*$/.test(l) || /^#{1,6}\s/.test(l) || /^\s*[|>]/.test(l) || LIST_RE.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
  while (i < lines.length) {
    const l = lines[i]; let m;
    if (/^\s*$/.test(l)) { i++; continue; }
    if ((m = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) { blocks.push({ k: 'h', md: m[1].length, text: m[2] }); i++; continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { i++; continue; }
    if (/^\s*\|/.test(l)) {
      const rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      blocks.push(parseTable(rows)); continue;
    }
    if (/^\s*>/.test(l)) {
      const raw = []; while (i < lines.length && /^\s*>/.test(lines[i])) raw.push(lines[i++].replace(/^\s*>\s?/, ''));
      const paras = []; let cur = [];
      for (const r of raw) { if (/^\s*$/.test(r)) { if (cur.length) paras.push(cur.join(' ')); cur = []; } else cur.push(r.trim()); }
      if (cur.length) paras.push(cur.join(' '));
      blocks.push({ k: 'quote', paras }); continue;
    }
    if (LIST_RE.test(l)) {
      const items = [];
      while (i < lines.length) {
        const mm = lines[i].match(LIST_RE);
        if (mm) { items.push({ indent: mm[1].replace(/\t/g, '    ').length, marker: mm[2], text: mm[3].trim() }); i++; continue; }
        if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue; }
        if (/^\s*$/.test(lines[i]) && i + 1 < lines.length && LIST_RE.test(lines[i + 1])) { i++; continue; }
        break;
      }
      const base = Math.min(...items.map((x) => x.indent));
      for (const it of items) it.level = it.indent - base >= 2 ? 1 : 0;
      blocks.push({ k: 'list', items }); continue;
    }
    const buf = [l.trim()]; i++;
    while (i < lines.length && !isBreak(lines[i])) buf.push(lines[i++].trim());
    blocks.push({ k: 'p', text: buf.join(' ') });
  }
  return blocks;
}
/** Satırları "##" (düzey) başlıklarına göre böler. */
function splitByHeading(lines, level) {
  const re = new RegExp('^' + '#'.repeat(level) + '\\s+(.*?)\\s*$');
  const out = [{ title: null, lines: [] }];
  for (const l of lines) {
    const m = l.match(re);
    if (m) out.push({ title: m[1], lines: [] }); else out[out.length - 1].lines.push(l);
  }
  return out;
}

// ---------------------------------------------------------------- kaynakları oku
const KATEGORILER = BICIM.kaynakca_kategorileri || [];
const ALL_DEFS = new Map();
const KAYNAK_SAYIM = {}; // ns -> {tanim, ...}

function parseBib(blocks, kaynak) {
  const out = []; let cat = null;
  for (const b of blocks) {
    if (b.k === 'h') { cat = b.text.trim(); continue; }
    if (b.k === 'list') for (const it of b.items) {
      // Anahtarlı atıfta girdi "[@anahtar] Künye" biçimindedir; yazar–tarihte isteğe bağlı elle etiket: "[@a] {WHO, 2020} Künye".
      const m = it.text.match(/^\[@([^\]\s;]+)\]\s*(.*)$/);
      const el = m && m[2].match(/^\{([^{}]+)\}\s*(.*)$/);
      if (el) out.push({ kaynak, cat: cat || '(kategorisiz)', text: el[2], anahtar: m[1], etiket: el[1].trim() });
      else if (m) out.push({ kaynak, cat: cat || '(kategorisiz)', text: m[2], anahtar: m[1] });
      else out.push({ kaynak, cat: cat || '(kategorisiz)', text: it.text });
    }
    else if (b.k === 'p' && /^\*\*[^*]+\*\*$/.test(b.text.trim())) RAPOR.push(`${kaynak} kaynakçasındaki ara etiket "${plain(b.text)}" alınmadı (birleşik kaynakça yeniden sıralanır).`);
    else if (b.k === 'p' || b.k === 'quote' || b.k === 'table') warn(`${kaynak} kaynakçasında liste dışı blok atlandı: ${(b.text || '').slice(0, 60)}`);
  }
  return out;
}

// --- ana metin
const anaYol = path.join(KOK, AYAR.ana_metin);
if (!fs.existsSync(anaYol)) fail('Ana metin bulunamadı: ' + anaYol);
const anaSatirlar = readLines(anaYol);
const anaDefs = extractDefs(anaSatirlar, 'G');
for (const [k, v] of anaDefs.defs) ALL_DEFS.set(k, v);
// bolumler: ana metinde birleştirilmiş bölümler (plan_adi → {baslik, bloklar, satirlar}). Bir bölüm ana metinde
// "## <plan_adi> — <başlık>" olarak varsa metni oradan alınır; birim dosyaları yalnızca birleştirilmemiş bölümler için okunur.
const ANA = { baslik: null, altBaslik: null, nitelik: null, durumTarihi: null, okumaNotu: [], kisaltmalar: null, plan: [], giris: [], girisSatirlari: [], bib: [], bolumler: new Map() };
{
  const ust = anaDefs.rest;
  const h1 = ust.findIndex((l) => /^#\s+/.test(l));
  if (h1 < 0) fail('Ana metinde "# " başlığı yok.');
  ANA.baslik = ust[h1].replace(/^#\s+/, '').trim();
  const bolum = splitByHeading(ust.slice(h1 + 1), 2);
  const etiket = BICIM.durum_tarihi_etiketi;
  const kacir = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tarihRe = new RegExp('\\*\\*' + kacir(etiket) + ':\\*\\*\\s*([^*]+?)(\\s+\\*\\*|$)');
  const bas = (t, ad) => t.startsWith(lower(ad));
  let ilk = true;
  for (const s of bolum) {
    if (s.title === null) continue;
    const t = lower(s.title);
    if (ilk && !bas(t, AMB.giris) && !bas(t, AMB.icindekiler)) {
      ilk = false; ANA.altBaslik = s.title.trim();
      for (const b of parseBlocks(s.lines)) {
        if (b.k === 'p' && /^\*[^*].*\*$/.test(b.text)) ANA.nitelik = plain(b.text);
        else if (b.k === 'p' && b.text.includes(etiket)) {
          const m = b.text.match(tarihRe); if (m) ANA.durumTarihi = m[1].trim();
        } else if (b.k === 'quote') ANA.okumaNotu.push(...b.paras);
      }
      continue;
    }
    ilk = false;
    if ((AMB.atla || []).some((a) => bas(t, a))) { RAPOR.push(`Ana metindeki "${s.title}" kısmı ara sürüme alınmadı (çalışma takibi; taslak notu yerine geçer).`); continue; }
    if (bas(t, AMB.icindekiler)) { ANA.plan = parsePlan(s.lines); continue; }
    if (bas(t, AMB.kisaltmalar)) { const tb = parseBlocks(s.lines).find((b) => b.k === 'table'); ANA.kisaltmalar = tb; continue; }
    if (bas(t, AMB.giris)) { ANA.giris = parseBlocks(s.lines); ANA.girisSatirlari = s.lines; continue; }
    if (bas(t, AMB.kaynakca)) { ANA.bib = parseBib(parseBlocks(s.lines), 'G'); continue; }
    // Ana metinde birleştirilmiş bölüm: "## Birinci Bölüm — Kavramsal ve Tarihsel Temeller"
    const plan = AYAR.bolumler.find((b) => t === lower(b.plan_adi) || t.startsWith(lower(b.plan_adi) + ' ') || t.startsWith(lower(b.plan_adi) + '—'));
    if (plan) {
      if (ANA.bolumler.has(plan.plan_adi)) { warn(`Ana metinde "${plan.plan_adi}" iki kez var; ilki kullanıldı.`); continue; }
      const altB = s.title.replace(/^[^—–-]*[—–-]\s*/, '').trim();
      if (altB && lower(altB) !== lower(plan.baslik)) warn(`Ana metindeki "${s.title}" başlığı ayarlardaki "${plan.baslik}" başlığından farklı; ayarlardaki başlık kullanıldı.`);
      const bloklar = parseBlocks(s.lines);
      for (const b of bloklar) if (b.k === 'h' && b.md < 3) warn(`${plan.plan_adi}: ana metinde "${'#'.repeat(b.md)} ${b.text}" başlığı var (bölüm içi başlıklar ### ile başlamalı).`);
      ANA.bolumler.set(plan.plan_adi, { baslik: s.title, bloklar, satirlar: s.lines });
      continue;
    }
    warn(`Ana metinde tanınmayan "## ${s.title}" bölümü ara sürüme alınmadı.`);
  }
  if (!ANA.giris.length) fail(`Ana metinde "## ${AMB.giris}" bölümü bulunamadı.`);
  KAYNAK_SAYIM.G = { dosya: AYAR.ana_metin, tanim: anaDefs.defs.size };
  // Dipnot tanımlarının etiket önekine göre dağılımı (rapor için): [^1], [^g-1] → Giriş; [^b1a-1] → b1a …
  const dagilim = {};
  for (const k of anaDefs.defs.keys()) { const et = k.split(':')[1]; const m = et.match(/^([a-z]+\d*[a-z]?)-/); const p = m && m[1] !== 'g' ? m[1] : 'Giriş'; dagilim[p] = (dagilim[p] || 0) + 1; }
  KAYNAK_SAYIM.G.dagilim = dagilim;
}
function parsePlan(lines) {
  const chapters = []; let cur = null;
  for (const l of lines) {
    let m;
    if ((m = l.match(/^\*\*(.+?)\*\*/))) { cur = { title: m[1].trim(), items: [] }; chapters.push(cur); continue; }
    if (cur && (m = l.match(/^- ([IVXLC]+)\.\s+(.*)$/))) cur.items.push({ roman: m[1], title: m[2].trim() });
  }
  return chapters;
}

// --- birimler
const birimKlasoru = path.join(KOK, AYAR.birim_klasoru);
const birimDosyalari = fs.existsSync(birimKlasoru) ? fs.readdirSync(birimKlasoru).filter((f) => f.endsWith('.md')) : [];
// Birim sonu kısımları. Devir notu başlığı "Orkestratöre" önekiyle ya da yalın ("### Devir notu (B1a)") olabilir.
const OZEL_RE = /^###\s+(Birim kaynakçası|Kaynak kontrolü|Araştırma notu|(?:Orkestratöre\s+)?devir notu)(?=\s|\(|$)(.*)$/i;
const DEVIR_BASLA_RE = /^#{3,4}\s+((?:Orkestratöre\s+)?devir notu|Yoğunlaştırma notu)(?=\s|\(|$)/i;
function birimDosyasi(kod) {
  const adaylar = birimDosyalari.filter((f) => f.startsWith(kod + '_'));
  if (!adaylar.length) return null;
  if (adaylar.length > 1) warn(`${kod} için birden çok dosya var (${adaylar.join(', ')}); ilki kullanıldı.`);
  return adaylar.sort()[0];
}
/**
 * Ana metinde birleştirilmiş bir bölümün (veya Giriş'in) birim dosyası: metne alınmaz. Yalnızca (1) devir notu,
 * yoğunlaştırma notu ve denetim cevaplarının çıktıya sızmadığını yoklamak ve (2) birim dosyası birleştirmeden sonra
 * değişmiş mi diye bakmak için okunur.
 */
function birimYoklama(kod, anaHam) {
  const dosya = birimDosyasi(kod);
  if (!dosya) return null;
  const lines = readLines(path.join(birimKlasoru, dosya));
  const d = lines.findIndex((l) => DEVIR_BASLA_RE.test(l));
  const devir = d < 0 ? [] : lines.slice(d).filter((l) => !/^\[\^[^\]]+\]:/.test(l));
  // tutarlılık: birimin metni ve dipnot tanımları ana metinde aynen var mı?
  const son = lines.findIndex((l) => /^###\s+(Birim kaynakçası|Giriş bölümü için kaynak kontrolü)/i.test(l));
  const metin = (son < 0 ? lines : lines.slice(0, son));
  const govde = metin.filter((l) => !/^\[\^[^\]]+\]:/.test(l)).join('\n').trim();
  const tanimlar = lines.filter((l) => /^\[\^[^\]]+\]:/.test(l));
  const farkliTanim = tanimlar.filter((l) => !anaHam.includes(l)).length;
  // Birleştirmeden sonra ana metinde yapılan düzeltmeler (ör. bütünlük denetimi) de bu farkı doğurur; bu nedenle uyarı değil, nottur.
  if (govde && !anaHam.includes(govde)) RAPOR.push(`${kod}: birim dosyasının metni (${dosya}) ana metindekinden farklı; ana metin kullanıldı. Fark birleştirme sonrası ana metin düzeltmelerinden değil de birim revizyonundan doğuyorsa bölümü yeniden birleştirin.`);
  if (farkliTanim) RAPOR.push(`${kod}: birim dosyasındaki ${farkliTanim} dipnot tanımı ana metinde aynen yok (ana metinde düzeltilmiş veya silinmiş olabilir); ana metin kullanıldı.`);
  return { kod, dosya, ns: kod, yalnizcaYoklama: true, devirSatirlari: devir };
}
function parseUnit(kod) {
  const dosya = birimDosyasi(kod);
  if (!dosya) return null;
  const lines = readLines(path.join(birimKlasoru, dosya));
  // kısımlara ayır
  const parca = { metin: [], kaynakca: [], kk: [], an: [], devir: [] };
  const basliklar = { kk: null, an: null };
  let cur = 'metin';
  for (const l of lines) {
    // Devir ve yoğunlaştırma notu (### veya ####) ve altındaki her şey alınmaz.
    if (cur !== 'devir' && DEVIR_BASLA_RE.test(l)) { cur = 'devir'; continue; }
    const m = l.match(OZEL_RE);
    if (m && cur !== 'devir') {
      const ad = lower(m[1]);
      cur = ad.startsWith('birim') ? 'kaynakca' : ad.startsWith('kaynak kontrol') ? 'kk' : ad.startsWith('araştırma') ? 'an' : 'devir';
      if (cur === 'kk' || cur === 'an') basliklar[cur] = l.replace(/^###\s+/, '').trim();
      continue;
    }
    parca[cur].push(l);
  }
  const ns = kod;
  const ex = extractDefs(parca.metin, ns);
  for (const [k, v] of ex.defs) ALL_DEFS.set(k, v);
  for (const p of ['kaynakca', 'kk', 'an']) {
    if (parca[p].some((l) => /^\[\^[^\]]+\]:/.test(l))) warn(`${kod}: "${p}" kısmında dipnot tanımı var; bu tanımlar kullanılmadı.`);
  }
  const metinBloklar = parseBlocks(ex.rest);
  for (const b of metinBloklar) if (b.k === 'h' && b.md < 3) warn(`${kod}: metinde "${'#'.repeat(b.md)} ${b.text}" başlığı var (birimler ### ile başlamalı).`);
  KAYNAK_SAYIM[kod] = { dosya: path.join(AYAR.birim_klasoru, dosya), tanim: ex.defs.size, devir_satir: parca.devir.length };
  return {
    kod, dosya, ns,
    metin: metinBloklar,
    kaynakca: parseBib(parseBlocks(parca.kaynakca), kod),
    kk: basliklar.kk ? { baslik: basliklar.kk, bloklar: parseBlocks(parca.kk) } : null,
    an: basliklar.an ? { baslik: basliklar.an, bloklar: parseBlocks(parca.an) } : null,
    devirSatirlari: parca.devir,
  };
}
const ANA_HAM = anaSatirlar.join('\n');
const BOLUMLER = AYAR.bolumler.map((b) => {
  const anaBolum = ANA.bolumler.get(b.plan_adi) || null;
  // Ana metinde birleştirilmiş bölümün birim dosyaları metne alınmaz (bölüm iki kez görünmesin diye).
  return { ...b, anaBolum, birimVeri: b.birimler.map((u) => ({ ...u, veri: anaBolum ? birimYoklama(u.kod, ANA_HAM) : parseUnit(u.kod) })) };
});
const GIRIS_BIRIMI = AYAR.giris_birim_kodu ? birimYoklama(AYAR.giris_birim_kodu, ANA_HAM) : null;
{
  const anadan = BOLUMLER.filter((b) => b.anaBolum).map((b) => b.plan_adi);
  const birimden = BOLUMLER.filter((b) => !b.anaBolum && b.birimVeri.some((u) => u.veri)).map((b) => b.plan_adi);
  RAPOR.push(`Giriş${anadan.length ? ', ' + anadan.join(', ') : ''} ana metinden alındı${birimden.length ? '; birim dosyalarından alınan bölümler: ' + birimden.join(', ') : ''}.`);
  const yoklanan = [GIRIS_BIRIMI, ...BOLUMLER.flatMap((b) => b.birimVeri.map((u) => u.veri))].filter((v) => v && v.yalnizcaYoklama);
  if (yoklanan.length) RAPOR.push(`Ana metinde birleştirilmiş kısımların birim dosyaları (${yoklanan.map((v) => v.dosya).join(', ')}) metne alınmadı; yalnızca devir notu yoklaması ve tutarlılık denetimi için okundu.`);
}
for (const f of birimDosyalari) {
  const kodlar = [...AYAR.bolumler.flatMap((b) => b.birimler.map((u) => u.kod)), ...(AYAR.giris_birim_kodu ? [AYAR.giris_birim_kodu] : [])];
  if (f !== BICIM.oz_dosyasi && !kodlar.some((k) => f.startsWith(k + '_'))) warn(`Ayarlarda karşılığı olmayan birim dosyası atlandı: ${f}`);
}

// ---------------------------------------------------------------- kaynakça birleştirme
const ESLESME = (() => {
  if (!AYAR.kaynakca_eslestirme) return { birlestir: [], ayri_tut: [] };
  const p = path.join(KOK, AYAR.kaynakca_eslestirme);
  if (!fs.existsSync(p)) return { birlestir: [], ayri_tut: [] };
  const v = jsonOku(p, 'Kaynakça eşleştirme dosyası');
  v.birlestir = v.birlestir || []; v.ayri_tut = v.ayri_tut || [];
  if (!Array.isArray(v.birlestir) || v.birlestir.some((g) => !g || !Array.isArray(g.girdiler) || g.girdiler.some((x) => typeof x !== 'string'))) fail(`${p}: "birlestir" her biri "girdiler" metin listesi içeren nesnelerden oluşan bir liste olmalı.`);
  if (!Array.isArray(v.ayri_tut) || v.ayri_tut.some((x) => !Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string'))) fail(`${p}: "ayri_tut" iki metinli listelerden oluşan bir liste olmalı.`);
  return v;
})();
function stripBib(s) { return s.replace(/<(https?:\/\/[^>\s]+)>/g, '$1').replace(/\*\*|\*|`/g, ''); }
function normText(s) { return lower(stripBib(s)).replace(/[“”"'’‘]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function firstUrl(s) { const m = s.match(/<(https?:\/\/[^>\s]+)>/); return m ? m[1] : null; }
function courtPrefix(s) { return normText(stripBib(s).split(',')[0]); }
/** "Soyadı, Ad: Başlık …" veya "Kurum: Başlık …" biçimini ayırır (bağlantılar çıkarılarak). */
function yazarBaslik(text) {
  // Başlık iki noktadan hemen sonra tırnak veya italikle başlamalıdır; aksi hâlde "Yazar: Başlık" sayılmaz.
  const m = text.replace(/<https?:\/\/[^>\s]+>/g, '').match(/^([^:]{2,200}):\s*([*"“].*)$/);
  return m ? [m[0], stripBib(m[1]), stripBib(m[2])] : null;
}
function strongKeys(e) {
  const s = stripBib(e.text); const K = []; let m;
  if ((m = s.match(/(?:DOI:\s*|doi\.org\/)(10\.\d{4,9}\/\S+?)[.,;]?(?=\s|$)/i))) K.push('doi:' + lower(m[1]));
  if ((m = s.match(/ISBN[:\s]*([\dXx][\dXx-]{8,16})/))) K.push('isbn:' + m[1].replace(/-/g, ''));
  if ((m = s.match(/PMID:?\s*(\d{5,9})\b/))) K.push('pmid:' + m[1]);
  if ((m = s.match(/Tez No\.?\s*(\d+)/))) K.push('tez:' + m[1]);
  if (e.cat === 'Mevzuat') {
    if ((m = s.match(/^(\d{3,4}) sayılı/) || s.match(/,\s*(\d{3,4}) sayılı Kanun\b/) || s.match(/Kanun No\.?\s*(\d{3,4})/) || s.match(/;\s*(\d{3,4}) sayılı Kanun\b/))) K.push('kanun:' + m[1]);
    else if ((m = s.match(/MevzuatNo=(\d+)&MevzuatTur=1&/))) K.push('kanun:' + m[1]);
  }
  if (e.cat === 'Yargı kararları') {
    if ((m = s.match(/(\d{4}\/\d+)\s*E\.,?\s*(\d{4}\/\d+)\s*K\./))) K.push('ek:' + courtPrefix(s) + ':' + m[1] + '-' + m[2]);
    if ((m = s.match(/B\.\s*No\.?\s*(\d{4}\/\d+)/))) K.push('bno:' + m[1]);
    if (/^(AİHM|Avrupa İnsan Hakları Komisyonu)/.test(s) && (m = s.match(/,\s*(\d{3,6}\/\d{2})\b/))) K.push('basvuru:' + m[1]);
    if ((m = s.match(/\[(\d{4})\]\s*(EWCA \w+ \d+|UKSC \d+|EWHC \d+)/))) K.push('ati:' + m[1] + m[2]);
  }
  if ((m = s.match(/\b((?:CEDAW|CCPR|CRC|CESCR|A|E)\/(?:C\/)?[A-Z0-9.]+(?:\/[A-Z0-9.]+)+)/))) K.push('bm:' + m[1]);
  if ((m = s.match(/\((1\/\d+)\)/))) K.push('tbmm:' + m[1]);
  return K;
}
/**
 * Bağlantı eşleşme kanıtı sayılır mı? Yalın alan adı ve site veya dergi ana sayfası sayılmaz: sorgusuz, rakamsız,
 * en çok iki anlamlı yol parçalı ve son parçası kısa olan bağlantı (ör. dergipark.org.tr/tr/pub/dergi, …/home/oem).
 */
function belirginUrl(u) {
  const m = u.replace(/^https?:\/\//i, '').match(/^([^/?#]+)([^?#]*)(\?[^#]*)?/);
  if (!m) return null;
  const yol = m[2].split('/').filter((x) => x && !/^(index|default|home|anasayfa|main)(\.\w+)?$/i.test(x) && !/^[a-z]{2}(-[a-z]{2})?$/i.test(x));
  const sorgu = !!m[3] && m[3].length > 1;
  if (!sorgu && (!yol.length || (yol.length <= 2 && !/\d/.test(yol.join('/')) && yol[yol.length - 1].split(/[-_]/).length < 3))) return null;
  return lower(u.replace(/^https?:\/\//i, '').replace(/\/+$/, ''));
}
function weakKeys(e) {
  const K = ['metin:' + normText(e.text)];
  const u = firstUrl(e.text);
  const bu = u && belirginUrl(u);
  if (bu) K.push('url:' + bu);
  if (e.cat === 'Kitaplar, tezler ve makaleler') {
    const m = yazarBaslik(e.text);
    if (m) {
      const tm = m[2].match(/^"([^"]+)"|^“([^”]+)”/) || e.text.replace(/^[^:]*:\s*/, '').match(/^\*([^*]+)\*/);
      const title = tm ? (tm[1] || tm[2]) : m[2].split(',')[0];
      const y = (m[2].match(/\b(19|20)\d{2}\b/) || [''])[0];
      K.push('yby:' + normText(m[1]) + '|' + normText(title) + '|' + y);
    }
  }
  return K;
}
const STOP = new Set(['ve', 'veya', 'ile', 'bir', 'için', 'dair', 'hakkında', 'ilişkin', 'the', 'and', 'of', 'for', 'on', 'in', 'to', 'https', 'http', 'www']);
function tokens(s) { return new Set(normText(stripBib(s).replace(/https?:\/\/\S+/g, '')).split(' ').filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w))); }
function overlap(a, b) { let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.max(1, Math.min(a.size, b.size)); }
function jaccard(a, b) { let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.max(1, a.size + b.size - n); }
const katSirasi = (c) => { const i = KATEGORILER.findIndex((k) => lower(k) === lower(c)); return i < 0 ? 99 : i; };
const katAdi = (c) => { const i = katSirasi(c); return i < 99 ? KATEGORILER[i] : c; };

function mergeBibliography(entries) {
  entries.forEach((e, i) => { e.id = i; e.cat = katAdi(e.cat); e.sk = strongKeys(e); e.wk = weakKeys(e); });
  const parent = entries.map((e, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const members = (r) => entries.filter((e) => find(e.id) === r);
  const forbidden = (ESLESME.ayri_tut || []).map((p) => [entries.filter((e) => e.text.includes(p[0])).map((e) => e.id), entries.filter((e) => e.text.includes(p[1])).map((e) => e.id)]);
  const neden = new Map();
  // Güçlü kimliği (DOI, ISBN, PMID, Tez No.) çelişen iki grup otomatik birleştirilmez; denetim birleştirmeden önce,
  // grubun bütün üyeleri üzerinden yapılır (A–B ve B–C zayıf eşleşmesi A ile C'yi birleştiremez).
  const CELISKI_TIPLERI = ['doi', 'isbn', 'pmid', 'tez'];
  const celisen = (A, B) => CELISKI_TIPLERI.find((t) => {
    const a = A.flatMap((e) => e.sk).filter((k) => k.startsWith(t + ':')), b = B.flatMap((e) => e.sk).filter((k) => k.startsWith(t + ':'));
    return a.length && b.length && !a.some((k) => b.includes(k));
  });
  const union = (a, b, why, elle = false) => {
    const ra = find(a), rb = find(b); if (ra === rb) return;
    const A = members(ra), B = members(rb);
    const Ai = A.map((e) => e.id), Bi = B.map((e) => e.id);
    for (const [x, y] of forbidden) {
      if ((Ai.some((i) => x.includes(i)) && Bi.some((i) => y.includes(i))) || (Ai.some((i) => y.includes(i)) && Bi.some((i) => x.includes(i)))) return;
    }
    const t = !elle && celisen(A, B);
    if (t) { RAPOR.push(`Kaynakça: "${stripBib(A[0].text).slice(0, 60)}…" ile "${stripBib(B[0].text).slice(0, 60)}…" ${why} ölçütüyle eşleşti ama ${t.toUpperCase()} farklı; birleştirilmedi.`); return; }
    parent[rb] = ra; neden.set(ra, [...(neden.get(ra) || []), ...(neden.get(rb) || []), why]);
  };
  const byKey = new Map();
  for (const e of entries) for (const k of [...e.sk, ...e.wk]) {
    if (byKey.has(k)) union(byKey.get(k), e.id, k.split(':')[0]); else byKey.set(k, e.id);
  }
  const elle = [];
  for (const g of ESLESME.birlestir || []) {
    const ids = entries.filter((e) => g.girdiler.some((p) => e.text.includes(p))).map((e) => e.id);
    if (ids.length < 2) { RAPOR.push(`kaynakca_eslestirme.json: "${g.girdiler[0]}" grubunda eşleşen künye sayısı ${ids.length}; birleştirilecek künye yok (ana metin kaynakçası önceden birleştirilmiş olabilir).`); continue; }
    for (const id of ids.slice(1)) union(ids[0], id, 'elle', true);
    elle.push({ g, ids });
  }
  // grupları kur
  const gruplar = new Map();
  for (const e of entries) { const r = find(e.id); if (!gruplar.has(r)) gruplar.set(r, []); gruplar.get(r).push(e); }
  const sonuc = [];
  for (const [r, uyeler] of gruplar) {
    let temsil = null;
    const el = elle.find((x) => uyeler.some((u) => x.ids.includes(u.id)) && x.g.temsilci);
    if (el) temsil = uyeler.find((e) => e.text.includes(el.g.temsilci)) || null;
    if (!temsil) {
      temsil = [...uyeler].sort((a, b) => (Number(!!firstUrl(b.text)) - Number(!!firstUrl(a.text))) || (stripBib(b.text).length - stripBib(a.text).length) || (a.id - b.id))[0];
    }
    const kats = [...new Set(uyeler.map((e) => e.cat))];
    if (kats.length > 1) warn(`Kaynakça: "${stripBib(temsil.text).slice(0, 70)}…" farklı kategorilerde (${kats.join(' / ')}); "${temsil.cat}" altında verildi.`);
    sonuc.push({ temsil, uyeler, neden: [...new Set(neden.get(r) || [])] });
  }
  // şüpheli eşleşmeler (birleştirilmedi)
  const supheli = [];
  const tipler = ['doi', 'isbn', 'pmid', 'tez', 'kanun', 'ek', 'bno', 'basvuru', 'ati', 'bm', 'tbmm'];
  const tip = (keys, t) => keys.filter((k) => k.startsWith(t + ':'));
  for (let i = 0; i < sonuc.length; i++) for (let j = i + 1; j < sonuc.length; j++) {
    const a = sonuc[i].temsil, b = sonuc[j].temsil;
    if (a.cat !== b.cat) continue;
    const ak = sonuc[i].uyeler.flatMap((e) => e.sk), bk = sonuc[j].uyeler.flatMap((e) => e.sk);
    if (tipler.some((t) => tip(ak, t).length && tip(bk, t).length && !tip(ak, t).some((k) => bk.includes(k)))) continue;
    const ta = tokens(a.text), tb = tokens(b.text);
    if (ta.size < 3 || tb.size < 3) continue;
    const ayniHarf = [...ta].sort().join(' ') === [...tb].sort().join(' ');
    if (ayniHarf && (stripBib(a.text).match(/\d+/g) || []).join() !== (stripBib(b.text).match(/\d+/g) || []).join()) continue; // aynı dizinin farklı sayıları
    let neden = null;
    const ma = yazarBaslik(a.text), mb = yazarBaslik(b.text);
    if (ma && mb) {
      // "Yazar: Başlık" biçimli künyeler yalnızca aynı ilk yazar/kurum ve benzer başlıkta şüpheli sayılır.
      if (normText(ma[1]).split(' ')[0] === normText(mb[1]).split(' ')[0]) {
        const j2 = jaccard(tokens(ma[2]), tokens(mb[2]));
        if (j2 >= 0.5) neden = `aynı yazar/kurum ve benzer başlık (Jaccard ${j2.toFixed(2)})`;
      }
    } else if (!ma && !mb) {
      const o = overlap(ta, tb);
      if (o >= 0.5) neden = `metin benzerliği (örtüşme ${o.toFixed(2)})`;
    }
    if (neden) supheli.push({ a: sonuc[i], b: sonuc[j], neden });
  }
  return { gruplar: sonuc, supheli, elle };
}
// Sıralama belge dilinin kurallarıyla (Türkçede ı/i, ç, ş … ayrımı).
const COLL = (() => { try { return new Intl.Collator(String(BICIM.dil).split(/[-_]/)[0], { numeric: true, sensitivity: 'base' }); } catch (e) { return new Intl.Collator('tr', { numeric: true, sensitivity: 'base' }); } })();
const tumBib = [...ANA.bib];
for (const b of BOLUMLER) for (const u of b.birimVeri) if (u.veri && u.veri.kaynakca) tumBib.push(...u.veri.kaynakca);
// Anahtarlı atıfta (numaralı, yazar–tarih) künyeler anahtarla eşlenir; tekilleştirme anahtara göredir.
const ANAHTARLI = new Map();
const ERISIM_KUNYE = new Set(); // sonundaki erişim etiketi silinen künyelerin anahtarları
const ERISIM_ATIF = [];         // erişim etiketi yer bilgisine yazılmış atıflar
const ATIF_METINLERI = new Set(); // Word'e basılan atıf metinleri (beklenen.json; dogrula.js erişim etiketi kalıntısını burada arar)
if (ANAHTARLI_ATIF) {
  for (const e of tumBib) {
    // Künye sonundaki erişim etiketleri ("[tam metin]", "[Full text].", "*[özet]*"…) Word çıktısından silinir; etiketten
    // sonraki nokta künyenin son noktasıysa korunur.
    let m;
    while ((m = e.text.match(/\s*[*_]*\[([^[\]]+)\][*_]*([.,;]?)[*_]*\s*$/)) && erisimEtiketiMi(m[1])) {
      e.text = e.text.slice(0, m.index);
      if (m[2] === '.' && !/[.!?]$/.test(e.text)) e.text += '.';
      ERISIM_KUNYE.add(e.anahtar || e.text.slice(0, 40));
    }
    if (!e.anahtar) { warn(`${ATIF_ADI}: anahtarsız künye kaynakçaya alınmadı (${e.kaynak}): ${e.text.slice(0, 70)}`); continue; }
    if (ANAHTARLI.has(e.anahtar)) {
      if (normText(ANAHTARLI.get(e.anahtar).text) !== normText(e.text)) warn(`${ATIF_ADI}: [@${e.anahtar}] iki farklı künyeyle tanımlı; ilki kullanıldı.`);
      continue;
    }
    ANAHTARLI.set(e.anahtar, e);
  }
}
if (ERISIM_KUNYE.size) RAPOR.push(`Kaynakça: ${ERISIM_KUNYE.size} künyenin sonundaki erişim etiketi ([tam metin], [özet] …) Word çıktısından silindi.`);
const ATIF = { no: new Map(), sira: [], eksik: [] };
/** Anahtarı atıf sırasına kaydeder; kaynakçada yoksa eksik sayar, uyarır ve false döner. */
function atifKaydet(a, ns) {
  if (!ANAHTARLI.has(a)) { ATIF.eksik.push(a); warn(`Kaynakçada karşılığı olmayan atıf anahtarı: [@${a}] (${ns})`); return false; }
  if (!ATIF.no.has(a)) { ATIF.no.set(a, ATIF.sira.length + 1); ATIF.sira.push(a); }
  return true;
}
function atifNo(parcalar, ns) {
  const ogeler = parcalar.map((p) => ({ p, n: atifKaydet(p.anahtar, ns) ? ATIF.no.get(p.anahtar) : null }));
  const say = ogeler.filter((o) => o.n !== null).sort((x, y) => x.n - y.n);
  const eksik = ogeler.filter((o) => o.n === null).map((o) => '?' + o.p.anahtar);
  // Yer bilgisi varsa aralık sıkıştırılmaz: [@a, s. 12; @b] → [1, s. 12; 2]. "[-@a]" numaralıda normal numaradır.
  if (parcalar.some((p) => p.yer)) return BICIM.atif.numara_bicimi.replace('{n}', [...say.map((o) => (o.p.yer ? `${o.n}, ${o.p.yer}` : String(o.n))), ...eksik].join('; '));
  // Ardışık numaralar aralık olarak yazılır: 3, 4, 5 → 3–5.
  const nolar = say.map((o) => o.n);
  const parca = []; let i = 0;
  while (i < nolar.length) { let j = i; while (j + 1 < nolar.length && nolar[j + 1] === nolar[j] + 1) j++; parca.push(j - i >= 2 ? `${nolar[i]}–${nolar[j]}` : nolar.slice(i, j + 1).join(',')); i = j + 1; }
  return BICIM.atif.numara_bicimi.replace('{n}', [...parca, ...eksik].join(','));
}

// ---------------------------------------------------------------- yazar–tarih etiketi
// Etiket künyeden türetilir. APA: yıl parantezinden ("(2020)", "(2020a)", "(2020, March 5)", "(n.d.)", "(t.y.)") önceki
// kısım yazarlardır ("Soyad, A. B., Soyad2, C., & Soyad3, D."; baş harfsiz yazar kısmı kurum yazarıdır). APA'ya uymayan
// künyede Vancouver/AMA denenir ("Smith J, Lee K, Kim H. Başlık. Dergi. 2020;12(3):45-67.", "Smith J, et al.", kurum
// yazarı "World Health Organization. Başlık. 2020."). İkisi de tutmazsa etiket olarak anahtar basılır ve künye
// "etiket_turetilemedi" listesine girer (doğrulama KALDI). Künyedeki "{WHO, 2020}" elle etiketi her zaman önceliklidir.
// Yazar sayısı vd_esigi ve üstündeyse "Smith et al."; altındaysa "Smith", "Smith & Lee", "Smith, Lee & Kim".
const YIL_RE = /\((\d{4}[a-z]?|(?:n\.\s?d\.|t\.\s?y\.|in press|baskıda)(?:-[a-z])?)(?:,[^)]*)?\)/i;
const BAS_HARF_RE = /^(?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]?\.\s*-?\s*)+$/; // "A.", "A. B.", "J.-P.", "Ch."
const VANC_KISI_RE = /^(\p{L}[\p{L}'’-]*(?:\s+[\p{L}'’-]+)*?)\s+(\p{Lu}{1,3})$/u; // "Smith J", "van der Berg JA"
const VANC_YIL_RE = /(?:^|[.;:,]\s*)((?:1[5-9]|20)\d{2})(?=\s*[;.(:,]|\s+[A-Z][a-z]{2}\b|\s*$)/; // "Dergi. 2020;12", "Yayınevi; 2020."
const KURUM_BAGLAC = new Set(['of', 'for', 'and', 'the', 'on', 'in', 'und', 'für', 'de', 'des', 'du', 'la', 've', 'ile', 'için', '&']);
/** Kurum yazarı gibi mi: rakamsız, iki noktasız, en çok 10 kelime; her kelime büyük harfle başlar ya da bağlaçtır. */
function kurumAdiMi(s) {
  const k = s.replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/[,.]/g, ' ').split(/\s+/).filter(Boolean); // "(ICOH)" kısaltması sayılmaz
  return k.length > 0 && k.length <= 10 && !/[\d:;]/.test(s) && k.every((w) => /^\p{Lu}/u.test(w) || KURUM_BAGLAC.has(lower(w)));
}
function adlardanEtiket(adlar, etAl) {
  if (etAl || adlar.length >= ATIF_VD_ESIGI) return `${adlar[0]} ${ATIF_VD}`;
  return adlar.length === 1 ? adlar[0] : `${adlar.slice(0, -1).join(', ')} ${ATIF_VE} ${adlar[adlar.length - 1]}`;
}
/** Yıl metnini taban ve harfe ayırır: "2018a" → 2018 + a; "n.d.-b" → yil_yok + b. */
function yilAyir(ham) {
  const d = ham.match(/^(\d{4})([a-z]?)$/i);
  if (d) return { taban: d[1], harf: d[2].toLowerCase() };
  const n = ham.match(/^(n\.\s?d\.|t\.\s?y\.|in press|baskıda)(?:-([a-z]))?$/i);
  return n ? { taban: /press|baskı/i.test(n[1]) ? n[1] : ATIF_YIL_YOK, harf: (n[2] || '').toLowerCase() } : { taban: ham, harf: '' };
}
const yilYaz = (taban, harf) => (!harf ? taban : /^\d/.test(taban) ? taban + harf : `${taban}-${harf}`);
function apaCoz(s) {
  const m = s.match(YIL_RE);
  if (!m) return null;
  const yazarlar = s.slice(0, m.index).replace(/\[[^\]]*\]/g, ' ').replace(/\([^)\d]*\)/g, ' ').replace(/(?:\.\s+){2,}\.?|…/g, ' ')
    .replace(/\s+([.,])/g, '$1').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim().replace(/[,;]+$/, '').trim();
  if (!yazarlar) return null;
  const parcalar = yazarlar.replace(/,?\s*&\s*/g, ', ').replace(/,?\s+(?:ve|and)\s+(?=[^,]+,\s*[A-ZÇĞİÖŞÜ][a-zçğıöşü]?\.)/g, ', ')
    .split(/\s*,\s*/).filter(Boolean);
  const kisiler = [];
  for (const p of parcalar) {
    if (BAS_HARF_RE.test(p) && kisiler.length) { kisiler[kisiler.length - 1].basHarf = true; continue; }
    kisiler.push({ soyad: p.replace(/\.$/, ''), basHarf: false });
  }
  let adlar;
  if (kisiler.some((k) => k.basHarf)) adlar = kisiler.map((k) => k.soyad);
  else if (kurumAdiMi(yazarlar)) adlar = [yazarlar.replace(/\.$/, '')];
  else return null;
  return { tur: 'apa', adlar, etAl: /(?:\.\s+){2,}|…/.test(s.slice(0, m.index)), ...yilAyir(m[1]), yazarAnahtar: normText(yazarlar), baslik: s.slice(m.index + m[0].length) };
}
const AY_TARIH_RE = new RegExp('(?<!\\p{L})(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\\.?\\s+(?:\\d{1,2},\\s+)?((?:1[5-9]|20)\\d{2})\\b', 'giu');
/**
 * Vancouver künyede yayın yılı yalnız açık tarih biçiminden alınır: "Dergi. 2020;" / "Yayınevi; 2020." ya da ay adlı tarih
 * ("5 November 2023", "28 Mayıs 2019"; sondaki alınır). Bağlantılar ve erişim tarihleri sayılmaz; başlıktaki yıl
 * ("Health targets for 2030") hiçbir zaman alınmaz. Bulunamazsa null (etiket türetilemedi).
 */
function vancYil(kalan) {
  const temiz = kalan.replace(/<[^>]*>|https?:\/\/\S+|\b(?:accessed|cited|retrieved|erişim(?: tarihi)?|erişildi|son erişim)\b[^.;)\]]*/giu, (x) => ' '.repeat(x.length));
  const m = temiz.match(VANC_YIL_RE);
  if (m) return { yil: m[1], konum: m.index + m[0].lastIndexOf(m[1]) };
  let son = null;
  for (const t of temiz.matchAll(AY_TARIH_RE)) son = { yil: t[1], konum: t.index + t[0].lastIndexOf(t[1]) };
  return son;
}
function vancouverCoz(s) {
  const i = s.search(/\.\s/);
  if (i < 0) return null;
  const bas = s.slice(0, i).trim(), kalan = s.slice(i + 1);
  const y = vancYil(kalan);
  if (!y) return null;
  let etAl = false; let adlar = [];
  for (const p of bas.split(/\s*,\s*/).filter(Boolean)) {
    if (/^(et al|vd|ve ark)\.?$/i.test(p)) { etAl = true; continue; }
    const k = p.match(VANC_KISI_RE);
    if (!k) { adlar = null; break; }
    adlar.push(k[1]);
  }
  if (!adlar || !adlar.length) { if (!kurumAdiMi(bas)) return null; adlar = [bas.replace(/\s*[([][^)\]]*[)\]]/g, '')]; etAl = false; }
  return { tur: 'vancouver', adlar, etAl, taban: y.yil, harf: '', yazarAnahtar: normText(bas), baslik: kalan.split(/\.\s/)[0] };
}
const COZUM = new Map(); // anahtar → künye çözümü (yazarlar, yıl tabanı ve harfi) ya da null
function kunyeCoz(a) {
  if (!COZUM.has(a)) {
    const e = ANAHTARLI.get(a); const s = stripBib(e.text);
    let c = apaCoz(s) || vancouverCoz(s);
    if (e.etiket) {
      const i = e.etiket.lastIndexOf(',');
      c = { tur: 'elle', yazar: i < 0 ? e.etiket : e.etiket.slice(0, i).trim(), taban: i < 0 ? (c ? yilYaz(c.taban, c.harf) : ATIF_YIL_YOK) : e.etiket.slice(i + 1).trim(), harf: '' };
    }
    COZUM.set(a, c);
  }
  return COZUM.get(a);
}
const ETIKET = new Map();
const ETIKET_YOK = []; // etiketi türetilemeyen anahtarlar (beklenen.json "etiket_turetilemedi"; doğrulama KALDI)
function etiketAl(a) {
  if (!ETIKET.has(a)) {
    const c = kunyeCoz(a);
    if (!c) {
      ETIKET_YOK.push(a);
      warn(`Yazar–tarih: [@${a}] künyesinden yazar ve yıl çıkarılamadı (APA ve Vancouver biçimine uymuyor); etiket olarak anahtar basıldı ve doğrulama KALDI verir. Künyeyi düzeltin ya da "- [@${a}] {Yazar, yıl} Künye" diye elle etiket yazın: ${stripBib(ANAHTARLI.get(a).text).slice(0, 70)}`);
    }
    ETIKET.set(a, !c ? { yazar: a, yil: '' } : { yazar: c.tur === 'elle' ? c.yazar : adlardanEtiket(c.adlar, c.etAl), yil: yilYaz(c.taban, c.harf) });
  }
  return ETIKET.get(a);
}
const etiketMetni = (et) => (et.yil ? et.yazar + ATIF_YY_AYRAC + et.yil : et.yazar);
/** Künyedeki yılın arkasına harf ekler: APA "(2018)" → "(2018a)", "(n.d.)" → "(n.d.-a)"; Vancouver "2018;" → "2018a;". */
function yilHarfle(text, c, harf) {
  if (c.tur === 'apa') return text.replace(YIL_RE, (m0, y) => m0.replace(y, /^\d/.test(y) ? y + harf : `${y}-${harf}`));
  const i = text.search(/\.\s/); const y = i < 0 ? null : vancYil(text.slice(i + 1));
  if (!y) return text;
  const j = i + 1 + y.konum;
  return text.slice(0, j) + y.yil + harf + text.slice(j + y.yil.length);
}
const OTOMATIK_HARF = []; // {anahtar, etiket}
/**
 * 2020a/b (APA 7): atıf yapılan eserlerden yazar(lar)ı ve yılı aynı olanlara künyedeki başlık sırasıyla a, b, … verilir;
 * harf metindeki etikette ve kaynakça girdisinin yılında birlikte görünür. Künyede harf ya da elle etiket varsa dokunulmaz.
 */
function harfVer(anahtarlar) {
  const gruplar = new Map();
  for (const a of anahtarlar) {
    const c = kunyeCoz(a);
    if (!c || c.tur === 'elle') continue;
    const k = c.yazarAnahtar + '|' + c.taban;
    gruplar.set(k, [...(gruplar.get(k) || []), a]);
  }
  const baslik = (a) => COZUM.get(a).baslik.replace(/^[\s.,"“'‘]+/, '').replace(/^(the|a|an)\s+/i, '');
  for (const uyeler of gruplar.values()) {
    const harfsiz = uyeler.filter((a) => !COZUM.get(a).harf);
    if (uyeler.length < 2 || !harfsiz.length) continue;
    const dolu = new Set(uyeler.map((a) => COZUM.get(a).harf).filter(Boolean));
    let h = 0;
    for (const a of harfsiz.sort((x, y) => COLL.compare(baslik(x), baslik(y)))) {
      while (dolu.has(String.fromCharCode(97 + h))) h++;
      const c = COZUM.get(a); c.harf = String.fromCharCode(97 + h++);
      ANAHTARLI.get(a).text = yilHarfle(ANAHTARLI.get(a).text, c, c.harf);
      OTOMATIK_HARF.push({ anahtar: a, etiket: adlardanEtiket(c.adlar, c.etAl) + ATIF_YY_AYRAC + yilYaz(c.taban, c.harf) });
    }
  }
  if (OTOMATIK_HARF.length) RAPOR.push(`Yazar–tarih: otomatik harf verildi (aynı yazar ve yıl; sıra başlığa göre): ${OTOMATIK_HARF.map((x) => `[@${x.anahtar}] → ${x.etiket}`).join('; ')}.`);
}
/** "(Lee & Kim, 2019; Smith, 2020, s. 12)"; "[-@a]" → "(2020)"; aynı yazarın eserleri birleşir: "(Smith, 2019, 2020)". */
function yazarTarihAtif(parcalar, ns) {
  const ogeler = parcalar.map((p) => (atifKaydet(p.anahtar, ns) ? { p, ...etiketAl(p.anahtar) } : { p, eksik: `[?${p.anahtar}]` }));
  ogeler.sort((x, y) => (Number(!!x.eksik) - Number(!!y.eksik)) || COLL.compare(x.yazar || '', y.yazar || '') || COLL.compare(x.yil || '', y.yil || ''));
  const gruplar = [];
  for (const o of ogeler) {
    const g = gruplar[gruplar.length - 1];
    const yil = [o.yil, o.p.yer].filter(Boolean).join(', ');
    if (!o.eksik && g && !g.eksik && g.yazar === o.yazar && g.yalniz === o.p.yilYalniz && !g.yer && !o.p.yer) { g.yillar.push(yil); continue; }
    gruplar.push(o.eksik ? { eksik: o.eksik } : { yazar: o.yazar, yillar: [yil], yalniz: o.p.yilYalniz, yer: !!o.p.yer, yilsiz: !o.yil });
  }
  return '(' + gruplar.map((g) => {
    if (g.eksik) return g.eksik;
    const yillar = g.yillar.filter(Boolean).join(', ');
    // Yılı olmayan etikette (türetilemeyen künye) yer bilgisi virgülle ayrılır.
    return g.yalniz ? (yillar || g.yazar) : (yillar ? g.yazar + (g.yilsiz ? ', ' : ATIF_YY_AYRAC) + yillar : g.yazar);
  }).join(ATIF_COKLU_AYRAC) + ')';
}
const BIB = ANAHTARLI_ATIF ? { gruplar: [], supheli: [], elle: [] } : mergeBibliography(tumBib);
function sortKey(e) {
  let s = stripBib(e.text).replace(/^[\s"“'‘(\[]+/, '');
  if (e.cat === 'Yargı kararları') s = s.replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (m, d, mo, y) => `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
  return s;
}
const BIB_KAT = {};
for (const g of BIB.gruplar) { const c = g.temsil.cat; (BIB_KAT[c] = BIB_KAT[c] || []).push(g.temsil); }
if (BICIM.kaynakca_siralama !== 'atif_sirasi') for (const c of Object.keys(BIB_KAT)) BIB_KAT[c].sort((a, b) => COLL.compare(sortKey(a), sortKey(b)));

// ---------------------------------------------------------------- belge modeli
// Model öğeleri: {k:'h', lvl, text, ns} | {k:'p', text, ns, style?} | {k:'note', text} | {k:'list', items, ns}
//                {k:'quote', paras, ns} | {k:'table', header, rows, ns} | {k:'h1', etiket, baslik}
const MODEL = [];
const OZEL_BASLIK_RE = /(kaynak kontrolü|araştırma notu)/i;
const CALISMA_NOTLARI = BICIM.calisma_notlari !== false;
let ATLANAN_NOT = 0;
function pushBlocks(blocks, ns, kaynakAdi) {
  let onceki = null; let atla = 0;
  for (const b of blocks) {
    // calisma_notlari false: "Kaynak kontrolü"/"Araştırma notu" başlığı ve altı (aynı veya üst düzey başlığa kadar) basılmaz.
    if (atla && !(b.k === 'h' && b.md <= atla)) continue;
    atla = 0;
    if (b.k === 'h' && !CALISMA_NOTLARI && OZEL_BASLIK_RE.test(b.text)) { atla = b.md; ATLANAN_NOT++; continue; }
    if (b.k === 'h') {
      const lvl = b.md - 1;
      if (lvl < 2) { warn(`${kaynakAdi}: "${b.text}" başlığı bölüm düzeyinde; alt başlık olarak verildi.`); }
      const L = Math.max(2, Math.min(5, lvl));
      if (onceki && L > onceki + 1) warn(`${kaynakAdi}: başlık düzeyi atlanıyor (düzey ${onceki} → ${L}): "${b.text}"`);
      onceki = L;
      MODEL.push({ k: 'h', lvl: L, text: OZEL_BASLIK_RE.test(b.text) ? baslikHarfi(b.text) : b.text, ns });
    } else MODEL.push({ ...b, ns });
  }
}
// Giriş
MODEL.push({ k: 'h1', etiket: null, baslik: AMB.giris });
pushBlocks(ANA.giris, 'G', AMB.giris);
// Bölümler
const YAZILMAMIS = []; // İçindekiler altındaki not için
const planBul = (ad) => ANA.plan.find((p) => lower(p.title).startsWith(lower(ad)));
const ICINDEKILER_VAR = BICIM.on_kisim.includes('icindekiler');
for (const b of BOLUMLER) {
  const mevcut = b.birimVeri.filter((u) => u.veri);
  const plan = planBul(b.plan_adi);
  if (!b.anaBolum && !mevcut.length) {
    YAZILMAMIS.push({ metin: plan ? plan.title : `${b.plan_adi} — ${b.baslik}`, duzey: 1 });
    // İçindekiler üretilmeyen düzende (ör. makale) yazılmamış bölüm başlığı ve notuyla görünür; yoksa iz bırakmadan düşerdi.
    if (!ICINDEKILER_VAR) {
      MODEL.push({ k: 'h1', etiket: b.etiket, baslik: b.baslik });
      MODEL.push({ k: 'note', text: ING ? '[This section has not been written yet.]' : '[Bu bölüm henüz yazılmamıştır.]' });
    }
    continue;
  }
  MODEL.push({ k: 'h1', etiket: b.etiket, baslik: b.baslik });
  if (b.anaBolum) {
    // Ana metinde birleştirilmiş bölüm: metin, kaynak kontrolü ve araştırma notu ana metindeki sırasıyla alınır.
    pushBlocks(b.anaBolum.bloklar, 'G', b.plan_adi);
    continue;
  }
  let eksik = [];
  const eksikYaz = () => {
    if (!eksik.length) return;
    const ilk = eksik[0].kisimlar.split(/[–-]/)[0].trim();
    const son = eksik[eksik.length - 1].kisimlar.split(/[–-]/).pop().trim();
    const aralik = ilk === son ? ilk : `${ilk}–${son}`;
    MODEL.push({ k: 'note', text: ING ? `[This part (${aralik}) has not been written yet.]` : `[Bu kısım (${aralik}) henüz yazılmamıştır.]` });
    const romalar = eksik.flatMap((u) => romanRange(u.kisimlar));
    for (const r of romalar) {
      const it = plan && plan.items.find((x) => x.roman === r);
      YAZILMAMIS.push({ metin: `${b.plan_adi}, ${r}. ${it ? it.title : ''}`.trim(), duzey: 2 });
    }
    eksik = [];
  };
  for (const u of b.birimVeri) {
    if (!u.veri) { eksik.push(u); continue; }
    eksikYaz();
    pushBlocks(u.veri.metin, u.veri.ns, u.kod);
  }
  eksikYaz();
  if (!CALISMA_NOTLARI) { ATLANAN_NOT += mevcut.reduce((n, u) => n + Number(!!u.veri.kk) + Number(!!u.veri.an), 0); continue; }
  for (const u of mevcut) {
    for (const p of ['kk', 'an']) {
      const kisim = u.veri[p];
      if (!kisim) { warn(`${u.kod}: "${p === 'kk' ? 'Kaynak kontrolü' : 'Araştırma notu'}" kısmı bulunamadı.`); continue; }
      MODEL.push({ k: 'h', lvl: 2, text: baslikHarfi(kisim.baslik), ns: u.veri.ns });
      pushBlocks(kisim.bloklar, u.veri.ns, `${u.kod} ${p}`);
    }
  }
}

if (!CALISMA_NOTLARI) RAPOR.push(`calisma_notlari: false — ${ATLANAN_NOT} "Kaynak kontrolü"/"Araştırma notu" kısmı basılmadı.`);

// ---------------------------------------------------------------- dipnot sayımı (ön tarama)
function textsOf(item) {
  switch (item.k) {
    case 'h': case 'p': case 'note': return [item.text];
    case 'list': return item.items.map((x) => x.text);
    case 'quote': return item.paras;
    case 'table': return [...(item.header || []), ...item.rows.flat()];
    default: return [];
  }
}
const REF_SAYISI = new Map();
for (const it of MODEL) for (const t of textsOf(it)) for (const tk of tokenize(t, 'sayım')) {
  if (tk.fn !== undefined) { const key = it.ns + ':' + tk.fn; REF_SAYISI.set(key, (REF_SAYISI.get(key) || 0) + 1); }
}
const FN = { sayac: 0, no: new Map(), sira: [], tekrar: 0, eksik: [] };
// Yazar–tarihte atıf yapılan anahtarlar yazımdan önce taranır: 2020a/b harfi yalnız atıf yapılan eserler arasında verilir.
if (YAZAR_TARIH) {
  const anahtarlar = new Set();
  const tara = (t) => { for (const m of String(t).matchAll(/\[-?@[^\]\n]+\]/g)) for (const p of atifParcala(m[0])) if (ANAHTARLI.has(p.anahtar)) anahtarlar.add(p.anahtar); };
  for (const it of MODEL) textsOf(it).forEach(tara);
  for (const k of REF_SAYISI.keys()) if (ALL_DEFS.has(k)) tara(ALL_DEFS.get(k));
  ANA.okumaNotu.forEach(tara);
  if (ANA.kisaltmalar) textsOf(ANA.kisaltmalar).forEach(tara);
  harfVer([...anahtarlar]);
}

// ---------------------------------------------------------------- docx bileşenleri
function noteRefRuns(n) {
  const rs = '<w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr>';
  return [
    `<w:r>${rs}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${rs}<w:instrText xml:space="preserve"> NOTEREF _DnRef${n} \\f \\h </w:instrText></w:r>`,
    `<w:r>${rs}<w:fldChar w:fldCharType="separate"/></w:r>`,
    `<w:r>${rs}<w:t>${n}</w:t></w:r>`,
    `<w:r>${rs}<w:fldChar w:fldCharType="end"/></w:r>`,
  ].map((x) => ImportedXmlComponent.fromXmlString(x).root[0]);
}
function fnRef(ns, label) {
  const key = ns + ':' + label;
  if (!ALL_DEFS.has(key)) { FN.eksik.push(key); warn(`Tanımı olmayan dipnot referansı: [^${label}] (${ns})`); return [new TextRun(`[^${label}]`)]; }
  if (!FN.no.has(key)) {
    const n = ++FN.sayac; FN.no.set(key, n); FN.sira.push(key);
    const run = new FootnoteReferenceRun(n);
    return (REF_SAYISI.get(key) || 0) > 1 ? [new Bookmark({ id: `_DnRef${n}`, children: [run] })] : [run];
  }
  FN.tekrar++;
  return noteRefRuns(FN.no.get(key));
}
function runs(text, ns, base = {}, dipnotIcinde = false) {
  const out = [];
  if (ANAHTARLI_ATIF && ns !== 'kaynakça') text = erisimSil(text, ns); // kaynakça girdileri ayrı kuralla işlenir
  for (const t of tokenize(text, ns)) {
    if (t.fn !== undefined) {
      if (dipnotIcinde) { warn(`Dipnot içinde dipnot referansı: [^${t.fn}] (${ns}); düz metin bırakıldı.`); out.push(new TextRun(`[^${t.fn}]`)); }
      else out.push(...fnRef(ns, t.fn));
      continue;
    }
    if (t.cite) {
      if (!ANAHTARLI_ATIF) { warn(`Kaynak anahtarı ${t.ham} bulundu ama atıf türü "dipnot"; düz metin bırakıldı (${ns}).`); out.push(new TextRun(t.ham)); continue; }
      if (t.cite.some((p) => p.erisim.length)) { ERISIM_ATIF.push(`${t.ham} (${ns})`); warn(`Atıf içinde erişim etiketi: ${t.ham} (${ns}); etiket çıktıdan düşürüldü, kaynakça girdisinin sonuna taşıyın.`); }
      const o = { text: NUMARALI ? atifNo(t.cite, ns) : yazarTarihAtif(t.cite, ns) };
      ATIF_METINLERI.add(o.text);
      if (base.size) o.size = base.size;
      out.push(new TextRun(o));
      continue;
    }
    if (!t.text) continue;
    const o = { text: t.text };
    if (t.b || base.bold) o.bold = true;
    if (t.i || base.italics) o.italics = true;
    if (base.size) o.size = base.size;
    if (base.color) o.color = base.color;
    out.push(new TextRun(o));
  }
  return out;
}
const P = (o) => new Paragraph(o);
function bosSatir(n = 1, size = 24) { return Array.from({ length: n }, () => P({ children: [new TextRun({ text: '', size })] })); }
function ortali(text, { size = 24, bold = true, before = 0, after = 0, italics = false } = {}) {
  return P({ alignment: AlignmentType.CENTER, spacing: { before, after }, children: [new TextRun({ text, size, bold, italics })] });
}

function renderTable(item) {
  const header = item.header; const rows = item.rows;
  const ncol = Math.max(header ? header.length : 0, ...rows.map((r) => r.length));
  const lens = Array.from({ length: ncol }, (_, c) => {
    const all = [header, ...rows].filter(Boolean).map((r) => plain(r[c] || '').length);
    return Math.min(60, Math.max(...all)) + 8;
  });
  const top = lens.reduce((a, b) => a + b, 0);
  const widths = lens.map((l) => Math.round((METIN_GENISLIGI * l) / top));
  widths[widths.length - 1] += METIN_GENISLIGI - widths.reduce((a, b) => a + b, 0);
  const brd = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: brd, bottom: brd, left: brd, right: brd };
  const cell = (text, c, bas) => new TableCell({
    width: { size: widths[c], type: WidthType.DXA }, borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: bas ? { fill: 'E7E6E6', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [P({ style: 'TabloMetni', children: runs(text || '', item.ns, bas ? { bold: true } : {}) })],
  });
  const trs = [];
  if (header) trs.push(new TableRow({ tableHeader: true, children: header.map((h, c) => cell(h, c, true)) }));
  for (const r of rows) trs.push(new TableRow({ children: Array.from({ length: ncol }, (_, c) => cell(r[c] || '', c, false)) }));
  return [new Table({ width: { size: METIN_GENISLIGI, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: trs }),
    P({ style: 'TabloSonrasi', children: [] })];
}
function renderList(item) {
  return item.items.map((it) => {
    const sirali = /^\d/.test(it.marker);
    if (!sirali) return P({ style: 'ListeMetni', numbering: { reference: 'madde', level: it.level }, children: runs(it.text, item.ns) });
    const left = GIRINTI + it.level * 425;
    return P({ style: 'ListeMetni', indent: { left, hanging: 425 }, tabStops: [{ type: TabStopType.LEFT, position: left }],
      children: [new TextRun(it.marker + '\t'), ...runs(it.text, item.ns)] });
  });
}
const HL = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5];
const bolumBasligi = (s) => (BICIM.bolum_basligi.buyuk_harf ? upper(s) : s);
function renderModel(model) {
  const out = [];
  for (const it of model) {
    switch (it.k) {
      case 'h1': {
        const b = bolumBasligi(it.baslik);
        const ch = it.etiket ? [new TextRun(it.etiket), new TextRun({ text: b, break: 1 })] : [new TextRun(b)];
        out.push(P({ heading: HeadingLevel.HEADING_1, children: ch })); break;
      }
      case 'h': out.push(P({ heading: HL[it.lvl], children: runs(it.text, it.ns) })); break;
      case 'p': out.push(P({ style: 'Metin', children: runs(it.text, it.ns) })); break;
      case 'note': out.push(P({ style: 'Metin', children: runs(it.text, 'not', { italics: true }) })); break;
      case 'list': out.push(...renderList(it)); break;
      case 'quote': for (const p of it.paras) out.push(P({ style: 'Alinti', children: runs(p, it.ns) })); break;
      case 'table': out.push(...renderTable(it)); break;
      default: warn('Bilinmeyen model öğesi: ' + it.k);
    }
  }
  return out;
}

// ---------------------------------------------------------------- ön kısımlar
const baslikUst = upper(ANA.baslik);
function kapak(ic) {
  const k = AYAR.kapak; const ch = [];
  if (!ic && TASLAK_NOTU !== '-') {
    ch.push(P({
      alignment: AlignmentType.CENTER, spacing: { after: 360 },
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: 'C00000', space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: 'C00000', space: 4 },
        left: { style: BorderStyle.SINGLE, size: 8, color: 'C00000', space: 4 }, right: { style: BorderStyle.SINGLE, size: 8, color: 'C00000', space: 4 } },
      children: [new TextRun({ text: TASLAK_NOTU, size: 20, bold: true, color: 'C00000' })],
    }));
  } else if (ic) ch.push(P({ pageBreakBefore: true, spacing: { after: 360 }, children: [] }));
  for (const s of k.kurum || []) ch.push(ortali(s, { after: 60 }));
  if (k.anabilim_dali) ch.push(ortali(k.anabilim_dali, { before: 120, after: 60 }));
  if (k.program) ch.push(ortali(k.program, { after: 60 }));
  ch.push(ortali(baslikUst, { size: 28, before: ic ? 1200 : 1500, after: 240 }));
  if (ANA.altBaslik) ch.push(ortali(ANA.altBaslik, { size: 24, bold: false, after: 0 }));
  if (k.tez_turu) ch.push(ortali(k.tez_turu, { before: ic ? 720 : 1200, bold: false }));
  ch.push(ortali(k.ogrenci, { before: ic ? 480 : 1200 }));
  if (ic && (k.juri || []).length) {
    ch.push(ortali(k.juri_basligi || 'Tez Savunma Jürisi', { before: 600, after: 120 }));
    for (const [rol, ad] of k.juri) {
      ch.push(P({ spacing: { after: 40 }, indent: { left: CM(4) }, tabStops: [{ type: TabStopType.LEFT, position: CM(4) + CM(4.2) }],
        children: [new TextRun({ text: ad ? `${rol}\t: ${ad}` : rol, size: 24, italics: !ad })] }));
    }
  }
  ch.push(ortali(k.yer_yil, { before: ic ? 600 : 1500, bold: false }));
  return ch;
}
function onKisimBaslik(text) { return P({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
const YER_TUTUCU = { tr: '[Ana metin tamamlandıktan sonra yazılacaktır]', en: '[To be written after the main text is complete]' };
const OZ_DOSYA = path.join(birimKlasoru, BICIM.oz_dosyasi);
// Özet dosyası "## Özet", "## Anahtar Kelimeler", "## Abstract", "## Keywords" başlıklarına bölünür; başlık büyük/küçük harf
// ve sondaki boşluk gözetmeksizin eşlenir (BOM ve CRLF mdOku'da temizlenir).
const OZ_PARCALAR = (() => {
  if (!fs.existsSync(OZ_DOSYA)) return null;
  const m = new Map();
  for (const p of mdOku(OZ_DOSYA).replace(/<!--[\s\S]*?-->/g, '').split(/^##[ \t]+/m).slice(1)) {
    const i = p.indexOf('\n');
    const bas = lower((i < 0 ? p : p.slice(0, i)).replace(/\s*#*\s*$/, '').trim());
    if (!m.has(bas)) m.set(bas, i < 0 ? '' : p.slice(i + 1).trim());
  }
  return m;
})();
const ozBolum = (baslik) => (OZ_PARCALAR && OZ_PARCALAR.get(lower(baslik))) || null;
const OZET_EKSIK = []; // yer tutucu basılan özetler
const OZET_DILLERI = BICIM.ozet_dilleri.map((x) => lower(String(x)));
for (const d of OZET_DILLERI) if (d !== 'tr' && d !== 'en') warn(`bicim.ozet_dilleri: bilinmeyen dil "${d}" (geçerli: tr, en).`);
function ozet(ing, metinBasinda = false) {
  const dil = ing ? 'en' : 'tr';
  const ad = ing ? 'Abstract' : 'Özet', kAd = ing ? 'Keywords' : 'Anahtar Kelimeler';
  const baslikSatiri = metinBasinda ? [] : (ing && !AYAR.kapak.ingilizce_baslik ? [] : [ortali(ing ? AYAR.kapak.ingilizce_baslik : baslikUst, { size: 24, after: 360 })]);
  const metin = ozBolum(ad);
  const anahtar = ozBolum(kAd);
  const sinir = BICIM.ozet_kelime_siniri;
  const tekSatir = (x) => x.replace(/\s*\n\s*/g, ' ').trim();
  if (metin && anahtar) return [
    onKisimBaslik(ing ? OB.abstract : OB.ozet),
    ...baslikSatiri,
    ...metin.split(/\n\s*\n/).map(tekSatir).filter(Boolean).map((p) => P({ style: 'Metin', children: [new TextRun(ANAHTARLI_ATIF ? erisimSil(p, ad) : p)] })),
    P({ style: 'Metin', spacing: { before: 360 }, children: [new TextRun({ text: kAd + ': ', bold: true }), new TextRun(tekSatir(anahtar))] }),
  ];
  OZET_EKSIK.push(ad);
  if (!OZ_PARCALAR) warn(`Özet dosyası yok (${path.join(AYAR.birim_klasoru, BICIM.oz_dosyasi)}); ${ad} yerine yer tutucu basıldı.`);
  else warn(`${BICIM.oz_dosyasi}: "## ${metin ? kAd : ad}" başlığı bulunamadı veya altı boş; ${ad} yerine yer tutucu basıldı.`);
  return [
    onKisimBaslik(ing ? OB.abstract : OB.ozet),
    ...baslikSatiri,
    P({ style: 'Metin', children: [new TextRun({ text: YER_TUTUCU[dil], italics: true })] }),
    P({ style: 'Metin', children: [new TextRun({ text: ing ? `(The abstract should not exceed ${sinir} words.)` : `(Özet en fazla ${sinir} kelime olmalıdır.)`, italics: true, color: '595959' })] }),
    P({ style: 'Metin', spacing: { before: 360 }, children: [new TextRun({ text: kAd + ': ', bold: true }), new TextRun({ text: ing ? '[at least three keywords]' : '[en az üç anahtar kelime]', italics: true })] }),
  ];
}
function onsoz() {
  return [
    onKisimBaslik(OB.onsoz),
    P({ style: 'Metin', children: [new TextRun({ text: '[Çalışma bütünüyle tamamlandıktan sonra yazılacaktır.]', italics: true })] }),
    P({ alignment: AlignmentType.RIGHT, spacing: { before: 600 }, children: [new TextRun({ text: AYAR.kapak.ogrenci })] }),
    P({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: AYAR.kapak.yer_yil })] }),
  ];
}
function icindekiler() {
  const ch = [
    P({ style: 'OnKisimBasligi', children: [new TextRun(OB.icindekiler)] }),
    new TableOfContents('İçindekiler', { hyperlink: true, headingStyleRange: AYAR.icindekiler_duzeyleri, beginDirty: false }),
  ];
  if (YAZILMAMIS.length) {
    ch.push(P({ style: 'PlanSatiri', spacing: { before: 360, after: 60 }, children: [new TextRun({ text: 'Henüz yazılmamış kısımlar', bold: true })] }));
    ch.push(P({ style: 'PlanSatiri', spacing: { after: 120 }, children: [new TextRun({ text: '(Geçici plana göre; bu ara sürümde yer almaz ve sayfa numarası yoktur.)', italics: true, size: 20 })] }));
    for (const y of YAZILMAMIS) ch.push(P({ style: 'PlanSatiri', indent: { left: y.duzey === 1 ? 0 : CM(0.5) }, children: [new TextRun(y.metin + ' '), new TextRun({ text: '[henüz yazılmadı]', italics: true })] }));
  }
  return ch;
}
function kisaltmalar() {
  const ch = [onKisimBaslik(OB.kisaltmalar)];
  const tb = ANA.kisaltmalar;
  if (!tb) { warn('Ana metinde Kısaltmalar tablosu bulunamadı.'); return ch; }
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const b = { top: none, bottom: none, left: none, right: none };
  const w = [CM(3.5), METIN_GENISLIGI - CM(3.5)];
  const rows = tb.rows.map((r) => new TableRow({ children: r.slice(0, 2).map((c, i) => new TableCell({
    width: { size: w[i], type: WidthType.DXA }, borders: b, margins: { top: 20, bottom: 20, left: 60, right: 60 },
    children: [P({ style: 'KisaltmaSatiri', children: runs(c, 'G', i === 0 ? { bold: false } : {}) })] })) }));
  ch.push(new Table({ width: { size: METIN_GENISLIGI, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows }));
  return ch;
}
function okumaNotu() {
  const ch = [onKisimBaslik(OB.okuma_notu)];
  if (ANA.nitelik) ch.push(P({ style: 'Metin', children: [new TextRun({ text: ANA.nitelik, italics: true })] }));
  if (ANA.durumTarihi) ch.push(P({ style: 'Metin', children: [new TextRun({ text: BICIM.durum_tarihi_etiketi + ': ', bold: true }), new TextRun(ANA.durumTarihi)] }));
  for (const p of ANA.okumaNotu) ch.push(P({ style: 'Metin', children: runs(p, 'G') }));
  return ch;
}
const ATIFSIZ = [];     // kaynakçada olup atıf yapılmayan anahtarlar
const AYNI_ETIKET = []; // harf verilemeyen etiket çakışmaları
function kaynakca() {
  const ch = [P({ heading: HeadingLevel.HEADING_1, children: [new TextRun(OB.kaynakca)] })];
  if (NUMARALI) {
    // Atıf sırasıyla numaralı tek liste; atıf yapılmayan künyeler alınmaz, uyarılır.
    ATIF.sira.forEach((a, i) => {
      const e = ANAHTARLI.get(a);
      ch.push(P({ style: 'Kaynakca', children: [new TextRun(BICIM.atif.kaynakca_numara_bicimi.replace('{n}', i + 1)), ...runs(e.text, 'kaynakça', {}, true)] }));
    });
    for (const [a, e] of ANAHTARLI) if (!ATIF.no.has(a)) { ATIFSIZ.push(a); warn(`Kaynakçada olup metinde atıf yapılmayan künye alınmadı: [@${a}] (${e.kaynak})`); }
    return ch;
  }
  if (YAZAR_TARIH) {
    // Alfabetik liste (kategoriler tanımlıysa kategorili); girdilerde anahtar ve numara yok. Atıf yapılmayan künye alınmaz.
    // Otomatik harften sonra hâlâ aynı etiketi üreten eserler: yazar listeleri farklı ama kısaltılmış etiket aynı.
    const ayni = new Map();
    for (const a of ATIF.sira) { const k = etiketMetni(etiketAl(a)); ayni.set(k, [...(ayni.get(k) || []), a]); }
    for (const [k, an] of ayni) if (an.length > 1) {
      AYNI_ETIKET.push({ etiket: k, anahtarlar: an });
      warn(`Yazar–tarih: ${an.map((a) => `[@${a}]`).join(', ')} aynı etiketi üretiyor (${k}); yazar listeleri farklı olduğu için harf verilmedi. Ayırt edecek etiketi {Etiket, yıl} ile elle verin.`);
    }
    const gr = new Map();
    for (const a of ATIF.sira) { const e = ANAHTARLI.get(a); const c = KATEGORILER.length ? katAdi(e.cat) : ''; gr.set(c, [...(gr.get(c) || []), e]); }
    for (const c of [...gr.keys()].sort((x, y) => katSirasi(x) - katSirasi(y))) {
      if (c) ch.push(P({ heading: HeadingLevel.HEADING_2, children: [new TextRun(baslikHarfi(c))] }));
      for (const e of gr.get(c).sort((x, y) => COLL.compare(sortKey(x), sortKey(y)))) ch.push(P({ style: 'Kaynakca', children: runs(e.text, 'kaynakça', {}, true) }));
    }
    for (const [a, e] of ANAHTARLI) if (!ATIF.no.has(a)) { ATIFSIZ.push(a); warn(`Kaynakçada olup metinde atıf yapılmayan künye alınmadı: [@${a}] (${e.kaynak})`); }
    return ch;
  }
  const kats = Object.keys(BIB_KAT).sort((a, b) => katSirasi(a) - katSirasi(b));
  const tekListe = !KATEGORILER.length;
  for (const c of kats) {
    if (!tekListe) ch.push(P({ heading: HeadingLevel.HEADING_2, children: [new TextRun(baslikHarfi(c))] }));
    for (const e of BIB_KAT[c]) ch.push(P({ style: 'Kaynakca', children: runs(e.text, 'kaynakça', {}, true) }));
  }
  return ch;
}

// ---------------------------------------------------------------- belgeyi kur
const metinGovde = renderModel(MODEL);
// Ön kısımlarda dipnot yoktur; sıra ayarlardaki "on_kisim" listesidir (Marmara örneği: kılavuz 8.4).
const ON_KISIM_URET = { ozet: () => ozet(false), abstract: () => ozet(true), onsoz, icindekiler, kisaltmalar, okuma_notu: okumaNotu };
// "ozet_dilleri" dışındaki özet basılmaz.
const onKisimDahil = (ad) => !!ON_KISIM_URET[ad] && !(ad === 'ozet' && !OZET_DILLERI.includes('tr')) && !(ad === 'abstract' && !OZET_DILLERI.includes('en'));
const onKisim = [];
for (const ad of BICIM.on_kisim) {
  if (!ON_KISIM_URET[ad]) { warn(`Bilinmeyen ön kısım "${ad}" atlandı (geçerli: ${Object.keys(ON_KISIM_URET).join(', ')}).`); continue; }
  if (!onKisimDahil(ad)) continue;
  onKisim.push(...ON_KISIM_URET[ad]());
}
// Kapak yoksa (ör. dergi makalesi) başlık metnin başına yazılır.
const taslakKutusu = () => P({
  alignment: AlignmentType.CENTER, spacing: { after: 360 },
  border: Object.fromEntries(['top', 'bottom', 'left', 'right'].map((k) => [k, { style: BorderStyle.SINGLE, size: 8, color: 'C00000', space: 4 }])),
  children: [new TextRun({ text: TASLAK_NOTU, size: 20, bold: true, color: 'C00000' })],
});
const baslikBlogu = BICIM.kapaklar ? [] : [
  ...(TASLAK_NOTU !== '-' ? [taslakKutusu()] : []),
  ortali(ANA.baslik, { size: SZ(BICIM.bolum_basligi.punto) + 4, after: 240 }),
  ...(ANA.altBaslik ? [ortali(ANA.altBaslik, { size: SZ(BICIM.bolum_basligi.punto), bold: false, after: 360 })] : []),
];
const OZET_BASTA = BICIM.ozet_metin_basinda ? OZET_DILLERI.filter((d) => d === 'tr' || d === 'en') : [];
const ozetBlogu = OZET_BASTA.flatMap((d) => ozet(d === 'en', true));

const footnotes = {};
for (const key of FN.sira) {
  const n = FN.no.get(key); const ns = key.split(':')[0];
  footnotes[n] = { children: [P({ style: 'FootnoteText', children: [new TextRun(' '), ...runs(ALL_DEFS.get(key), ns, {}, true)] })] };
}
const kullanilmayan = [...ALL_DEFS.keys()].filter((k) => !FN.no.has(k));
for (const k of kullanilmayan) warn(`Metinde referansı olmayan dipnot tanımı (Word'e aktarılmadı): ${k}`);

// Kaynakça en son kurulur: dipnotlardaki ve ön kısımlardaki atıflar da kaynakçaya girer.
const anaGovde = [...metinGovde, ...kaynakca()];
// Word bölümleri: kapaklar (numarasız), ön kısım (i, ii…), metin (1, 2…). Olmayan kısım atlanır.
const BOLUM_YAPISI = [];
if (BICIM.kapaklar) BOLUM_YAPISI.push({ altbilgi: false, fmt: null, icerik: [...kapak(false), ...kapak(true)] });
if (onKisim.length) BOLUM_YAPISI.push({ altbilgi: true, fmt: 'lowerRoman', icerik: onKisim });
BOLUM_YAPISI.push({ altbilgi: true, fmt: 'decimal', icerik: [...baslikBlogu, ...ozetBlogu, ...anaGovde] });

const BM = BICIM.metin, BD = BICIM.dipnot, BB = BICIM.bolum_basligi, BA = BICIM.alt_baslik;
const BEKLENEN_BICIM = {
  sayfa: { w: SAYFA.size.width, h: SAYFA.size.height, ...SAYFA.margin },
  yazi_tipi: FONT,
  metin: { sz: SZ(BM.punto), line: Math.round(240 * BM.satir_carpani), before: NK(BM.once_nk), after: NK(BM.sonra_nk), iki_yana: BM.iki_yana },
  dipnot: { sz: SZ(BD.punto), line: NK(BD.satir_nk), iki_yana: BD.iki_yana },
  bolum_basligi: { sz: SZ(BB.punto), before: NK(BB.once_nk), after: NK(BB.sonra_nk), yeni_sayfa: BB.yeni_sayfa, buyuk_harf: BB.buyuk_harf },
  alt_baslik: { sz: SZ(BA.punto), before: NK(BA.once_nk), after: NK(BA.sonra_nk) },
  sayfa_numarasi_sz: SZ(BICIM.sayfa_numarasi_punto),
  baslik_numaralandirma: BICIM.baslik_numaralandirma,
};
const altbilgi = () => new Footer({ children: [P({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: BEKLENEN_BICIM.sayfa_numarasi_sz, font: FONT })] })] });
const HIZA = (iki) => (iki ? AlignmentType.JUSTIFIED : AlignmentType.LEFT);
const metinPar = { alignment: HIZA(BM.iki_yana), indent: { firstLine: GIRINTI }, spacing: { before: NK(BM.once_nk), after: NK(BM.sonra_nk), line: BEKLENEN_BICIM.metin.line, lineRule: LineRuleType.AUTO } };
const altBaslik = { run: { font: FONT, size: SZ(BA.punto), bold: true, color: '000000', italics: false }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: NK(BA.once_nk), after: NK(BA.sonra_nk), line: 240, lineRule: LineRuleType.AUTO }, keepNext: true, keepLines: true } };
const doc = new Document({
  creator: 'ara_surum_uret.js',
  title: ANA.baslik,
  description: 'Ara sürüm ' + TARIH,
  footnotes,
  numbering: { config: [{ reference: 'madde', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: GIRINTI, hanging: 425 } } } },
    { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: GIRINTI + 425, hanging: 425 } } } },
  ] }] },
  styles: {
    default: {
      document: { run: { font: FONT, size: SZ(BM.punto), language: { value: BICIM.dil } }, paragraph: { spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO } } },
      heading1: { run: { font: FONT, size: SZ(BB.punto), bold: true, color: '000000', italics: false }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: NK(BB.once_nk), after: NK(BB.sonra_nk), line: 240, lineRule: LineRuleType.AUTO }, pageBreakBefore: BB.yeni_sayfa, keepNext: true, keepLines: true } },
      heading2: altBaslik, heading3: altBaslik, heading4: altBaslik, heading5: altBaslik,
      footnoteText: { run: { font: FONT, size: SZ(BD.punto) }, paragraph: { alignment: HIZA(BD.iki_yana), spacing: { before: 0, after: 0, line: NK(BD.satir_nk), lineRule: LineRuleType.EXACT } } },
      footnoteReference: { run: { superScript: true } },
    },
    paragraphStyles: [
      { id: 'Metin', name: 'Metin (Gövde)', basedOn: 'Normal', next: 'Metin', quickFormat: true, run: { font: FONT, size: SZ(BM.punto) }, paragraph: metinPar },
      { id: 'ListeMetni', name: 'Liste Metni (Gövde)', basedOn: 'Normal', next: 'Metin', run: { font: FONT, size: SZ(BM.punto) }, paragraph: { ...metinPar, indent: { left: GIRINTI, hanging: 425 }, spacing: { before: 60, after: 60, line: BEKLENEN_BICIM.metin.line, lineRule: LineRuleType.AUTO } } },
      { id: 'Alinti', name: 'Blok Alıntı (Gövde)', basedOn: 'Normal', next: 'Metin', run: { font: FONT, size: SZ(BM.punto) }, paragraph: { ...metinPar, indent: { left: GIRINTI, right: GIRINTI, firstLine: 0 } } },
      { id: 'TabloMetni', name: 'Tablo Metni', basedOn: 'Normal', run: { size: SZ(BICIM.tablo_punto) }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO } } },
      { id: 'TabloSonrasi', name: 'Tablo Sonrası Boşluk', basedOn: 'Normal', run: { size: 12 }, paragraph: { spacing: { before: 0, after: 120 } } },
      { id: 'KisaltmaSatiri', name: 'Kısaltma Satırı', basedOn: 'Normal', run: { size: SZ(BM.punto) }, paragraph: { spacing: { before: 0, after: 40, line: 240, lineRule: LineRuleType.AUTO } } },
      { id: 'Kaynakca', name: 'Kaynakça Girdisi', basedOn: 'Normal', run: { size: SZ(BM.punto) }, paragraph: { alignment: AlignmentType.LEFT, indent: { left: GIRINTI, hanging: GIRINTI }, spacing: { before: 0, after: 120, line: 240, lineRule: LineRuleType.AUTO } } },
      { id: 'OnKisimBasligi', name: 'Ön Kısım Başlığı (içindekilere girmez)', basedOn: 'Normal', run: { size: SZ(BB.punto), bold: true }, paragraph: { alignment: AlignmentType.CENTER, pageBreakBefore: true, spacing: { before: NK(BB.once_nk), after: NK(BB.sonra_nk) }, keepNext: true } },
      { id: 'PlanSatiri', name: 'Plan Satırı', basedOn: 'Normal', run: { size: SZ(BM.punto) }, paragraph: { spacing: { before: 0, after: 40 } } },
      { id: 'TOC1', name: 'toc 1', basedOn: 'Normal', next: 'Normal', run: { size: SZ(BM.punto), bold: true }, paragraph: { spacing: { before: 120, after: 40 } } },
      { id: 'TOC2', name: 'toc 2', basedOn: 'Normal', next: 'Normal', run: { size: SZ(BM.punto) }, paragraph: { indent: { left: CM(0.5) }, spacing: { after: 30 } } },
      { id: 'TOC3', name: 'toc 3', basedOn: 'Normal', next: 'Normal', run: { size: SZ(BM.punto) }, paragraph: { indent: { left: CM(1.0) }, spacing: { after: 30 } } },
      { id: 'TOC4', name: 'toc 4', basedOn: 'Normal', next: 'Normal', run: { size: SZ(BM.punto) - 1 }, paragraph: { indent: { left: CM(1.5) }, spacing: { after: 30 } } },
    ],
  },
  sections: BOLUM_YAPISI.map((b) => ({
    properties: { page: b.fmt ? { ...SAYFA, pageNumbers: { start: 1, formatType: b.fmt === 'lowerRoman' ? NumberFormat.LOWER_ROMAN : NumberFormat.DECIMAL } } : SAYFA },
    ...(b.altbilgi ? { footers: { default: altbilgi() } } : {}),
    children: b.icerik,
  })),
});

// ---------------------------------------------------------------- doğrulama beklentileri ve rapor
function devirProbes() {
  const included = [];
  for (const it of MODEL) included.push(...textsOf(it).map(plain));
  for (const p of ANA.okumaNotu) included.push(plain(p));
  for (const v of ALL_DEFS.values()) included.push(plain(v));
  for (const e of tumBib) included.push(plain(e.text));
  const hay = included.join('\n');
  const probes = [];
  const yoklanacak = [...(GIRIS_BIRIMI ? [GIRIS_BIRIMI] : []), ...BOLUMLER.flatMap((b) => b.birimVeri.map((u) => u.veri)).filter(Boolean)];
  for (const v of yoklanacak) {
    const u = { kod: v.kod, veri: v };
    probes.push({ birim: u.kod, metin: 'Orkestratöre devir notu' });
    probes.push({ birim: u.kod, metin: 'Yoğunlaştırma notu' });
    for (const l of u.veri.devirSatirlari) {
      if (/^\s*\|?\s*:?-{3,}/.test(l) || /^\s*$/.test(l)) continue;
      let t = l.replace(/^#+\s*/, '').replace(/^\s*([-*+]|\d+[.)])\s+/, '');
      if (/^\s*\|/.test(l)) t = l.split('|').map((c) => c.trim()).sort((a, b) => b.length - a.length)[0];
      t = plain(t);
      const baslik = /^#/.test(l);
      if (t.length < (baslik ? 8 : 25)) continue;
      const s = t.slice(0, 60);
      if (!hay.includes(s)) probes.push({ birim: u.kod, metin: s });
    }
  }
  return probes;
}
const beklenen = {
  uretim: new Date().toISOString(),
  tarih: TARIH,
  dipnot_tanimi_toplam: [...Object.values(KAYNAK_SAYIM)].reduce((a, b) => a + b.tanim, 0),
  dipnot_tanimi_kaynak: Object.fromEntries(Object.entries(KAYNAK_SAYIM).map(([k, v]) => [k, v.tanim])),
  word_dipnot_beklenen: FN.sayac,
  tekrarlanan_referans: FN.tekrar,
  referans_toplam: [...REF_SAYISI.values()].reduce((a, b) => a + b, 0),
  eksik_tanim: FN.eksik,
  kullanilmayan_tanim: kullanilmayan,
  atif_turu: BICIM.atif.tur,
  eksik_anahtar: [...new Set(ATIF.eksik)], // kaynakçada karşılığı olmayan atıf anahtarları (dogrula.js: boş değilse KALDI)
  numarali_atif: NUMARALI ? { kaynak: ATIF.sira.length, eksik_anahtar: [...new Set(ATIF.eksik)] } : null,
  yazar_tarih_atif: YAZAR_TARIH ? { kaynak: ATIF.sira.length, otomatik_harf: OTOMATIK_HARF } : null,
  atif_metinleri: [...ATIF_METINLERI],
  etiket_turetilemedi: [...new Set(ETIKET_YOK)], // yazar–tarih etiketi künyeden çıkarılamayan anahtarlar (dogrula.js: boş değilse KALDI)
  ayni_etiket: AYNI_ETIKET, // harf verilemeyen etiket çakışmaları; metinde iki eser aynı görünür (dogrula.js: boş değilse KALDI)
  h1: [
    ...BICIM.on_kisim.filter((ad) => ad !== 'icindekiler' && onKisimDahil(ad)).map((ad) => OB[ad]),
    ...OZET_BASTA.map((d) => (d === 'en' ? OB.abstract : OB.ozet)),
    ...MODEL.filter((x) => x.k === 'h1').map((x) => (x.etiket ? `${x.etiket} ${bolumBasligi(x.baslik)}` : bolumBasligi(x.baslik))),
    OB.kaynakca,
  ],
  bolum_yapisi: BOLUM_YAPISI.map((b) => ({ altbilgi: b.altbilgi, fmt: b.fmt })),
  kapak_sayfasi: BICIM.kapaklar ? 2 : 0,
  icindekiler: BICIM.on_kisim.includes('icindekiler'),
  kaynakca_kategorileri: KATEGORILER.map(baslikHarfi),
  giris_basligi: bolumBasligi(AMB.giris),
  bicim: BEKLENEN_BICIM,
  devir_yoklamalari: devirProbes(),
};
// beklenen.json ve rapor .docx başarıyla yazıldıktan sonra yazılır (aşağıda); yarım üretim eski .docx'e yeni beklenti bırakmaz.
const beklenenYol = path.join(KAYIT_DIR, CIKTI_ADI + '_beklenen.json');

/**
 * Kullanıcıya bildirilecek sınırlar: her satır ne, neden ve kullanıcının ne yapabileceği. Üretim çıktısının sonunda ve
 * raporun başında aynı blok yazılır; uret.sh "@@BILDIRIM=" satırlarını kendi bildirimleriyle tek blokta birleştirir.
 */
function bildirimler() {
  const B = [];
  const ekle = (ne, neden, yap) => B.push(`${ne} — Neden: ${neden} Yapılabilecek: ${yap}`);
  const liste = (x, n = 6) => x.slice(0, n).join('; ') + (x.length > n ? `; ve ${x.length - n} tane daha` : '');
  if (AYAR._durum) ekle(`Biçim ayarları geçici ("_durum": ${String(AYAR._durum).replace(/[.\s]+$/, '')}).`, 'Ayarlar kurum veya dergi kılavuzunun resmî metniyle doğrulanmadı; çıktının biçimi kılavuza uymayabilir.', 'Kılavuzu okuyup ayarlar.json "bicim" alanını düzeltin, sonra "_durum" alanını silin.');
  const eksikAnahtar = [...new Set(ATIF.eksik)];
  if (eksikAnahtar.length) ekle(`Kaynakçada karşılığı olmayan atıf anahtarı: ${liste(eksikAnahtar.map((a) => '[@' + a + ']'))}.`, 'Künye birim veya ana kaynakçada yok ya da anahtar yanlış yazılmış; Word\'de "?anahtar" basıldı, doğrulama KALDI verir.', 'Künyeyi "- [@anahtar] Künye" diye kaynakçaya ekleyin veya metindeki anahtarı düzeltin.');
  const yok = [...new Set(ETIKET_YOK)];
  if (yok.length) ekle(`Yazar–tarih etiketi türetilemeyen künye: ${liste(yok.map((a) => '[@' + a + ']'))}.`, 'Künye APA ("Soyad, A. (2020). Başlık…") veya Vancouver ("Soyad A, Soyad B. Başlık. Dergi. 2020;…") biçiminde değil; Word\'de etiket yerine anahtar basıldı, doğrulama KALDI verir.', 'Künyeyi bu biçimlerden birine göre düzeltin ya da "- [@anahtar] {Yazar, yıl} Künye" diye elle etiket yazın.');
  if (OTOMATIK_HARF.length) ekle(`Otomatik harf verildi: ${liste(OTOMATIK_HARF.map((x) => `[@${x.anahtar}] → ${x.etiket}`), 8)}.`, 'Aynı yazar(lar)ın aynı yıldaki eserleri (APA 7); harf künyedeki başlığa göre alfabetik verildi, metinde ve kaynakçada birlikte uygulandı.', 'Sıra uygunsa bir şey gerekmez; başka sıra için künyede yılı kendiniz "(2018a)" diye yazın.');
  if (ERISIM_METIN.length) ekle(`Metinde ${ERISIM_METIN.length} erişim etiketi silindi; kaynakça girdisine taşıyın: ${liste(ERISIM_METIN, 3)}.`, 'Erişim etiketi ("[tam metin]", "[özet]", "[bibliyografik]", "[ikincil aktarım]") gövde metninde değil kaynakça girdisinin sonunda durur; Word çıktısından silindi.', 'Etiketi metinden silip ilgili künyenin sonuna yazın: "- [@anahtar] Künye. [tam metin]".');
  if (ERISIM_ATIF.length) ekle(`Atıf içinde erişim etiketi bulundu (${ERISIM_ATIF.length} atıf): ${liste(ERISIM_ATIF, 4)}.`, 'Erişim etiketi ("tam metin", "özet", "bibliyografik", "ikincil aktarım") yer bilgisi değildir, kaynakça girdisinin sonunda durur; Word çıktısında atıftan düşürüldü, kalan yer bilgisi korundu.', 'Etiketi atıftan silip kaynakça girdisinin sonuna taşıyın: "- [@anahtar] Künye. [tam metin]".');
  if (AYNI_ETIKET.length) ekle(`Aynı etiketi üreten farklı eserler: ${liste(AYNI_ETIKET.map((x) => `${x.etiket} (${x.anahtarlar.map((a) => '@' + a).join(', ')})`))}.`, 'Yazar listeleri farklı ama kısaltılmış etiket aynı; APA 7 ayırt edecek kadar çok yazar adı yazılmasını ister, araç bunu yapmaz.', 'Bu eserlere "{Yazar, yıl}" ile ayırt edici elle etiket verin.');
  if (BIB.supheli.length) ekle(`${BIB.supheli.length} şüpheli kaynakça eşleşmesi karar bekliyor.`, 'Benzer künyeler aynı eser olabilir; araç emin olmadığı için birleştirmedi.', 'Rapordaki "ŞÜPHELİ EŞLEŞMELER" listesine bakıp kaynakca_eslestirme.json içinde "birlestir" veya "ayri_tut" ile karar verin.');
  if (YAZILMAMIS.length) ekle(`Henüz yazılmamış ${YAZILMAMIS.length} kısım: ${liste(YAZILMAMIS.map((y) => y.metin), 4)}.`, 'Birim dosyası yok.', `Kısım yazılıp birleştirilince yeniden üretin; bu sürümde ${ICINDEKILER_VAR ? 'İçindekiler altında listelendi' : 'başlığı ve "henüz yazılmamıştır" notuyla görünür'}.`);
  if (ATIFSIZ.length) ekle(`Kaynakçada olup metinde atıf yapılmayan ${ATIFSIZ.length} künye çıktıya alınmadı: ${liste(ATIFSIZ.map((a) => '[@' + a + ']'))}.`, 'Anahtarlı atıfta kaynakçaya yalnız atıf yapılan eserler girer.', 'Eser gerekiyorsa metinde atıf yapın; gerekmiyorsa künyeyi kaynakçadan silin.');
  if (OZET_EKSIK.length) ekle(`${OZET_EKSIK.join(' ve ')} yerine yer tutucu basıldı.`, `${BICIM.oz_dosyasi} yok ya da ilgili "## Özet"/"## Abstract" veya anahtar kelime başlığı eksik.`, `Özet yazılınca ${path.join(AYAR.birim_klasoru, BICIM.oz_dosyasi)} dosyasına başlıklarıyla ekleyip yeniden üretin.`);
  return B;
}
function bildirimBlogu(B) {
  return ['KULLANICIYA BİLDİRİLECEKLER', ...(B.length ? B.map((b, i) => `  ${i + 1}. ${b}`) : ['  Bildirilecek sınır yok.'])];
}
function raporYaz() {
  const L = [];
  L.push(`Ara sürüm üretim raporu — ${new Date().toLocaleString('tr-TR')}`);
  L.push(`Çıktı: ${CIKTI_DOCX}`);
  L.push('');
  L.push(...bildirimBlogu(bildirimler()));
  L.push('');
  L.push(`Taslak notu: ${TASLAK_NOTU}`);
  L.push('');
  L.push('KAYNAK DOSYALAR');
  for (const [k, v] of Object.entries(KAYNAK_SAYIM)) L.push(`  ${k}: ${v.dosya} — dipnot tanımı ${v.tanim}${v.dagilim ? ' (' + Object.entries(v.dagilim).map(([a, n]) => `${a} ${n}`).join(', ') + ')' : ''}${v.devir_satir !== undefined ? `, devir notu satırı (alınmadı) ${v.devir_satir}` : ''}`);
  for (const b of BOLUMLER) for (const u of b.birimVeri) if (!u.veri) L.push(`  ${u.kod} (${u.kisimlar}): dosya yok — henüz yazılmamış sayıldı`);
  L.push('');
  L.push('DİPNOTLAR');
  L.push(`  Kaynaklardaki dipnot tanımı: ${beklenen.dipnot_tanimi_toplam}`);
  L.push(`  Word'e aktarılan dipnot: ${FN.sayac}`);
  L.push(`  Metindeki dipnot referansı (toplam): ${beklenen.referans_toplam}; aynı dipnota tekrar eden referans (NOTEREF alanı): ${FN.tekrar}`);
  L.push(`  Tanımı olmayan referans: ${FN.eksik.length}; referansı olmayan tanım: ${kullanilmayan.length}`);
  if (ANAHTARLI_ATIF) L.push(`  ${ATIF_ADI}: ${ATIF.sira.length} kaynak ${NUMARALI ? 'numaralandı' : 'etiketlendi'}; kaynakçada karşılığı olmayan anahtar: ${[...new Set(ATIF.eksik)].join(', ') || 'yok'}`);
  L.push('');
  L.push('KAYNAKÇA TEKİLLEŞTİRME');
  L.push(`  Girdi künye sayısı: ${tumBib.length}; tekilleştirme sonrası: ${ANAHTARLI_ATIF ? `${ANAHTARLI.size} anahtar (${lower(ATIF_ADI)}; tekilleştirme anahtara göre)` : BIB.gruplar.length}`);
  for (const c of Object.keys(BIB_KAT).sort((a, b) => katSirasi(a) - katSirasi(b))) L.push(`    ${c}: ${BIB_KAT[c].length}`);
  L.push('  Birleştirilen künyeler (görünen künye "=>" ile):');
  for (const g of BIB.gruplar.filter((x) => x.uyeler.length > 1).sort((a, b) => katSirasi(a.temsil.cat) - katSirasi(b.temsil.cat) || COLL.compare(sortKey(a.temsil), sortKey(b.temsil)))) {
    const ayni = new Set(g.uyeler.map((e) => e.text)).size === 1;
    L.push(`   => [${g.temsil.kaynak}] ${stripBib(g.temsil.text)}`);
    L.push(`      kaynaklar: ${g.uyeler.map((e) => e.kaynak).join(', ')}; ölçüt: ${ayni ? 'birebir aynı' : g.neden.join(', ')}`);
    if (!ayni) for (const e of g.uyeler) if (e !== g.temsil && e.text !== g.temsil.text) L.push(`      ~ [${e.kaynak}] ${stripBib(e.text)}`);
  }
  L.push('  Elle birleştirilenler (kaynakca_eslestirme.json):');
  for (const x of BIB.elle) L.push(`    - ${x.g.gerekce}`);
  if (!BIB.elle.length) L.push('    (yok)');
  L.push('  ŞÜPHELİ EŞLEŞMELER (birleştirilmedi; gerekirse kaynakca_eslestirme.json ile karar verin):');
  for (const s of BIB.supheli) {
    L.push(`    ? ${s.neden}`);
    L.push(`      [${s.a.uyeler.map((e) => e.kaynak).join(',')}] ${stripBib(s.a.temsil.text)}`);
    L.push(`      [${s.b.uyeler.map((e) => e.kaynak).join(',')}] ${stripBib(s.b.temsil.text)}`);
  }
  if (!BIB.supheli.length) L.push('    (yok)');
  L.push('');
  L.push('YAPI');
  L.push('  Bölüm başlıkları (Başlık 1): ' + beklenen.h1.join(' | '));
  L.push(`  Henüz yazılmamış kısımlar (${ICINDEKILER_VAR ? 'İçindekiler altında listelendi' : 'bölüm başlığı ve notuyla metne kondu'}):`);
  for (const y of YAZILMAMIS) L.push(`    - ${y.metin}`);
  L.push('');
  L.push('NOTLAR');
  for (const r of RAPOR) L.push('  - ' + r);
  L.push('');
  L.push(`UYARILAR (${UYARILAR.length})`);
  for (const u of UYARILAR) L.push('  - ' + u);
  return L.join('\n') + '\n';
}

/**
 * Son işlem: docx-js içindekiler tablosunun sayfa alanlarını "dirty" yazar; Word bu durumda açılışta
 * "alanları güncelleştirmek istiyor musunuz?" diye sorar ve otomasyonu durdurur. Bu işaretler kaldırılır;
 * içindekiler uret.sh içinde Word ile güncellenir.
 */
async function sonIslem(buf) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file('word/document.xml').async('string');
  const kirli = (xml.match(/ w:dirty="true"/g) || []).length;
  xml = xml.replace(/ w:dirty="true"/g, '');
  zip.file('word/document.xml', xml);
  RAPOR.push(`İçindekiler alanındaki ${kirli} "dirty" işareti kaldırıldı (Word açılışta soru sormasın diye).`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

Packer.toBuffer(doc).then(sonIslem).then((buf) => {
  fs.mkdirSync(path.dirname(CIKTI_DOCX), { recursive: true });
  fs.mkdirSync(KAYIT_DIR, { recursive: true });
  fs.writeFileSync(CIKTI_DOCX, buf);
  fs.writeFileSync(beklenenYol, JSON.stringify(beklenen, null, 2));
  const raporYol = path.join(KAYIT_DIR, CIKTI_ADI + '_rapor.txt');
  fs.writeFileSync(raporYol, raporYaz());
  console.log(`Yazıldı: ${CIKTI_DOCX}`);
  console.log(`Rapor: ${raporYol}`);
  console.log(`Beklenenler: ${beklenenYol}`);
  console.log(`Dipnot: kaynak tanımı ${beklenen.dipnot_tanimi_toplam}, Word dipnotu ${FN.sayac}, tekrar referansı ${FN.tekrar}; kaynakça ${tumBib.length} → ${ANAHTARLI_ATIF ? ATIF.sira.length + (NUMARALI ? ' numaralı' : ' yazar–tarih') : BIB.gruplar.length}; şüpheli eşleşme ${BIB.supheli.length}; uyarı ${UYARILAR.length}`);
  const B = bildirimler();
  console.log('');
  console.log(bildirimBlogu(B).join('\n'));
  // uret.sh için makinece okunur satırlar
  for (const b of B) console.log(`@@BILDIRIM=${b}`);
  console.log(`@@CIKTI_DOCX=${CIKTI_DOCX}`);
  console.log(`@@BEKLENEN=${beklenenYol}`);
  console.log(`@@RAPOR=${raporYol}`);
}).catch((e) => { console.error(`HATA: .docx yazılamadı: ${e.message}`); process.exit(1); });
