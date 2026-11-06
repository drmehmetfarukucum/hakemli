# Yönetim dosyası iskeletleri

Kurulumda (SKILL.md adım 4) bu dosyalar `<çıktı klasörü>/_yonetim/` altına kopyalanır ve başlıktaki yer tutucular doldurulur. İçerik boş başlar; başlıklar ve tablo sütunları süreç betiğinin (`assets/araclar/surec_denetimi.py`) okuduğu biçimdedir, adlarını değiştirme.

| İskelet | Hedef | Ne zaman doldurulur |
|---|---|---|
| `proje_tanimi.md` | `_yonetim/proje_tanimi.md` | Aşama 0 teyidinden hemen sonra; plan onayında § 5 tamamlanır. |
| `yazim_kilavuzu.md` | `_yonetim/yazim_kilavuzu.md` | Kurulumda; § A protokolden aynen, § B–C uyarlamaları, hacim tablosu. |
| `ilerleme.md` | `_yonetim/ilerleme.md` | Kurulumda; her önemli adımda. |
| `karar_defteri.md` | `_yonetim/karar_defteri.md` | Kurulumda; numarayı yalnız orkestratör verir. |
| `kaynak_kaydi.md` | `_yonetim/kaynak_kaydi.md` | Aşama 1'den itibaren; kabulden sonra. |
| `revizyon_kararlari.md` | `_yonetim/denetim/revizyon_kararlari.md` | Her revizyon mesajından önce. |
| `devir_notu.md` | `_yonetim/devir_notu.md` | Oturum veya hesap değişmeden önce; bağlam büyüyünce. Kullanıldıktan sonra `_yonetim/_arsiv/` altına taşınır. |
| `kullanici_profili.md` | `~/.claude/hakemli/profil.md` (skill'in ve projenin dışında) | İsteğe bağlı; kullanıcı isterse ilk çalışmanın Aşama 0'ında, onayıyla. Sonraki çalışmalarda Aşama 0 bunu okur. |
| `orkestrator_promptu.md` | `_yonetim/orkestrator_promptu.md` | Kurulumun **son** adımında; varlığı kurulumun bittiğini gösterir. Mod veya kural değişince değişen kısım yeniden üretilir. |

Kopyalarken: `{{…}}` yer tutucularını doldur, `<!-- … -->` açıklamalarını istersen sil. Sonra proje kökünden `grep -rn '{{' <çıktı klasörü>/_yonetim` ile boş yer tutucu kalmadığını sına (alt klasörler dahil). Plana bağlı alanlar (iş birimleri, hacim tablosu) plan onayına kadar boş kalabilir; süreç betiği kalan yer tutucuları kırmızı gösterir.
