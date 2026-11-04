# WEINIG landing: plan cele strane (nacrt, čeka odobrenje)

Dopunjuje CONCEPT.md, a proizvode i izvore drži PRODUKTE.md. Kad se ova dva fajla razlikuju, važi ovaj fajl.

## Šta je firmi najbitnije (sa weinig.de, novembar 2026)

1. **Hobelmaschinen su srce firme.** WEINIG je tržišni lider sa 60.000+ automatskih rendi. Celo ime firme ljudi vezuju za Powermat (danas SOLID PROFILE P).
2. **„Alles aus einer Hand", od pojedinačne mašine do linije ključ u ruke.** WEINIG System Solutions spaja celu grupu u jednu liniju: BSH, DUO/TRIO grede, CLT, masivne ploče, linije za sečenje i rendisanje. Ovo ih razlikuje od konkurencije koja prodaje pojedinačne mašine.
3. **Ausbeute, odnosno novac iz drveta.** Skener, optimizacija i keilzinken pretvaraju otpad u proizvod („aus Restholz ein Highend-Produkt").
4. **Prozori i vrata.** 3.500+ mašina, 700+ CNC centara, 35+ zemalja. Fenster / CNC Forum je 11–12. novembra 2026, i to je povod za mejl.
5. **LifeTime Services i W4.0 digital** (App Suite, Control Suite, viaBOX, Izy). Investicija ne staje posle kupovine.

**Kontekst koji menja ton:** program „Transformation 2027" (februar 2026). Kupci odlažu investicije, a WEINIG je uložio 120 mil. € u visoko automatizovanu fabriku u Tauberbischofsheimu. Zato landing ne priča o „inovaciji", nego o **povraćaju investicije**: više drveta iz iste sirovine, manje ljudi po smeni, mašina koja radi decenijama uz servis. O restrukturiranju i otpuštanjima na landingu ne pišemo ništa.

## Odluka o 3D sceni: 3 scene, ne jedna po proizvodu

Scena po proizvodu značila bi 8+ scena. Strana bi se dugo učitavala i dugo skrolovala, a telefon bi se gušio. Pravilo je sledeće: **3D dobija samo ono što fotografija ne može da pokaže, a to je šta se dešava unutar mašine.** Sve ostalo pokazujemo njihovim fotografijama i 2D prikazima.

| # | Scena | Proizvodi | Zašto 3D |
|---|---|---|---|
| A | **Linija: skeniranje, kappen, keilzinken** (`lib/line.js`, postojeća) | SOLID SCAN C 4000, SOLID CUT TF 2000, SOLID JOINT PS 2000 | Sve tri mašine dele istu traku i pričaju jednu priču o prinosu: jedna daska postaje plan, komadi, pa beskonačna lamela. Jedna scena, jedna kamera koja putuje. |
| B | **Powermat: unutra** (`lib/planer.js`, nova) | SOLID PROFILE P 700 / P 3000 | Ovo je glavni proizvod. Kućište se otvori i vidi se 4–6 vretena oko lamele. Gruba površina prelazi u glatki profil tačno na ravni noža, strugotina leti. Na kraju korisnik bira profil (Hobelware, Fensterkantel, Sockelleiste) i noževi se zamene. To je PowerLock i kratko vreme pripreme, koje oni stalno ističu. |
| C | **Prozor: SOLID CNC CR** (`lib/window.js`, nova) | SOLID CNC CR (Conturex) | Fensterkantel iz scene B se steže u 3D stezanje, glodalo ide oko kraja, delovi se spoje Schlitz-Zapfen u ram, ulazi staklo. Ovo je kraj priče i most ka Forumu. |

Lamela iz A ulazi u B, a profil iz B ulazi u C. Jedan komad drveta prolazi kroz ceo landing. Tri scene dele isti WebGL kontekst (`core.js`, `stageView`), a svaka se renderuje samo dok je vidljiva (`whileVisible`).

**Ne dobijaju 3D:** Auftrennen (SOLID RIP/SPLIT), Verleimpressen, CLT, alati, servis, digital, HOLZ-HER. Za njih idu fotografije, brojke i 2D prikazi ispod.

## Redosled strane

1. **Preloader** (postoji): trupac raste po godovima, laser, rez.
2. **Hero** (postoji): njihove fotografije, skener-prozor, „WEINIG bietet mehr."
3. **Uvod + brojke** (postoji): 150.000+, 60.000+, 200 m/min, 1 partner.
4. **Scena A, linija.** Prinos: koliko je fehlerfrei drveta ostalo iz jedne daske. Na kraju je beskonačna lamela.
5. **Scena B, Powermat.** Najviše skrola na strani. Brojke: 7.000 o/min (opciono 8.000), +15 % pomak, „vier Seiten in einem Durchgang", do 300 m/min kod H-serije.
6. **Šta iz toga nastaje (Systemlösungen), 2D.** Šest kartica sa njihovih strana „Anwendungsbeispiele": BSH / DUO / TRIO, BSP/CLT, Massivholzplatten, Mehrschichtplatten, Zuschnitt- und Hobellinie, Blockverleimung. Svaka ima fotografiju i jednu rečenicu. Lamela iz B se na hover slaže u presek tog proizvoda kao mali SVG ili CSS crtež, ne kao 3D. Poruka: „Von der Einzelmaschine bis zur schlüsselfertigen Linie" i četiri koraka WSS: Konzept, Planung, Auftragsabwicklung, Produktionsbegleitung.
7. **Scena C, prozor + Fenster / CNC Forum.** 20–85 kompletnih ramova po smeni, od serije od jednog komada. Ispod je traka sa datumom Foruma i dugmetom.
8. **Portfolio (bez 3D).** Lista porodica po redosledu procesa: Auftrennen, Scannen, Kappen, Keilzinken, Hobeln & Profilieren, Verleimen, CNC, Werkzeuge & Schleifen. Na hover ide fotografija sa njihovog sajta, a svaki red vodi na njihovu stranu proizvoda. Poslednji red je **HOLZ-HER (Holzwerkstoffe)**, da se vidi da grupa pokriva i ploče. Detalje o HOLZ-HER modelima još treba proveriti.
9. **W4.0 digital + LifeTime Services.** Mali „Cockpit" u HTML-u, ne 3D: m/min, Ausbeute i stanje mašine. Brojke dolaze iz same scene A, pa korisnik vidi podatke svoje daske. Pored toga ide osam LifeTime usluga kao kratka lista (Ersatzteile, Vor-Ort, Hotline, Werkzeuge, Schleifservice, Reparaturen, Wartung, Training-Center) i telefon servisa +49 9341 86 222.
10. **„100 %" vrednosti** (Qualität, Zuverlässigkeit, Beratung, Service, A bis Z), zatim kontakt i footer.

## Ko šta radi (dve sesije paralelno, bez preklapanja fajlova)

- **Sesija „proizvodi i animacije":** scena A u `lib/line.js` (stanice 1–3) i tekstovi panela u `#linie`. Stanice 4 i 5 izlaze iz njenog plana i postaju scene B i C.
- **Ova sesija (3D modeli):** scena B u novom `lib/planer.js`. Posle odobrenja ide i scena C u `lib/window.js`. Dodaje se samo jedna linija `initPlaner()` u `main.js` i nova sekcija u `page.tsx` posle `#linie`.
- **Kasnije, kad 3D bude gotov:** sekcije 6, 8, 9 i 10 (HTML/CSS, impeccable + humanizer).

## Otvoreno

- Da li priču zaključujemo prozorom, ili prozor ide pre Systemlösungen? Predlog je ovako kako je gore: B → 2D sistemi → C. Tako je prozor poslednja velika slika pre Foruma.
- HOLZ-HER: jedan red u portfoliju ili posebna sekcija? Predlog je jedan red, jer je mejl za WEINIG Massivholz.
- Fotografije za sekcije 6 i 8 ostaju linkovi ka weinig.de dok ne odobriš preuzimanje.
