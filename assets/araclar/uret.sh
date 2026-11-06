#!/bin/bash
# uret.sh — Markdown ana metinden kurum veya dergi biçiminde Word (ve PDF) ara sürümünü tek komutla üretir.
#
#   1. Node ortamını denetler; yoksa docx ve jszip paketlerini yerel bir ortam klasörüne kurar (internet gerekir).
#   2. ara_surum_uret.js ile Markdown kaynaklarından .docx üretir (kaynaklar yalnızca okunur).
#   3. Microsoft Word ile içindekiler tablosunu ve alanları günceller, .docx'i kaydeder ve PDF üretir.
#   4. dogrula.js ile çıktıyı denetler; sonuçları ayarlar.json "kayit_klasoru" altına yazar.
#   Sonda tek bir "KULLANICIYA BİLDİRİLECEKLER" bloğu yazılır: üretilemeyen her şey, nedeni ve seçenekler.
#
# Kullanım (proje kökünden veya herhangi bir yerden):
#   bash "<çıktı klasörü>/_araclar/uret.sh" [--tarih YYYY-AA-GG] [--taslak-notu "..."] [--ayar dosya.json] [--pdf-yok] [--word-yok]
#
#   --tarih        Çıktı adındaki ve taslak notundaki tarih (varsayılan: ayarlar.json "tarih").
#   --taslak-notu  Dış kapaktaki taslak notu ({tarih_metin} yer tutucusu kullanılabilir; "-" notu kaldırır).
#   --ayar         Ayar dosyası (varsayılan: bu klasördeki ayarlar.json).
#   --pdf-yok      Word ile yalnızca içindekiler güncellenir, PDF üretilmez.
#   --word-yok     Word adımı atlanır (içindekiler sayfa numaraları boş kalır; PDF yok). Doğrulama --taslak ile
#                  çalışır: içindekiler sayfa numarası denetimi KALDI değil ERTELENDİ sayılır.
#
# Çıkış kodları:
#   0  tam: istenen bütün çıktılar üretildi ve denetimler geçti (--word-yok ile ertelenen denetim hariç)
#   1  çıktı üretildi ama en az bir denetim KALDI (veya doğrulama çalışmadı)
#   2  hiçbir çıktı üretilmedi: seçenek hatası, Node yok veya eski, npm kurulumu (internet) başarısız, ayar/kaynak hatası
#   3  kısmi: .docx üretildi ve denetimler geçti ama Word adımı istendiği hâlde yapılamadı (Word yok, Otomasyon izni
#      yok, zaman aşımı, Word hatası, PDF oluşmadı); içindekiler sayfa numaraları ve/veya PDF eksik
#
# Ortam: TEZ_DOCX_ORTAM değişkeniyle Node paket klasörü değiştirilebilir. Word adımı yalnız macOS ve
# Microsoft Word ile çalışır; başka ortamda --word-yok kullanın (içindekiler sayfa numaraları boş kalır).

set -u
ARACLAR="$(cd "$(dirname "$0")" && pwd)"
ORTAM="${TEZ_DOCX_ORTAM:-${XDG_CACHE_HOME:-$HOME/.cache}/hakemli/node_env}"
DOCX_SURUM="9.14.0"
JSZIP_SURUM="3.10.2"
ELLE_WORD="Word'de .docx'i açıp tümünü seçin (⌘A) ve alanları güncelleyin (F9 ya da fn+F9; içindekiler için \"Tüm tabloyu güncelleştir\"), sonra Dosya > Farklı Kaydet > PDF"

# Bildirimler: her satır "ne — Neden: … Yapılabilecek: …"; sonda tek blokta yazılır.
BILDIRIM=()
bildir() { BILDIRIM+=("$1"); }
bildirim_yaz() {
  echo
  echo "KULLANICIYA BİLDİRİLECEKLER"
  if [ ${#BILDIRIM[@]} -eq 0 ]; then echo "  Bildirilecek sınır yok."; return; fi
  local i=1 b
  for b in "${BILDIRIM[@]}"; do echo "  $i. $b"; i=$((i + 1)); done
}
dur() { bildirim_yaz; exit "$1"; }

WORD=1; PDF=1; NODE_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --pdf-yok) PDF=0; shift ;;
    --word-yok) WORD=0; PDF=0; shift ;;
    --tarih|--taslak-notu|--ayar)
      if [ $# -lt 2 ] || [ "${2#--}" != "$2" ]; then echo "HATA: $1 bir değer bekliyor." >&2; exit 2; fi
      NODE_ARGS+=("$1" "$2"); shift 2 ;;
    *) echo "Bilinmeyen seçenek: $1" >&2; exit 2 ;;
  esac
done
WORD_ISTENDI=$WORD

# 1. Ortam
if ! command -v node >/dev/null 2>&1; then
  bildir "Hiçbir çıktı üretilmedi (.docx, PDF) — Neden: Node.js bulunamadı. Yapılabilecek: Node.js 18 veya üstünü kurun (Homebrew: brew install node; ya da nodejs.org) ve yeniden çalıştırın."
  dur 2
fi
NODE_ANA="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
case "$NODE_ANA" in ''|*[!0-9]*) NODE_ANA=0 ;; esac
if [ "$NODE_ANA" -lt 18 ]; then
  bildir "Hiçbir çıktı üretilmedi — Neden: Node.js sürümü eski ($(node -v 2>/dev/null)); en az 18 gerekir. Yapılabilecek: Node.js'i güncelleyin (brew upgrade node ya da nodejs.org) ve yeniden çalıştırın."
  dur 2
fi
if [ ! -f "$ORTAM/node_modules/docx/package.json" ] || [ ! -f "$ORTAM/node_modules/jszip/package.json" ]; then
  echo "Node paketleri kuruluyor: $ORTAM"
  NPM_NEDEN=""
  if ! command -v npm >/dev/null 2>&1; then NPM_NEDEN="npm bulunamadı"
  elif ! mkdir -p "$ORTAM"; then NPM_NEDEN="ortam klasörü oluşturulamadı ($ORTAM)"
  else
    [ -f "$ORTAM/package.json" ] || echo '{"name":"tez-docx-env","private":true}' > "$ORTAM/package.json"
    npm install --prefix "$ORTAM" --no-audit --no-fund --ignore-scripts "docx@$DOCX_SURUM" "jszip@$JSZIP_SURUM" || NPM_NEDEN="npm kurulumu başarısız (internet bağlantısı yok ya da npm kayıt defterine erişilemiyor)"
  fi
  if [ -n "$NPM_NEDEN" ]; then
    bildir "Hiçbir çıktı üretilmedi — Neden: docx@$DOCX_SURUM ve jszip@$JSZIP_SURUM paketleri kurulamadı: $NPM_NEDEN. Yapılabilecek: internete bağlanıp yeniden çalıştırın; ya da bu iki paketin kurulu olduğu klasörü TEZ_DOCX_ORTAM ile gösterin (paketler yalnız ilk çalıştırmada indirilir)."
    dur 2
  fi
fi
export NODE_PATH="$ORTAM/node_modules"

# 2. .docx üretimi (ara_surum_uret.js'in kendi bildirimleri "@@BILDIRIM=" satırlarıyla gelir; blok sonda birleşik yazılır)
CIKIS="$(node "$ARACLAR/ara_surum_uret.js" "${NODE_ARGS[@]+"${NODE_ARGS[@]}"}")"
URET_KOD=$?
echo "$CIKIS" | grep -v '^@@' | sed '/^KULLANICIYA BİLDİRİLECEKLER$/,$d'
if [ $URET_KOD -ne 0 ]; then
  bildir "Hiçbir çıktı üretilmedi — Neden: ara_surum_uret.js hata verdi (yukarıdaki HATA satırı: ayar, tarih veya kaynak dosyası). Yapılabilecek: hatada adı geçen alanı veya dosyayı düzeltip yeniden çalıştırın."
  dur 2
fi
while IFS= read -r SATIR; do [ -n "$SATIR" ] && bildir "$SATIR"; done <<EOF
$(echo "$CIKIS" | sed -n 's/^@@BILDIRIM=//p')
EOF
DOCX="$(echo "$CIKIS" | sed -n 's/^@@CIKTI_DOCX=//p')"
BEKLENEN="$(echo "$CIKIS" | sed -n 's/^@@BEKLENEN=//p')"
RAPOR="$(echo "$CIKIS" | sed -n 's/^@@RAPOR=//p')"
if [ -z "$DOCX" ] || [ -z "$BEKLENEN" ] || [ -z "$RAPOR" ]; then
  bildir "Çıktı yolları okunamadı — Neden: ara_surum_uret.js beklenen \"@@\" satırlarını yazmadı. Yapılabilecek: araç dosyalarının aynı sürümden olduğunu denetleyin (skill'in assets/araclar klasöründen yeniden kopyalayın)."
  dur 2
fi
PDF_YOL="${DOCX%.docx}.pdf"
KAYIT_DIR="$(dirname "$RAPOR")"
TAB="$(basename "${DOCX%.docx}")"
GECICI="$(mktemp -d "${TMPDIR:-/tmp}/tez_ara_surum.XXXXXX")"
# Eski PDF yeni .docx ile uyuşmaz; asla teslim edilmesin diye silinir. PDF yalnız bu çalıştırmada Word üretirse oluşur.
if [ -f "$PDF_YOL" ]; then rm -f "$PDF_YOL" && echo "Önceki PDF silindi (yeni .docx ile uyuşmaz): $PDF_YOL"; fi

# 3. Word: içindekiler, alanlar, PDF
WORD_DURUM="atlandı (--word-yok)"
WORD_KISMI=0  # 1: Word adımı istendiği hâlde yapılamadı (çıkış 3)
if [ "$PDF" = 1 ]; then EKSIK="İçindekiler sayfa numaraları ve PDF"; else EKSIK="İçindekiler sayfa numaraları"; fi
if [ "$WORD" = 1 ]; then
  if [ ! -d "/Applications/Microsoft Word.app" ]; then
    WORD=0; WORD_KISMI=1
    WORD_DURUM="Word bulunamadı; içindekiler güncellenmedi, PDF yok"
    bildir "$EKSIK üretilemedi — Neden: Microsoft Word bulunamadı (/Applications/Microsoft Word.app). Yapılabilecek: $ELLE_WORD; ya da Word kurulu bir Mac'te yeniden çalıştırın. Word adımını bilerek atlamak için --word-yok (çıkış kodu 0)."
  else
    ONCE_ACIK=0; pgrep -x "Microsoft Word" >/dev/null 2>&1 && ONCE_ACIK=1
    # Word korumalı alanda çalışır; izin penceresi açmaması için dosya Word'ün kendi klasörüne kopyalanır.
    WTMP="$HOME/Library/Containers/com.microsoft.Word/Data/tmp/tez_ara_surum_$$"
    rm -rf "$WTMP"; mkdir -p "$WTMP" && cp "$DOCX" "$WTMP/belge.docx"
    touch "$GECICI/basla"
    # Word'ün uyarı ayarı (display alerts) iş öncesi okunur: betik zaman aşımında öldürülürse AppleScript onu geri
    # yükleyemez; aşağıdaki temizlik geri yükler. Yalnız bilinen üç değer kabul edilir.
    ESKI_UYARI="$(perl -e 'alarm 30; exec @ARGV' osascript -e 'tell application "Microsoft Word" to get display alerts' 2>/dev/null)"
    case "$ESKI_UYARI" in "alerts all"|"alerts none"|"alerts message box") ;; *) ESKI_UYARI="alerts all" ;; esac
    HEDEF_PDF="-"; [ "$PDF" = 1 ] && HEDEF_PDF="$WTMP/belge.pdf"
    if [ "$PDF" = 1 ]; then ISLEM="içindekiler/alanlar güncelleniyor ve PDF üretiliyor"; else ISLEM="içindekiler/alanlar güncelleniyor"; fi
    echo "Word: $ISLEM (büyük belgelerde birkaç dakika sürebilir)…"
    # Süre sınırı saniye cinsinden; 72 bin kelime ve 860 dipnotluk bir tez bu Mac'te yaklaşık 23 dakika sürdü.
    WORD_SURE="${TEZ_WORD_SURE:-3600}"; case "$WORD_SURE" in ''|*[!0-9]*) WORD_SURE=3600 ;; esac
    WSONUC="$(perl -e 'alarm shift; exec @ARGV' "$WORD_SURE" osascript "$ARACLAR/word_guncelle_pdf.applescript" "$WTMP/belge.docx" "$HEDEF_PDF" 2>&1)"
    WKOD=$?
    if [ $WKOD -eq 0 ]; then
      cp "$WTMP/belge.docx" "$DOCX"
      WORD_DURUM="tamam ($WSONUC)"
      if [ "$PDF" = 1 ]; then
        # PDF bu çalıştırmada üretilmiş olmalı (başlangıç işaretinden yeni).
        if [ -f "$WTMP/belge.pdf" ] && ! [ "$GECICI/basla" -nt "$WTMP/belge.pdf" ]; then cp "$WTMP/belge.pdf" "$PDF_YOL"
        else
          WORD_DURUM="$WORD_DURUM; PDF oluşmadı"; WORD_KISMI=1
          bildir "PDF üretilemedi — Neden: Word içindekileri güncelleyip .docx'i kaydetti ama PDF dosyası oluşmadı. Yapılabilecek: .docx'i Word'de açıp Dosya > Farklı Kaydet > PDF ile kaydedin ya da yeniden çalıştırın."
        fi
      fi
    else
      # Word yapamadı: içindekiler denetimi ertelenir (--taslak); sonuç kısmi (çıkış 3) ve aşağıda bildirilir.
      WORD=0; WORD_KISMI=1
      WORD_DURUM="BAŞARISIZ (çıkış $WKOD): ${WSONUC:-çıktı yok} — .docx Word ile güncellenmeden bırakıldı; PDF üretilmedi."
      IZIN_YOK=0
      if echo "$WSONUC" | grep -q -- '-1743'; then
        IZIN_YOK=1
        NEDEN="macOS, bu komutu çalıştıran uygulamanın (Claude masaüstü uygulaması, Terminal veya kullandığınız başka bir uygulama) Microsoft Word'ü yönetmesine izin vermiyor (Otomasyon izni, hata -1743)."
        YAP="Sistem Ayarları > Gizlilik ve Güvenlik > Otomasyon'da bu uygulamanın (Claude, Terminal …) altında Microsoft Word'ü açıp yeniden çalıştırın; ya da $ELLE_WORD."
      elif [ $WKOD -eq 142 ] || echo "$WSONUC" | grep -q -- '-1712'; then
        if [ "$WORD_SURE" -ge 120 ]; then SURE_METIN="$(( WORD_SURE / 60 )) dakika"; else SURE_METIN="$WORD_SURE saniye"; fi
        NEDEN="Word süre sınırında ($SURE_METIN; TEZ_WORD_SURE ile değişir) bitirmedi. Belge çok büyük olabilir ya da Word'de yanıt bekleyen bir pencere (izin, belge onarma, kaydetme sorusu) olabilir."
        YAP="Word'ü öne getirip bekleyen pencereyi kapatın ve yeniden çalıştırın; belge büyükse süreyi artırın (ör. TEZ_WORD_SURE=7200); ya da $ELLE_WORD."
      else
        NEDEN="Word otomasyonu hata verdi: ${WSONUC:-çıktı yok}."
        YAP="Word'de açık kalan pencereyi kapatıp yeniden çalıştırın; ya da $ELLE_WORD. Word'süz sürüm için --word-yok."
      fi
      bildir "$EKSIK üretilemedi (.docx Word ile güncellenmeden bırakıldı) — Neden: $NEDEN Yapılabilecek: $YAP"
      # Temizlik: yalnız bu çalıştırmanın açtığı belgeyi kaydetmeden kapat, uyarı ayarını geri yükle.
      # Word hâlâ meşgulse bu komut da süre sınırına takılır; o zaman geçici klasör silinmez ve kullanıcıya söylenir.
      # İzin yoksa (-1743) Word belgeyi hiç açmamıştır ve temizlik komutu da reddedilir: temizlik gerekmez.
      if [ "$IZIN_YOK" = 1 ]; then
        WTEMIZ=1
        if [ "$ONCE_ACIK" = 0 ] && pgrep -x "Microsoft Word" >/dev/null 2>&1; then
          bildir "Word bu çalıştırmada açıldı ama otomasyon izni olmadığı için araç onu kapatamıyor — Yapılabilecek: Word'de açık belge yoksa Word'ü kendiniz kapatın."
        fi
      elif perl -e 'alarm 90; exec @ARGV' osascript \
           -e 'tell application "Microsoft Word"' \
           -e "repeat with d in (get documents)" \
           -e "if (full name of d) contains \"tez_ara_surum_$$\" then close d saving no" \
           -e "end repeat" \
           -e "set display alerts to $ESKI_UYARI" \
           -e 'end tell' >/dev/null 2>&1; then
        WTEMIZ=1
      else
        WTEMIZ=0
        bildir "Word temizliği yapılamadı — Neden: Word hâlâ belgeyi işliyor ya da yanıt vermiyor. Yapılabilecek: Word'de \"belge.docx\" penceresini kaydetmeden kapatın; Word'ün uyarıları bu oturumda kapalı kalmış olabilir, açık belgelerinizi kaydedip Word'ü yeniden başlatın. Geçici kopya silinmedi: $WTMP (Word kapandıktan sonra silebilirsiniz)."
      fi
    fi
    # Word'ü yalnız bu komut açtıysa ve başka açık belge yoksa kapat (kullanıcının belgelerine dokunma).
    if [ "$ONCE_ACIK" = 0 ] && [ "${IZIN_YOK:-0}" = 0 ]; then perl -e 'alarm 60; exec @ARGV' osascript -e 'tell application "Microsoft Word" to if (count of documents) is 0 then quit' >/dev/null 2>&1; fi
    # Temizlik yapılamadıysa (WTEMIZ=0) Word belgeyi hâlâ açık tutuyor olabilir; geçici kopya kullanıcıya bırakılır.
    if [ "${WTEMIZ:-1}" = 1 ]; then
      rm -rf "${WTMP:?}"
    fi
  fi
elif [ "$WORD_ISTENDI" = 0 ]; then
  bildir "İçindekiler sayfa numaraları ve PDF üretilmedi (--word-yok ile bilerek) — Neden: Word adımı atlandı; doğrulamada içindekiler denetimi ERTELENDİ sayıldı. Yapılabilecek: teslimden önce --word-yok olmadan çalıştırın ya da $ELLE_WORD."
fi
echo "Word adımı: $WORD_DURUM"

# 4. Doğrulama
DOG_ARGS=("$DOCX" "$BEKLENEN")
# Word adımı yapılmadıysa içindekiler sayfa numaraları denetimi ertelenir (--taslak).
[ "$WORD" = 0 ] && DOG_ARGS+=(--taslak)
if [ -f "$PDF_YOL" ] && [ "$PDF" = 1 ]; then
  if osascript -l JavaScript "$ARACLAR/pdf_metin.js" "$PDF_YOL" > "$GECICI/pdf_metin.txt" 2>/dev/null; then DOG_ARGS+=(--pdf-metin "$GECICI/pdf_metin.txt")
  else bildir "PDF sayfa numarası denetimi yapılmadı — Neden: PDF metni okunamadı (pdf_metin.js). Yapılabilecek: PDF'i açıp sayfa numaralarını gözle denetleyin."; fi
fi
DOGRULAMA="$KAYIT_DIR/${TAB}_dogrulama.txt"
{ echo "Doğrulama — $(date '+%d.%m.%Y %H:%M')"; echo "Dosya: $DOCX"; echo "Word adımı: $WORD_DURUM"; echo; node "$ARACLAR/dogrula.js" "${DOG_ARGS[@]}"; } > "$DOGRULAMA" 2>&1
DOG_KOD=$?
cat "$DOGRULAMA"
rm -rf "$GECICI"
if [ $DOG_KOD -eq 1 ]; then
  bildir "En az bir doğrulama denetimi KALDI — Neden: çıktıda düzeltilmesi gereken bir sorun var (KALDI satırları yukarıda ve $DOGRULAMA içinde). Yapılabilecek: KALDI satırında adı geçen kaynağı düzeltip yeniden çalıştırın."
elif [ $DOG_KOD -ne 0 ]; then
  bildir "Doğrulama yapılamadı (dogrula.js çıkış $DOG_KOD) — Neden: girdi okunamadı (HATA satırı $DOGRULAMA içinde). Yapılabilecek: .docx ve beklenen.json'u yeniden üretip tekrar çalıştırın."
fi
echo
echo "Çıktı: $DOCX"
[ -f "$PDF_YOL" ] && [ "$PDF" = 1 ] && echo "PDF:   $PDF_YOL"
echo "Rapor: $RAPOR"
echo "Doğrulama: $DOGRULAMA"
bildirim_yaz | tee -a "$DOGRULAMA"
if [ $DOG_KOD -ne 0 ]; then exit 1; elif [ "$WORD_KISMI" = 1 ]; then exit 3; else exit 0; fi
