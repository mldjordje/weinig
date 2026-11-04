# WEINIG demo: koncept (nacrt, nije odobren)

## Ko su i šta rade

Michael Weinig AG, Tauberbischofsheim (Weinigstraße 2/4). Prave mašine i kompletne linije za obradu **masivnog drveta** (WEINIG) i **pločastih materijala** (brend HOLZ-HER: kantiranje, CNC, testere za ploče).

Njihovi kupci su pilane, proizvođači lepljenog drveta (glulam, CLT, DUO/TRIO grede), stolarije, fabrike prozora, vrata i nameštaja.

Kupcu prodaju **prinos i protok**: koliko upotrebljivog drveta ostane iz sirovog i koliko metara u minuti linija propusti. Na njihovom sajtu je to stalna tema: „maximum material yield", „Restholz → High-End-Produkt", „vier Seiten glatt wie Glas, in einem Durchgang".

### Kako radi njihov proces (redosled iz njihovih stranica)

| Korak | Šta se dešava | Njihove mašine |
|---|---|---|
| 1. Uzdužno sečenje | trupac ili daska se seku na širine | SOLID RIP (kružne), SOLID SPLIT (tračne, do 150 m/min) |
| 2. Skeniranje | skener snimi sve 4 strane „u treptaju oka": kvrge, pukotine, boju, čvrstoću. Od skoro i AI prepoznavanje grešaka | SOLID SCAN Smart / 1000–5000, EScan |
| 3. Optimizovano poprečno sečenje | testera iseca greške, ostaju čisti komadi fiksnih dužina | SOLID CUT U (ispod stola), TF, PF (sa potiskivačem) |
| 4. Keilzinken (spajanje na zupce) | kratki komadi se glodaju na zupce, lepe i presuju u „beskonačnu" lamelu. Spoj je skoro jak kao celo drvo | linije za kratko drvo (do 200 kom/min), konstrukciono drvo (do 120 m/min), protočne prese |
| 5. Rendisanje i profilisanje | jedna mašina u jednom prolazu: poravna donju i desnu stranu, rendiše na širinu i debljinu, profiliše. Preko 60.000 automatskih rendi u svetu, tržišni lider | Powermat 700 / 1200 / 3000, SOLID PROFILE |
| 6. Lepljenje | lamele u ploče, grede, CLT | SOLID PRESS, sistemi za glulam/CLT |
| 7. CNC prozori i vrata | ceo ram i krilo u jednom stezanju, serija od 1 komada | SOLID CNC CR, Vario MC 50 |
| + Alati i servis | glodala, brušenje alata, servis, W4.0 digital (povezane mašine, aplikacije) | SOLID GRIND, PowerLock, Izy |

Brojke sa njihovog sajta: 150.000+ prodatih mašina, 60.000+ automatskih rendi, do 200 m/min (keilzinken), do 150 m/min (tračne testere), do 200 komada/min. Fenster / CNC Forum je 11–12. novembra 2026, a mejl ide neposredno pred njega, pa je to dobar povod za kontakt.

Brend: zelena **#009835**, crna, bela, font Lato. Logo je zeleno-crni kvadrat sa natpisom WEINIG.

## Ideja demo-a

**Jedan komad drveta prolazi kroz celu Weinig liniju dok korisnik skroluje.** Skrol pomera komad kroz liniju, kao da korisnik upravlja brzinom pomaka (m/min). Kod engitec-a je to bio put od baterije do ingota. Ovde je to put od grube daske sa kvrgama do gotovog prozora.

To je njihov ceo portfolio ispričan jednim predmetom, i to je tačno ono što prodaju: od lošeg drveta dobiješ vredan proizvod, bez otpada.

### 3D scene (redosled skrola)

1. **Sirova daska ulazi u halu.** Gruba, siva površina posle pile, vidljive kvrge i pukotina. Kamera široko, tamna hala.
2. **Skener (SOLID SCAN).** Daska prolazi kroz portal, zelena laserska linija prelazi preko nje. Za njom ostaje „rendgen" sloj: kvrge dobiju okvire (AI detekcija), pojave se zelene linije reza. Brojač u panelu: „3 Fehler erkannt, Ausbeute 83 %".
3. **Testera ispod stola (SOLID CUT).** List izlazi odozdo i iseca greške. Loši komadi padaju u kantu, dobri idu dalje sa razmakom.
4. **Keilzinken.** Komadi se okrenu poprečno, glava glodala ide duž krajeva i izreže zupce. Komadi se vrate uzdužno i presa ih spoji: zupci ulaze jedni u druge, kratak „klik", vidi se gotova lamela.
5. **Powermat, glavna scena.** Lamela ulazi u mašinu (belo-zeleno kućište, staklo spreda). Vidi se 4–6 vretena glodala koja se okreću i strugotina koja leti. Na izlazu gruba daska prelazi u glatki profil: presek se menja tačno na ravni glodala. Ovo je njihova osnovna delatnost, pa dobija najviše skrola.
6. **CNC: prozor.** Profil se iseče na 4 dela koja se u vazduhu slože u ram prozora, ulazi staklo. Kamera stane ispred prozora. Kraj: „Vom Rohholz zum Fenster. Alles aus einer Hand."

Opciono, ako ostane vremena: kratka scena sa lamelama koje se slažu unakrsno u CLT ploču (pokriva Systemlösungen, gradnju od drveta).

### Kako pravimo modele

- Sve **proceduralno u three.js**, bez kupljenih GLB modela. Daska, skener, testera, zupci, rende i prozor su jednostavne forme, a kvalitet dolazi od materijala i svetla.
- **Drvo:** šejder sa godovima, kvrgama i dve verzije površine (gruba i rendisana). Na drvetu se najviše vidi da li je demo jeftin, pa ovde ide najviše truda.
- **Mašine:** stilizovane, u Weinig bojama (svetlo siva, antracit, zelena traka). Ne kopiramo Powermat do šrafa, gradimo prepoznatljivu siluetu. Uz scenu ide sitan natpis „Schematische Darstellung".
- **Ključni trikovi:** ravan odsecanja (clipping) za prelaz grubo → profil, oblik zupaca koji se stvarno uklapa, čestice strugotine, zeleni laser sa aditivnim sjajem.
- Motor (`core.js`: jedan WebGL kontekst, pin/scrub, paneli, preloader sa zavesama) uzimamo iz engitec-a.

### Vizuelni pravac

- **Hala noću:** tamna scena, toplo drvo nasuprot hladnom čeliku. Zelena boja se koristi samo za podatke i svetlo (laser skenera, linije reza, procenti prinosa). Tako je brend boja nosilac informacije, a ne ukras.
- Stranice između 3D scena su svetle, sa bež tonom drveta, a tekst je kratak i tačan.
- **Pokret je mehanički i precizan:** linearan pomak kao na traci, kratka zaustavljanja kao kod pozicionera, bez odskakanja. Oštar „klik" samo na spoju zubaca i na rezu.

### Ostatak stranice (bez 3D-a)

Hero sa njihovim fotografijama (kao engitec), zatim kratka izjava i brojke, pa 3D linija, pa lista proizvoda sa slikama na hover. Posle toga „100 %" vrednosti sa njihovog sajta, poziv na Fenster/CNC Forum i kontakt.

## Šta nisam proverio

- Broj zaposlenih, godinu osnivanja i prihod nisam našao na njihovom sajtu, pa ih ne stavljamo dok ne proverimo.
- Za Powermat 3000 nemamo dobru sliku visoke rezolucije. Do sada je skinut samo Powermat 700 (PNG).
