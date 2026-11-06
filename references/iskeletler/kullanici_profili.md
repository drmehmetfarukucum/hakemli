# Kullanıcı profili (hakemli)

> İsteğe bağlı. Skill'in parçası değildir; kullanıcının kendi bilgisayarında `~/.claude/hakemli/profil.md` olarak durur. Orkestratör Aşama 0'da önce bunu okur, buradaki bilgiyi yeniden sormaz, teyit özetinde gösterir. Değişiklik kullanıcının onayıyla yapılır. Şifre, API anahtarı veya kişisel sağlık verisi bu dosyaya yazılmaz.
>
> **Son güncelleme:** {{TARIH}}

## Kurum ve erişim

- **Kurum ve program:** {{KURUM}} <!-- ör. "X Üniversitesi, Halk Sağlığı doktora programı" -->
- **Kurumsal kütüphane:** {{KUTUPHANE}} <!-- uzaktan erişim sayfasının adresi ve yolu (tarayıcıda oturum, proxy, OpenAthens). Oturumu her zaman kullanıcı açar. Yoksa "yok". -->
- **Tarayıcı:** {{TARAYICI}} <!-- Claude in Chrome kurulu mu, hangi tarayıcı veya cihaz; yerleşik tarayıcı -->

## Dış modeller ve araçlar

- **Kullanım izni:** {{DIS_MODEL_IZNI}} <!-- Gemini, ChatGPT, Codex: hangileri var ve kullanılabilir; yayımlanmamış metin gönderilebilir mi -->
- **Microsoft Word:** {{WORD}} <!-- kurulu mu; otomasyon izni verildi mi -->
- **Diğer skill'ler:** {{SKILLER}} <!-- ör. Türkçe dil cilası için `aynen` -->

## Tercihler

- **Model:** {{MODEL}} <!-- ör. "yazarlar en yetenekli genel model ve xhigh; daha pahalı model yalnız gerekçeyle" -->
- **Kota:** {{KOTA}} <!-- önceki projelerdeki eşik; her projede şimdiki kullanıma göre yeniden önerilir -->
- **Dil ve üslup:** {{USLUP}}
