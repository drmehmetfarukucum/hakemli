-- word_guncelle_pdf.applescript
-- Microsoft Word ile: içindekiler tablosunu ve alanları (NOTEREF) günceller, .docx'i yerinde kaydeder,
-- istenirse PDF olarak da kaydeder. uret.sh tarafından Word'ün kendi kapsayıcı klasöründeki geçici bir
-- kopya üzerinde çalıştırılır (Word'ün dosya erişim izni penceresi açmaması için).
-- Word'ün uyarı ayarı (display alerts) iş bitince, hata olsa da, önceki değerine döndürülür.
-- Kullanım: osascript word_guncelle_pdf.applescript <docx_yolu> <pdf_yolu veya ->

on run argv
	set docxPath to item 1 of argv
	set pdfPath to item 2 of argv
	set f to POSIX file docxPath
	tell application "Microsoft Word" to set eskiUyari to display alerts
	set d to missing value
	try
		with timeout of 1800 seconds
			tell application "Microsoft Word"
				set display alerts to alerts none
				open f
				set d to active document
				set nt to count of tables of contents of d
				repeat with i from 1 to nt
					update (table of contents i of d)
				end repeat
				set nf to count of fields of d
				repeat with i from 1 to nf
					update field (field i of d)
				end repeat
				repeat with i from 1 to nt
					update page numbers (table of contents i of d)
				end repeat
				save d
				if pdfPath is not "-" then
					save as d file name pdfPath file format format PDF
				end if
				close d saving no
			end tell
		end timeout
	on error hataMetni number hataNo
		-- Belge açık kaldıysa kaydetmeden kapatılır; uyarı ayarı eski değerine döner, hata uret.sh'ye iletilir.
		try
			if d is not missing value then
				tell application "Microsoft Word" to close d saving no
			end if
		end try
		try
			tell application "Microsoft Word" to set display alerts to eskiUyari
		end try
		error hataMetni number hataNo
	end try
	tell application "Microsoft Word" to set display alerts to eskiUyari
	return "icindekiler=" & nt & " alan=" & nf
end run
