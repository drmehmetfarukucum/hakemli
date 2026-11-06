#!/usr/bin/env node
/*
 * dogrula.js — üretilen .docx (ve varsa PDF metni) üzerinde biçim denetimleri.
 *
 *   node dogrula.js <docx> <beklenen.json> [--pdf-metin <pdf_metin.txt>] [--taslak]
 *
 * Seçenekler konumdan bağımsızdır. --taslak: Word adımı yapılmadı (uret.sh --word-yok); Word'ün dolduracağı içindekiler
 * sayfa numaraları denetimi KALDI yerine ERTELENDİ yazılır ve sonuç satırında ayrıca sayılır.
 *
 * Denetimler: dipnot sayısı ve eşleşmesi, tekrarlanan dipnot referansları (NOTEREF), Markdown kalıntısı,
 * devir notu kalıntısı, başlık hiyerarşisi, bölümler ve sayfa numaralandırması, sayfa yapısı, stiller,
 * içindekiler alanı; PDF metni verilirse sayfa numarası dizisi. Beklenen biçim değerleri (sayfa, yazı tipi,
 * punto, boşluklar, numaralandırma) ara_surum_uret.js'in yazdığı beklenen.json içindeki "bicim" alanındadır.
 * Çıkış kodu: 0 = bütün denetimler geçti (ertelenenler hariç), 1 = en az bir denetim başarısız, 2 = girdi okunamadı.
 */
'use strict';
const fs = require('fs');
const JSZip = require('jszip');

function hataCik(msg) { console.error('HATA: ' + msg); process.exit(2); }
const KONUM = []; let pdfMetinYol = null; let TASLAK = false;
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pdf-metin') { if (a[i + 1] === undefined || a[i + 1].startsWith('--')) hataCik('--pdf-metin bir dosya yolu bekliyor.'); pdfMetinYol = a[++i]; }
    else if (a[i] === '--taslak') TASLAK = true;
    else if (a[i].startsWith('--')) hataCik(`Bilinmeyen seçenek: ${a[i]} (geçerli: --pdf-metin, --taslak)`);
    else KONUM.push(a[i]);
  }
}
if (KONUM.length !== 2) { console.error('Kullanım: node dogrula.js <docx> <beklenen.json> [--pdf-metin dosya] [--taslak]'); process.exit(2); }
const [docxYol, beklenenYol] = KONUM;
if (pdfMetinYol && !fs.existsSync(pdfMetinYol)) hataCik(`PDF metin dosyası yok: ${pdfMetinYol}`);
let B;
try { B = JSON.parse(fs.readFileSync(beklenenYol, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { hataCik(`beklenen.json okunamadı (${beklenenYol}): ${e.message}`); }
if (!B || typeof B !== 'object' || Array.isArray(B)) hataCik(`beklenen.json (${beklenenYol}) bir JSON nesnesi olmalı.`);
{
  const eksik = [['dipnot_tanimi_toplam', 'number'], ['dipnot_tanimi_kaynak', 'object'], ['h1', 'array']]
    .filter(([k, t]) => (t === 'array' ? !Array.isArray(B[k]) : typeof B[k] !== t || B[k] === null)).map(([k]) => k);
  if (eksik.length) hataCik(`beklenen.json eksik veya bozuk (${beklenenYol}): ${eksik.join(', ')} alanı yok ya da türü yanlış; ara_surum_uret.js ile yeniden üretin.`);
}
// Eski beklenen.json dosyaları (bicim alanı olmadan) Marmara örneğinin değerleriyle denetlenir.
const BC = B.bicim || {
  sayfa: { w: 11906, h: 16838, top: 1417, bottom: 1417, left: 1417, right: 1417, header: 850, footer: 850 },
  yazi_tipi: 'Times New Roman',
  metin: { sz: 22, line: 384, before: 120, after: 120, iki_yana: true },
  dipnot: { sz: 18, line: 240, iki_yana: true },
  bolum_basligi: { sz: 24, before: 600, after: 600, yeni_sayfa: true, buyuk_harf: true },
  alt_baslik: { sz: 24, before: 300, after: 30 },
  sayfa_numarasi_sz: 20,
  baslik_numaralandirma: 'hukuk',
};
const BOLUM_YAPISI = B.bolum_yapisi || [{ altbilgi: false, fmt: null }, { altbilgi: true, fmt: 'lowerRoman' }, { altbilgi: true, fmt: 'decimal' }];
const KAPAK_SAYFASI = B.kapak_sayfasi === undefined ? 2 : B.kapak_sayfasi;
const GIRIS = B.giris_basligi || 'GİRİŞ';
const yakin = (deger, beklenen) => Math.abs(Number(deger) - beklenen) <= 1; // cm → twip yuvarlaması
const nk = (twip) => String(twip / 20).replace('.', ','); // twip → punto, Türkçe ondalık

const sonuc = [];
let hata = 0; let ertelenen = 0;
/** ertelenebilir: --taslak ile Word'ün yapacağı iş eksikse KALDI yerine ERTELENDİ (başarısızlık sayılmaz). */
function kontrol(ad, gecti, ayrinti = '', ertelenebilir = false) {
  const durum = gecti ? 'GEÇTİ ' : ertelenebilir ? 'ERTELENDİ' : 'KALDI ';
  sonuc.push(`${durum} ${ad}${ayrinti ? ' — ' + ayrinti : ''}`);
  if (!gecti) { if (ertelenebilir) ertelenen++; else hata++; }
}
const ent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// Word, Türkçe arayüzde stil kimliklerini yeniden adlandırabilir (Heading1 → Balk1); bu yüzden stiller adla eşlenir.
const STIL_ADI = new Map();
function paragraflar(xml) {
  const out = [];
  const re = /<w:p[ >][\s\S]*?<\/w:p>/g; let m;
  while ((m = re.exec(xml))) {
    const p = m[0];
    const stId = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
    const st = STIL_ADI.get(stId) || stId;
    let t = '';
    const tr = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g; let k;
    while ((k = tr.exec(p))) t += k[1] !== undefined ? ent(k[1]) : (k[0] === '<w:tab/>' ? '\t' : ' ');
    out.push({ stil: st, metin: t });
  }
  return out;
}

(async () => {
  let zip;
  try { zip = await JSZip.loadAsync(fs.readFileSync(docxYol)); } catch (e) { hataCik(`.docx açılamadı (${docxYol}): ${e.message}`); }
  const oku = async (ad, zorunlu) => {
    const f = zip.file(ad);
    if (!f) { if (zorunlu) hataCik(`.docx içinde ${ad} yok (${docxYol}); geçerli bir Word belgesi değil.`); return ''; }
    try { return await f.async('string'); } catch (e) { hataCik(`.docx içindeki ${ad} okunamadı: ${e.message}`); }
  };
  const doc = await oku('word/document.xml', true);
  const fnx = await oku('word/footnotes.xml', false);
  const sty = await oku('word/styles.xml', true);
  const rels = await oku('word/_rels/document.xml.rels', false);
  const STILLER = new Map();
  for (const m of sty.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const ad = ((m[2].match(/<w:name w:val="([^"]+)"/) || [])[1] || m[1]).toLowerCase();
    STIL_ADI.set(m[1], ad); STILLER.set(ad, m[0]);
  }

  // ---- dipnotlar
  const fnIds = [...fnx.matchAll(/<w:footnote\b([^>]*)>/g)].filter((m) => !/w:type="/.test(m[1])).map((m) => (m[1].match(/w:id="(-?\d+)"/) || [])[1]);
  const refIds = [...doc.matchAll(/<w:footnoteReference\b[^>]*w:id="(\d+)"/g)].map((m) => m[1]);
  const refSet = new Set(refIds);
  kontrol('Word dipnot sayısı = kaynaklardaki dipnot tanımı sayısı', fnIds.length === B.dipnot_tanimi_toplam,
    `Word ${fnIds.length}, kaynak ${B.dipnot_tanimi_toplam} (${Object.entries(B.dipnot_tanimi_kaynak).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  kontrol('Her dipnot metinde tam bir kez işaretli', refIds.length === refSet.size && fnIds.every((i) => refSet.has(i)) && refIds.every((i) => fnIds.includes(i)),
    `footnoteReference ${refIds.length}, tekil ${refSet.size}`);
  kontrol('Tanımı olmayan dipnot referansı yok', (B.eksik_tanim || []).length === 0, (B.eksik_tanim || []).join(', '));
  kontrol('Referansı olmayan dipnot tanımı yok', (B.kullanilmayan_tanim || []).length === 0, (B.kullanilmayan_tanim || []).join(', '));
  const eksikAnahtar = B.eksik_anahtar || (B.numarali_atif && B.numarali_atif.eksik_anahtar) || [];
  kontrol('Kaynakçada karşılığı olmayan atıf anahtarı yok', eksikAnahtar.length === 0, eksikAnahtar.slice(0, 8).map((a) => '@' + a).join(', '));
  // Yazar–tarih: etiketi künyeden çıkarılamayan eserlerde Word'de etiket yerine anahtar basılır.
  const etiketsiz = B.etiket_turetilemedi || [];
  kontrol('Yazar–tarih etiketi bütün künyelerden türetildi', etiketsiz.length === 0,
    etiketsiz.length ? `${etiketsiz.slice(0, 8).map((a) => '@' + a).join(', ')} — künyeyi APA ("Soyad, A. (2020).") veya Vancouver ("Soyad A. Başlık. Dergi. 2020;…") biçiminde düzeltin ya da "- [@anahtar] {Yazar, yıl} Künye" yazın` : '');
  const ayniEtiket = B.ayni_etiket || [];
  kontrol('Yazar–tarih: her eser ayırt edilebilir etiket taşıyor', ayniEtiket.length === 0,
    ayniEtiket.length ? `${ayniEtiket.slice(0, 5).map((x) => `${x.etiket} (${x.anahtarlar.map((a) => '@' + a).join(', ')})`).join('; ')} — bu eserlere "- [@anahtar] {Soyad, Soyad2 et al., yıl} Künye" ile ayırt edici etiket verin` : '');
  // NOTEREF: aynı dipnota ikinci ve sonraki referanslar
  const sira = []; const reTok = /<w:bookmarkStart\b[^>]*w:name="([^"]+)"|<w:footnoteReference\b[^>]*w:id="(\d+)"/g; let t;
  let say = 0; const bekleyen = []; const yerImi = new Map();
  while ((t = reTok.exec(doc))) {
    if (t[1]) bekleyen.push(t[1]);
    else { say++; while (bekleyen.length) { const ad = bekleyen.shift(); if (/^_DnRef/.test(ad)) yerImi.set(ad, say); } }
  }
  const notref = [...doc.matchAll(/NOTEREF\s+(_DnRef\d+)[^<]*<\/w:instrText>[\s\S]*?<w:fldChar w:fldCharType="separate"[^>]*\/>([\s\S]*?)<w:fldChar w:fldCharType="end"[^>]*\/>/g)]
    .map((m) => ({ ad: m[1], sonuc: [...m[2].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('') }));
  const yanlis = notref.filter((n) => String(yerImi.get(n.ad)) !== n.sonuc);
  kontrol('Tekrarlanan dipnot referansları (NOTEREF) doğru numarayı gösteriyor', notref.length === B.tekrarlanan_referans && yanlis.length === 0,
    `NOTEREF ${notref.length} (beklenen ${B.tekrarlanan_referans})${yanlis.length ? '; yanlış: ' + yanlis.map((y) => `${y.ad}=${y.sonuc}/${yerImi.get(y.ad)}`).join(', ') : ''}`);

  // ---- metin kalıntıları
  const govde = paragraflar(doc); const dipnot = paragraflar(fnx);
  const tum = [...govde, ...dipnot].map((p) => p.metin);
  const desenler = [
    ['** (kalın işareti)', /\*\*/], ['[^ (dipnot işareti)', /\[\^/], ['# başlık işareti', /^\s*#{1,6}\s/], ['<http (otomatik bağlantı)', /<https?:/],
    ['](…) bağlantı', /\]\(\s*https?:/], ['` (kod işareti)', /`/], ['| tablo satırı', /^\s*\|.*\|\s*$/], ['<!-- yorum', /<!--/],
    ['> alıntı işareti', /^\s*>\s/], ['- liste işareti', /^\s*[-*+]\s/], ['tek * (italik işareti)', /(^|[\s("“])\*[^\s*]|[^\s*]\*($|[\s.,;:)”"])/],
    ['[@ (kaynak anahtarı)', /\[@/], ['[-@ (yalnız yıl atfı)', /\[-@/], ['[? (karşılıksız atıf anahtarı)', /\[\?/],
    ['{{…}} şablon yer tutucusu', /\{\{[A-ZÇĞİÖŞÜ0-9_]+\}\}/],
  ];
  for (const [ad, re] of desenler) {
    const bul = tum.filter((s) => re.test(s));
    kontrol(`Markdown kalıntısı yok: ${ad}`, bul.length === 0, bul.length ? `${bul.length} paragraf; ör. "${bul[0].slice(0, 90)}"` : '');
  }
  // Anahtarlı atıfta erişim etiketi ([tam metin], [özet] …) çıktıda olmamalı. Üç yerde aranır: üretimde kaydedilen atıf
  // metinlerinin parçaları, kaynakça girdilerinin sonu ve gövdede (dipnotlar dahil, kaynakça hariç) köşeli parantez içinde tek
  // başına duran etiket. "(n = 20, abstract)", "title, abstract" ve "[Özet](#x)" bağlantısı sayılmaz; APA'nın kaynakçadaki
  // "Başlık [Abstract]. Dergi" biçimi meşrudur.
  // Dipnotlu sistemde etiket dipnotun içindedir; denetim yapılmaz.
  if (B.atif_turu && B.atif_turu !== 'dipnot') {
    const asciiKucuk = (x) => x.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]).replace(/\s+/g, ' ');
    const E = ['tam metin', 'ozet', 'bibliyografik', 'ikincil aktarim', 'full text', 'abstract', 'bibliographic', 'secondary'];
    const etiketMi = (x) => E.includes(asciiKucuk(x).replace(/^[*_\s]+|[*_\s.;,:]+$/g, ''));
    const atifta = (B.atif_metinleri || []).filter((a) => a.replace(/^[[(]|[\])]$/g, '').split(/[;,]/).some(etiketMi));
    const kaynakcada = govde.filter((p) => /kaynak(ç|c)a/i.test(p.stil)).map((p) => p.metin)
      .filter((x) => { const m = x.match(/\[([^[\]]+)\][*_]*[.,;]?\s*$/); return !!m && etiketMi(m[1]); });
    const govdede = [...govde.filter((p) => !/kaynak(ç|c)a/i.test(p.stil)), ...dipnot].map((p) => p.metin)
      .flatMap((x) => [...x.matchAll(/\[([^[\]]{1,40})\](?!\()/g)].filter((m) => etiketMi(m[1])).map((m) => 'metin …' + x.slice(Math.max(0, m.index - 40), m.index + m[0].length)));
    const bul = [...atifta.map((a) => 'atıf ' + a), ...kaynakcada.map((x) => 'kaynakça …' + x.slice(-60)), ...govdede];
    kontrol(`Erişim etiketi ([tam metin], [özet] …) atıflarda, kaynakça girdilerinin sonunda ve gövdede yok${bul.length ? ` (${bul.length} yer)` : ''}`, bul.length === 0, bul.slice(0, 3).join(' | '));
  }
  const harici = (doc.match(/<w:hyperlink\b[^>]*r:id=/g) || []).length;
  kontrol('Bağlantılar düz metin URL (harici köprü yok)', harici === 0, `harici köprü ${harici}; ilişkilerde ${(rels.match(/TargetMode="External"/g) || []).length} harici hedef`);
  // ---- devir notu
  const metinBirlesik = tum.join('\n').replace(/\s+/g, ' ');
  const sizan = (B.devir_yoklamalari || []).filter((p) => metinBirlesik.includes(p.metin.replace(/\s+/g, ' ')));
  kontrol('Devir notu ve denetim cevapları çıktıda yok', sizan.length === 0,
    `${(B.devir_yoklamalari || []).length} yoklama dizgisi${sizan.length ? '; bulunan: ' + sizan.slice(0, 3).map((s) => `${s.birim}: "${s.metin}"`).join(' | ') : ''}`);

  // ---- başlıklar
  const hdr = govde.filter((p) => /^heading \d$/.test(p.stil)).map((p) => ({ d: Number(p.stil.slice(-1)), m: p.metin.replace(/\s+/g, ' ').trim() }));
  const h1 = hdr.filter((h) => h.d === 1).map((h) => h.m);
  kontrol('Bölüm başlıkları (Başlık 1) beklenen sırada', JSON.stringify(h1) === JSON.stringify(B.h1), h1.join(' | '));
  if (BC.bolum_basligi.buyuk_harf) kontrol('Bölüm başlıkları tümü büyük harf', h1.every((h) => h === h.toLocaleUpperCase('tr-TR')));
  const atlama = []; for (let i = 1; i < hdr.length; i++) if (hdr[i].d > hdr[i - 1].d + 1) atlama.push(`${hdr[i - 1].d}→${hdr[i].d} "${hdr[i].m.slice(0, 50)}"`);
  const duzeySay = [1, 2, 3, 4, 5].map((d) => `B${d}: ${hdr.filter((h) => h.d === d).length}`).join(', ');
  kontrol('Başlık hiyerarşisinde düzey atlaması yok', atlama.length === 0, `${duzeySay}${atlama.length ? '; ' + atlama.slice(0, 5).join('; ') : ''}`);
  // Kaynak kontrolü, araştırma notu ve kaynakça kategori başlıkları numara aramaz; kısım aralığı başlıkları ("I–II") numara sayılır.
  const muaf = (m) => /^[IVXLC]+[–-][IVXLC]+$/.test(m) || /(Kaynak Kontrolü|Araştırma Notu)/.test(m) || (B.kaynakca_kategorileri || ['Mevzuat', 'Yargı Kararları', 'Kitaplar, Tezler ve Makaleler', 'Diğer Belgeler']).some((k) => k.toLocaleLowerCase('tr-TR') === m.toLocaleLowerCase('tr-TR'));
  if (BC.baslik_numaralandirma === 'hukuk') {
    const numarasiz = hdr.filter((h) => h.d >= 2 && !/^([IVXLC]+|[A-Z]|\d+|[a-zçğıöşü])[.)]\s/.test(h.m) && !muaf(h.m));
    kontrol('Alt başlıklar hukuk numaralandırmasıyla (I./A./1.) başlıyor', numarasiz.length === 0, numarasiz.slice(0, 5).map((h) => h.m).join(' | '));
    const yanlisDuzey = hdr.filter((h) => (h.d === 2 && /^[A-Z]\.\s/.test(h.m) && !/^[IVXLC]+\.\s/.test(h.m)) || (h.d === 3 && /^([IVXLC]{2,}|\d+)\.\s/.test(h.m)) || (h.d === 4 && /^([IVXLC]+|[A-Z])\.\s/.test(h.m) && !/^\d/.test(h.m)));
    kontrol('Numara türü başlık düzeyine uyuyor (B2: I., B3: A., B4: 1.)', yanlisDuzey.length === 0, yanlisDuzey.slice(0, 5).map((h) => `B${h.d} "${h.m.slice(0, 40)}"`).join(' | '));
  } else if (BC.baslik_numaralandirma === 'ondalik') {
    // B2 "1.", B3 "1.1.", B4 "1.1.1." — sondaki nokta isteğe bağlı.
    const yanlis = hdr.filter((h) => h.d >= 2 && !muaf(h.m) && !new RegExp(`^\\d+(\\.\\d+){${h.d - 2}}\\.?\\s`).test(h.m));
    kontrol('Alt başlıklar ondalık numaralandırmaya uyuyor (B2: 1., B3: 1.1., B4: 1.1.1.)', yanlis.length === 0, yanlis.slice(0, 5).map((h) => `B${h.d} "${h.m.slice(0, 40)}"`).join(' | '));
  }

  // ---- bölümler ve sayfa
  const sect = [...doc.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => m[0]);
  const fmt = sect.map((s) => { const p = s.match(/<w:pgNumType\b([^>]*)\/>/); return p ? { fmt: (p[1].match(/w:fmt="([^"]+)"/) || [])[1] || null, start: (p[1].match(/w:start="(\d+)"/) || [])[1] || null } : { fmt: null, start: null }; });
  const altbilgi = sect.map((s) => /<w:footerReference\b/.test(s));
  const yapiUygun = sect.length === BOLUM_YAPISI.length && BOLUM_YAPISI.every((b, i) => altbilgi[i] === b.altbilgi
    && (b.fmt === null ? true : (fmt[i].start === '1' && (fmt[i].fmt === b.fmt || (b.fmt === 'decimal' && fmt[i].fmt === null)))));
  const yapiAdi = BOLUM_YAPISI.map((b) => (b.fmt === null ? 'kapaklar (numarasız)' : b.fmt === 'lowerRoman' ? 'ön kısım (i, ii…)' : 'metin (1, 2…)')).join(', ');
  kontrol(`${BOLUM_YAPISI.length} bölüm: ${yapiAdi}`, yapiUygun,
    sect.map((s, i) => `${i + 1}: altbilgi ${altbilgi[i] ? 'var' : 'yok'}, biçim ${fmt[i].fmt || '-'}, başlangıç ${fmt[i].start || '-'}`).join('; '));
  const S = BC.sayfa;
  const attr = (s, ad) => (s.match(new RegExp(`w:${ad}="(\\d+)"`)) || [])[1];
  const sayfaUygun = sect.every((s) => { const pg = (s.match(/<w:pgSz\b[^>]*>/) || [''])[0]; const mr = (s.match(/<w:pgMar\b[^>]*>/) || [''])[0];
    return yakin(attr(pg, 'w'), S.w) && yakin(attr(pg, 'h'), S.h) && ['top', 'bottom', 'left', 'right', 'header', 'footer'].every((k) => yakin(attr(mr, k), S[k])); });
  const cm = (t) => (t / 566.929).toFixed(2).replace('.', ',');
  kontrol(`Sayfa ${cm(S.w)} × ${cm(S.h)} cm; kenar boşlukları ${cm(S.top)}/${cm(S.bottom)}/${cm(S.left)}/${cm(S.right)} cm; üst/alt bilgi ${cm(S.header)}/${cm(S.footer)} cm`, sayfaUygun);
  const footers = Object.keys(zip.files).filter((f) => /^word\/footer\d*\.xml$/.test(f));
  let footOk = footers.length > 0;
  for (const f of footers) { const x = await oku(f, true); footOk = footOk && /PAGE/.test(x) && /<w:jc w:val="center"\/>/.test(x) && new RegExp(`<w:sz w:val="${BC.sayfa_numarasi_sz}"/>`).test(x); }
  kontrol(`Sayfa numarası altta ortada, ${BC.sayfa_numarasi_sz / 2} punto, işaretsiz`, footOk, `${footers.length} altbilgi`);

  // ---- stiller
  const stil = (ad) => STILLER.get(ad.toLowerCase()) || '';
  const metin = stil('Metin (Gövde)') || stil('Metin (Marmara)'), dn = stil('footnote text'), h1s = stil('heading 1'), h2s = stil('heading 2');
  const varsayilanSz = (sty.match(/<w:docDefaults>[\s\S]*?<w:sz w:val="(\d+)"/) || [])[1];
  const metinSz = (metin.match(/<w:sz w:val="(\d+)"/) || [])[1] || varsayilanSz;
  const hiza = (x, iki) => (iki ? /<w:jc w:val="both"\/>/.test(x) : !/<w:jc w:val="(center|right|both|end)"\/>/.test(x));
  const M = BC.metin, D = BC.dipnot, H1 = BC.bolum_basligi, H2 = BC.alt_baslik;
  kontrol(`Metin: ${M.sz / 2} nk, ${M.iki_yana ? 'iki yana yaslı' : 'sola dayalı'}, satır ${(M.line / 240).toFixed(2).replace('.', ',')}, önce/sonra ${nk(M.before)}/${nk(M.after)} nk`,
    metinSz === String(M.sz) && hiza(metin, M.iki_yana) && new RegExp(`w:line="${M.line}"`).test(metin) && new RegExp(`w:before="${M.before}"`).test(metin) && new RegExp(`w:after="${M.after}"`).test(metin));
  kontrol(`Dipnot: ${D.sz / 2} nk, ${D.iki_yana ? 'iki yana yaslı' : 'sola dayalı'}, satır aralığı tam ${nk(D.line)} nk`,
    new RegExp(`<w:sz w:val="${D.sz}"/>`).test(dn) && hiza(dn, D.iki_yana) && new RegExp(`w:line="${D.line}"`).test(dn) && /w:lineRule="exact"/.test(dn));
  kontrol(`Bölüm başlığı: ${H1.sz / 2} nk, koyu, ortalı${H1.yeni_sayfa ? ', yeni sayfa' : ''}, önce/sonra ${nk(H1.before)}/${nk(H1.after)} nk`,
    new RegExp(`<w:sz w:val="${H1.sz}"/>`).test(h1s) && /<w:b\/>/.test(h1s) && /<w:jc w:val="center"\/>/.test(h1s) && (H1.yeni_sayfa === /<w:pageBreakBefore\/>/.test(h1s)) && new RegExp(`w:before="${H1.before}"`).test(h1s) && new RegExp(`w:after="${H1.after}"`).test(h1s));
  kontrol(`Alt başlık: ${H2.sz / 2} nk, koyu, sola dayalı, önce ${nk(H2.before)} nk, sonra ${nk(H2.after)} nk`,
    new RegExp(`<w:sz w:val="${H2.sz}"/>`).test(h2s) && /<w:b\/>/.test(h2s) && !/<w:jc w:val="(center|right|both|end)"\/>/.test(h2s) && new RegExp(`w:before="${H2.before}"`).test(h2s) && new RegExp(`w:after="${H2.after}"`).test(h2s));
  kontrol(`Yazı tipi ${BC.yazi_tipi}`, new RegExp(`<w:rFonts [^>]*w:ascii="${BC.yazi_tipi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(sty));

  // ---- içindekiler
  const tocVar = /TOC \\[a-z]/.test(doc) || /<w:instrText[^>]*>\s*TOC\b/.test(doc);
  const pageref = [...doc.matchAll(/PAGEREF\s+(_Toc\d+)[^<]*<\/w:instrText>[\s\S]*?<w:fldChar w:fldCharType="separate"[^>]*\/>([\s\S]*?)<w:fldChar w:fldCharType="end"[^>]*\/>/g)];
  const dolu = pageref.filter((m) => /<w:t(?: [^>]*)?>\s*[0-9ivxlc]+\s*<\/w:t>/.test(m[2])).length;
  // Sayfa numaralarını Word doldurur; --taslak (Word adımı yok) ile alan varsa denetim ertelenir.
  if (B.icindekiler !== false) kontrol('İçindekiler alanı başlık stillerine bağlı ve sayfa numaraları dolu', tocVar && pageref.length > 0 && dolu === pageref.length,
    `${pageref.length} girdi, sayfa numarası dolu ${dolu}${dolu < pageref.length || !pageref.length ? (TASLAK ? ' (Word adımı yapılmadı)' : ' (Word ile güncellenmemiş olabilir)') : ''}`, TASLAK && tocVar);

  // ---- PDF metni
  if (pdfMetinYol) {
    let pt;
    try { pt = fs.readFileSync(pdfMetinYol, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); } catch (e) { hataCik(`PDF metin dosyası okunamadı (${pdfMetinYol}): ${e.message}`); }
    const parca = pt.split(/\n=== PDF SAYFA (\d+) ===\n/);
    const sayfalar = []; for (let i = 1; i < parca.length; i += 2) sayfalar.push(parca[i + 1].split('\n').map((s) => s.trim()).filter(Boolean));
    const bildirilen = (pt.match(/^PAGES: (\d+)/m) || [])[1];
    const okunur = sayfalar.length > 0 && bildirilen !== '0';
    kontrol('PDF metni okundu (sayfa işaretçisi var, sayfa sayısı sıfır değil)', okunur,
      okunur ? `${sayfalar.length} sayfa` : (pt.trim() ? `sayfa işaretçisi yok: "${pt.trim().slice(0, 80)}"` : 'dosya boş'));
    if (okunur) pdfDenetle(sayfalar);
  }
  function pdfDenetle(sayfalar) {
    const son = sayfalar.map((s) => s[s.length - 1] || '');
    const roma = (n) => { const t = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s; };
    // Kapaksız düzende (makale) metin bölümü başlık bloğuyla başlar; Giriş ilk metin sayfasında olabilir.
    const onVar = BOLUM_YAPISI.some((b) => b.fmt === 'lowerRoman');
    const kapakSay = KAPAK_SAYFASI;
    const giris = onVar ? sayfalar.findIndex((s) => s[0] === GIRIS) : kapakSay;
    const kapakNumarasiz = son.slice(0, kapakSay).every((x) => !/^([ivxlc]+|\d+)$/.test(x));
    const onSeri = son.slice(kapakSay, giris); const onUygun = onSeri.every((x, i) => x === roma(i + 1));
    const anaSeri = son.slice(giris); const anaUygun = anaSeri.every((x, i) => x === String(i + 1));
    kontrol(`PDF: ${kapakSay ? 'kapaklarda numara yok, ' : ''}${onVar ? 'ön kısım i…, ' : ''}metin 1’den başlıyor ve kesintisiz`,
      (onVar ? giris > kapakSay : true) && kapakNumarasiz && onUygun && anaUygun,
      `${sayfalar.length} sayfa; ${onVar ? `ön kısım ${onSeri[0]}–${onSeri[onSeri.length - 1]} (${onSeri.length}), ` : ''}metin 1–${anaSeri.length}; ${GIRIS} PDF s. ${giris + 1}`);
    const pdfKalinti = sayfalar.flat().filter((s) => /\*\*|\[\^|`|<https?:|^#{1,6}\s|\[-?@|\[\?/.test(s));
    kontrol('PDF: Markdown kalıntısı yok', pdfKalinti.length === 0, pdfKalinti.slice(0, 2).join(' | '));
  }

  console.log(sonuc.join('\n'));
  console.log(`\n${sonuc.length - hata - ertelenen}/${sonuc.length} denetim geçti${ertelenen ? `; ${ertelenen} ertelendi (Word adımı yapılmadı; Word ile üretince denetlenir)` : ''}.`);
  process.exit(hata ? 1 : 0);
})().catch((e) => { console.error('HATA: ' + e.message); process.exit(2); });
