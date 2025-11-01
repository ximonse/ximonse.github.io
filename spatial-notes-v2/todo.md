Detta är en lista som ämnar återuppliva gamla funktioner och kortkommandon, samt justera befintliga.  De ska gås igenom steg för steg.



⌨️ Kortkommandon (Globala)
Dessa kommandon fungerar när du inte skriver i ett textfält eller en dialogruta.
Kort-arrangemang (för markerade kort)
•	H: Horisontell Rad – Arrangerar markerade kort på en prydlig, toppjusterad horisontell rad vid muspekaren.
•	V: Vertikal Kolumn – Arrangerar markerade kort i en centrerad, vertikal kolumn vid muspekaren.
•	G + V: Grid (Vertikal) – Arrangerar markerade kort i ett rutnät med fokus på kolumner (max 6 kolumner).
•	G + H: Grid (Horisontell) – Arrangerar markerade kort i ett rutnät med packade, toppjusterade rader (max 6 kolumner).
•	G + T: Grid (Tight) – Arrangerar markerade kort i ett kompakt rutnät med vertikal överlappning (max 6 kolumner).
•	Q: Kluster  – Samlar markerade kort i en organisk, lätt överlappande  (som kort på ett bord). Om Q trycks igen snabbt växlar den till "Prydlig Hög".
•	X: Cirkulär Svärm – Arrangerar markerade kort i en extremt tajt, organisk cirkel (likt Obsidian-grafvy).
•	B: Layout med Pilar – Startar en "live" fysiksimulering (force-directed) som arrangerar det markerade kortet och alla kort som är anslutna till det med pilar.
•	Alt + S (eller QQ): Prydlig Hög – Staplar markerade kort i en prydlig hög vid muspekaren, med en liten förskjutning.
Kort-hantering
•	N: Nytt Kort – Öppnar dialogrutan "Nytt kort" för att skriva text, taggar och välja färg.
•	M: Multi-import – Öppnar dialogrutan "Skapa flera kort från text" för att klistra in text och skapa flera kort samtidigt.
•	C: Kopiera Kort – Kopierar alla markerade kort till ett internt urklipp. Använd sedan ett arrangemangskommando (H, V, G+V etc.) för att klistra in kopiorna.
•	P: Pinna – Pinnar (låser) markerade kort. De kan inte raderas eller flyttas.
•	U: Unpin – Tar bort pinning från markerade kort.
•	Delete: Radera Kort – Raderar alla markerade kort (som inte är pinnade).
Färg & Val
•	0: Ta bort Färg – Återställer färgen på markerade kort.
•	1 - 8: Applicera Färg – Färgar markerade kort med en av de 8 förinställda färgerna.
•	T: Färgväljare – Öppnar färgpaletten för markerade kort.
•	Ctrl + A: Markera Alla – Markerar alla kort som inte är pinnade.
•	Escape: Avmarkera / Rensa – Avmarkerar alla kort, eller rensar sökresultat om sökning är aktiv.
Navigation & Verktyg
•	F: Fokus Sök – Placerar markören i sökfältet.
•	K: Växla Vy – Växlar mellan "Brädvy" (standard) och "Kolumnvy".
•	D: Rita (Draw) – Slår på/av verktygsfältet för "Annotationer" (pilar, former, text).
•	A: Pil-verktyg – Aktiverar ritverktyget och väljer "Pil".
•	Shift + T: Växla Toolbar – Växlar mellan den fullständiga och den förenklade verktygsraden.
Spara & Ladda
•	S: Smart Spara – Sparar brädan till både webbläsarens localStorage och till Google Drive (om inloggad).
•	L: Ladda Fil – Öppnar dialogrutan för att ladda en .json-fil från din dator.
•	Z: Ladda Zotero – Öppnar dialogrutan för att ladda en .html-fil exporterad från Zotero.
System & Fönster
•	Z: Ångra (Undo) – Ångrar den senaste flytt- eller raderingsåtgärden.
•	Y: Gör om (Redo) – Gör om den senaste ångrade åtgärden.
•	E: Exportera – Öppnar exportmenyn för markerade kort.
•	Ctrl + Q: Hjälp – Visar dialogrutan som en overlay med alla "Kortkommandon".
•	Ctrl + Shift + C: Kopiera som Markdown – Kopierar markerade kort som Markdown till urklipp.
Vyer (Endast i Kolumnvy)
•	I: Sortera (Viktighet) – Sorterar kolumnvyn efter "importance" (äldsta #todo först).
•	W: Sortera (Färg) – Sorterar kolumnvyn efter bakgrundsfärg (röd → grå).
________________________________________
⌨️ Kortkommandon (I Dialogrutor)
Sök- och Filterfält
•	Enter: Verkställ – Konverterar alla sökresultat till markerade kort och stänger sökningen.
•	Escape: Rensa – Rensar sökfältet och återställer vyn.
Dialogrutor (Nytt kort / Redigera kort / Snabbformat)
•	Ctrl + Enter: Spara – Sparar och stänger dialogrutan (i "Nytt kort" och "Redigera kort").
•	Enter (utan Shift): Spara – Sparar och stänger dialogrutan (i "Snabb Anteckning" och "Snabbformat").
•	Escape: Avbryt – Stänger dialogrutan utan att spara.
AI-chatt (Claude & ChatGPT)
•	Enter (utan Shift): Skicka – Skickar meddelandet till Claude AI.
•	Ctrl + Enter: Kör Sortering – Kör sorteringen med ChatGPT.
Annotations-verktygsfält (När "Rita" är aktiv)
•	Y: Välj färg Yellow.
•	R: Välj färg Red.
•	G: Välj färg Green.
•	B: Välj färg Blue.
•	P: Välj färg Purple.
•	S: Ställ in textstorlek till Small (för nästa textruta du skapar).
•	M: Ställ in textstorlek till Medium.
•	L: Ställ in textstorlek till Large.
Om annotationsfältet är öppet och jag klickar ’L’ sedan ’G’ och sedan klickar på brädet så skapas en ’L’arge ’G’reen rektangel, S och sedan B ger en small blue rektangel.
________________________________________
🖱️ Menyer & Toolbars
Huvud-verktygsfält (Toolbar) Dessa är funktioner, alla syns inte i den synliga menyn, men ska finnas i command palletten.
•	Nytt Kort (+): Öppnar dialogrutan "Nytt kort".
•	Multi-import (M) (📋): Öppnar "Skapa flera kort från text" (för att klistra in).
•	Bilder (🖼️): Öppnar filväljare för att ladda upp bilder eller PDF-filer.
•	Claude AI (ctrl+C) (🤖): Öppnar chattpanelen för att ställa frågor till Claude AI om dina kort.
•	ChatGPT  (ctrl+G) (🤖): Öppnar panelen för att köra AI-sortering med ChatGPT.
•	Gemini Read  (R) (🤖): Öppnar panelen för att köra AI-sortering med ChatGPT.

•	Brädvy / Kolumnvy (K) (🗺️/📋): Växlar mellan visuell brädvy och list-baserad kolumnvy.
•	Sortera (O)  (📊): Öppnar sorteringsmenyn för markerade kort.
•	Spara (💾): Smart Save – Sparar till både webbläsare och Google Drive (om inloggad).
•	Rita (D) (🎨): Växlar annotations-verktygsfältet (pilar, former, färger).
•	Hjälp (ctrl+q) (⌨️): Visar fönstret med alla kortkommandon som en overlay.
•	Toolbar (☰/⚙️): Växlar mellan den förenklade och den fullständiga verktygsraden.
•	Spara (S): Sparar till webbläsarens localStorage och google drive om inloggad.
•	Add  (A): Laddar .json-fil från dator (lägger till kort till befintlig bräda).
•	Spara fil (ctrl-s) (JSON): Laddar ner hela brädan som en .json-fil.
•	Open file (ctrl-O) (JSON): Laddar .json-fil från dator och skapar nytt bräde.
•	Exportera markerade... (Ctrl+E): Öppnar exportmenyn.
•	Rensa bräda: Raderar alla kort och localStorage. Öppnar först en varningsruta innan den verkställer, så man måste bekräfta.
"Tema" Dropdown
•	Mörkt (Shift+D): Växlar till mörkt tema.
•	Sepia (Shift+S): Växlar till sepia-tema.
•	E-ink (Shift+E): Växlar till e-ink (högkontrast) tema.
"Google Drive" Dropdown
•	Logga in / Logga ut: Hanterar Google Drive-autentisering.
•	Ladda projekt: Laddar det valda projektet från Drive.
•	Hantera projekt: Öppnar projekthanteraren (byta namn, radera, skapa nytt).
________________________________________
👆 Kontextmenyer 
Dubbel-vänster-klick med mus eller långt tryck på mobil/tablet
•	Öppnar vanliga befintlig menyn där man ändrar text, färg och vecka
Högerklick / mellanlångt tryck på mobil/Tablet
•	Pinna / Ta bort pinning: Låser/låser upp kortet.
•	Gemini – läser av kortet om det är en bild och adderar det till kortets text.
•	Färga kort: Visar färgpaletten för att välja.
•	Ändra storlek: Öppnar en dialog för att ändra storlek. Endast bilder, och objekt från annoteringsmenyn. Ej kolumnvy.
•	Ändra fontstorlek: Öppnar dialog för att ändra textstorlek (endast för annotations-former). Ej kolumnvy
•	Pilar
o	Dölj / Visa pilar: Slår av/på synligheten för alla pilar på brädan.
o	Ta bort pilar mellan markerade: Raderar pilar (om flera kort är markerade). Ej kolumnvy
•	Tagg-meny
o	Lägg till tagg: Öppnar dialog för att lägga till tagg på markerade kort.
o	Ta bort tagg: Öppnar dialog för att välja och ta bort tagg från markerade kort.

Långtryck på Tom Yta (Canvas)
•	På Desktop: Klistrar in innehåll (text eller bild) från urklipp vid muspekaren.
•	På iPad/Mobil: Öppnar en meny för att välja bildkälla:
o	Klistra in.
o	Ta foto (kamera).
o	Välj från galleri.
o	Välj fil.
________________________________________
팝업 Dialogrutor (Pop-ups)
Dessa fönster visas vid olika åtgärder:
•	Nytt kort: Fält för Text, Färg, Taggar och "Snabbveckor".
•	Redigera kort: Samma som "Nytt kort", men för att redigera ett befintligt kort.
•	Redigera annotation text: Enkel textruta för att redigera text i en annotations-form.
•	Skapa flera kort från text (M): En stor textruta där du klistrar in text. Två radbrytningar skapar ett nytt kort.
•	Smart sökning: En sökruta som kör en sökning med automatisk "smart" sortering.  Automatisk sortering:
1. Vecko-todos (äldsta först)
2. Färgordning: Röd → Orange → Vit → Gul → Lila → Blå → Grön → Grå
•	Sortera kort: Knappar för att välja sorteringsordning (längd, alfabetiskt, färg, datum etc.) innan du använder ett arrangemangskommando.
•	Exportera X kort: Knappar för att exportera markerade kort som Markdown, Text, JSON, HTML eller dela via Web Share API.
•	Färgväljare: Ett rutnät med 8 färger att applicera på kort.
•	Ändra storlek & lager: Fält för Bredd, Höjd och Lager (Z-index) för annotations-former.
•	Lägg till tagg (Bulk/iPad): En textruta för att skriva in en tagg som ska läggas till.
•	Ta bort tagg (iPad): En lista med taggar att välja från för borttagning.
•	Snabbformat: En textruta för kod-liknande syntax (#Titel, Innehåll, #tag).
•	Fråga AI (Claude): En textruta för att ställa frågor till Claude AI.
•	Google Drive Inloggning: Frågar om du vill "Komma ihåg i 30 dagar" eller "Bara denna session".
•	Kortkommandon: Fönstret som listar de flesta av kommandona ovan.

