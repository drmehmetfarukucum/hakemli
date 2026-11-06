# Orkestratör promptu

> Kurulumun **son** adımında yazılır; bu dosyanın varlığı kurulumun bittiğini gösterir. Her yeni turda ve "devam et" mesajında ilk okunan dosyadır. Mod, atıf sistemi veya kurallar değişince değişen kısım yeniden üretilir (protokol § 9a); eski hâli `_yonetim/_arsiv/` altına alınır.
>
> **Üretildiği protokol:** hakemli skill'i, protokol sürüm {{PROTOKOL_SURUMU}} · **Üretim:** {{TARIH_SAAT}} · **Mod:** {{MOD}} (denetim turu {{DENETIM_TURU}})

## 1. Bağlayıcı dosyalar

Bu prompt proje tanımını kopyalamaz. Proje tanımı, karar defteri ve yazım kılavuzu bu promptun önüne geçer; çelişki görürsen protokol § 1 A.6'daki öncelikle düzelt.
- `{{CK}}/_yonetim/proje_tanimi.md`: tür, mod, kurum, atıf sistemi, hacim, kota kuralı, varsayılan politikalar.
- `{{CK}}/_yonetim/karar_defteri.md`, `{{CK}}/_yonetim/yazim_kilavuzu.md`, `{{CK}}/_yonetim/ilerleme.md`.

## 2. Rolün ve çekirdek kurallar

<!-- Protokolün § 0'ını ve § 1'ini AYNEN kopyala. Kısaltma, özetleme, yeniden yazma yok. Elle yazma, komutla kopyala:
     awk '/^## 0\. /{f=1} /^## 2\. /{exit} f' <skill>/references/protokol.md
     Bölüm başka bir aralıksa aynı kalıpla (başlangıç başlığı, bitiş başlığı) kopyala. -->

## 3. Bu projenin aşamaları

<!-- Protokolün § 2–§ 9b'sini seçilen moda göre kopyala (komutla: awk '/^## 2\. /{f=1} /^## 10\. /{exit} f' <skill>/references/protokol.md):
     - Tam modda: aşamalar aynen.
     - Hafif modda veya ara düzende: aşamalar aynen, sonra § H'nin tablosu ve "düşürülmeyecekler" listesi aynen; tabloda geçerli olmayan satırları silme, yanına "bu projede geçerli değil" yaz.
     - Sistematik taramada § J aynen; özgün veri analizinde § K aynen; makalede ve tez önerisinde § 9b (hakem yanıtı) aynen.
     Aşama 7 ("devam et"), § 9a (değişiklik yönetimi) ve § 9b (hakem yanıtı) her modda aynen kalır. -->

## 4. Ortam ve araçlar

<!-- Kurulumda yoklanan araçlar ve kullanılan yedekler: protokol § E'nin ilgili satırları ve § I'nın bu ortamda gereken satırları aynen. -->

## 5. Çıkarılan kısımlar

<!-- Protokolden bu projeye alınmayan her bölümü bir satırla ve gerekçesiyle listele (ör. "§ B'nin hukuk satırı: disiplin halk sağlığı"). Burada listelenmeyen bir bölümün eksikliği unutma belirtisidir (§ 1 A.4). -->

## 6. Kullanıcının asıl talimatı (aynen)

{{ASIL_TALIMAT}}
