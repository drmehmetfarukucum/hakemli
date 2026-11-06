// pdf_metin.js — PDF'in sayfa sayfa metnini çıkarır (macOS PDFKit; ek paket gerekmez).
// Kullanım: osascript -l JavaScript pdf_metin.js <pdf_yolu> > cikti.txt
ObjC.import('PDFKit');
ObjC.import('Foundation');
function run(argv) {
  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  if (!doc || doc.isNil()) return 'HATA: PDF açılamadı';
  var out = [];
  for (var i = 0; i < doc.pageCount; i++) out.push('\n=== PDF SAYFA ' + (i + 1) + ' ===\n' + ObjC.unwrap(doc.pageAtIndex(i).string));
  return 'PAGES: ' + doc.pageCount + '\n' + out.join('\n');
}
