import Experience from "./Experience";
import YieldCalc from "./YieldCalc";

export type Lang = "de" | "en";

// Cross-sections of what the lines make, as rectangles [x, y, w, h] in a 60 x 60 box; "x" marks wood cut across the grain.
const sq = (y: number, h: number, n: number, x0 = 5, w = 50) => Array.from({ length: n }, (_, i) => [x0 + (i * w) / n, y, w / n, h, 1]);

// A glued window scantling, 78 x 68 mm, drawn to scale: three lamellas, their growth rings turned against each other.
function KantelSection() {
  const X = 11, Y = 16, W = 78, H = 68, h = H / 3;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>{[0, 1, 2].map((k) => <clipPath id={`lam${k}`} key={k}><rect x={X} y={Y + k * h} width={W} height={h} /></clipPath>)}</defs>
      {[0, 1, 2].map((k) => {
        // the pith sits outside each lamella, below one and above the next
        const cy = k % 2 ? Y + k * h - 26 : Y + (k + 1) * h + 26;
        return (
          <g key={k} clipPath={`url(#lam${k})`}>
            <rect className="lam" x={X} y={Y + k * h} width={W} height={h} />
            {Array.from({ length: 12 }, (_, r) => <circle key={r} className="ring" cx={50 + (k - 1) * 9} cy={cy} r={28 + r * 4.2} />)}
          </g>
        );
      })}
      {[1, 2].map((k) => <line key={k} className="glue" x1={X} x2={X + W} y1={Y + k * h} y2={Y + k * h} />)}
      <rect className="edge" x={X} y={Y} width={W} height={H} />
    </svg>
  );
}

// Every text sits next to its translation, so the two pages cannot drift apart.
export default function Landing({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (de: string, english: string) => (en ? english : de);
  // product pages stay on the German site: their English URLs are not mapped one to one
  const WEINIG = "https://www.weinig.de/de";
  const HOME = en ? "https://www.weinig.de/en/" : "https://www.weinig.de/de/";

  const APPLICATIONS = [
    { name: t("Brettschichtholz (BSH)", "Glulam (BSH)"), href: "brettschichtholz-bsh-duo-und-triobalken", rects: Array.from({ length: 6 }, (_, i) => [18, 6 + i * 8, 24, 8, 0]) },
    { name: t("Duo- und Triobalken", "Duo and trio beams"), href: "brettschichtholz-bsh-duo-und-triobalken", rects: Array.from({ length: 3 }, (_, i) => [15, 15 + i * 10, 30, 10, 0]) },
    { name: t("Brettsperrholz (BSP / CLT)", "Cross-laminated timber (CLT)"), href: "brettsperrholz-bspclt", rects: [[5, 15, 50, 6, 0], ...sq(21, 6, 8), [5, 27, 50, 6, 0], ...sq(33, 6, 8), [5, 39, 50, 6, 0]] },
    { name: t("Massivholzplatten", "Solid wood panels"), href: "massivholzplatten", rects: sq(24, 12, 6) },
    { name: t("Mehrschichtplatten", "Multi-layer panels"), href: "mehrschichtplatten", rects: [[5, 22, 50, 4, 0], ...sq(26, 8, 10), [5, 34, 50, 4, 0]] },
    { name: t("Blockverleimung", "Block gluing"), href: "blockverleimung", rects: [0, 1, 2].flatMap((r) => sq(12 + r * 12, 12, 3, 12, 36)) },
  ];
  const STEPS_WSS = [
    [t("Konzept", "Concept"), t("Eine Lösung für Ihre Produktionsaufgabe und Ihren Business-Case.", "A solution for your production task and your business case.")],
    [t("Planung", "Planning"), t("Vom Produktionsprozess über das Layout bis zum Leitrechner.", "From the production process and the layout to the line computer.")],
    [t("Auftragsabwicklung", "Project execution"), t("Als Generalunternehmer oder als Systemintegrator, nach Ihrer Wahl.", "As general contractor or as system integrator, your choice.")],
    [t("Produktionsbegleitung", "Production support"), t("Ein Projektleiter bleibt bis zum Ende der Gewährleistung Ihr Ansprechpartner.", "One project manager stays your contact until the warranty ends.")],
  ];
  // the catalogue in the order the wood meets it; each card carries one figure WEINIG publishes, and machines in the films link back to them
  const PORTFOLIO = [
    { step: t("Auftrennen", "Ripping"), line: "SOLID RIP", img: "rip.jpg", fact: t("Bis zu 2 automatisch verstellbare Sägeblätter, beim SOLID RIP V.", "Up to 2 automatically adjustable blades, on the SOLID RIP V."), web: `${WEINIG}/produkte/auftrennsaegen.html` },
    { step: t("Scannen", "Scanning"), line: "SOLID SCAN", img: "scan.jpg", fact: t("Erkennt Holzmerkmale auf bis zu 4 Seiten.", "Detects wood features on up to 4 sides."), film: "#linie", web: `${WEINIG}/produkte/scannersysteme/solid-scan-4000-serie.html` },
    { step: t("Kappen", "Cross-cutting"), line: "SOLID CUT TF", img: "cut.jpg", fact: t("Sägeblatt Ø 500 mm, Querschnitt bis 160 × 80 mm.", "Ø 500 mm blade, cross-section up to 160 × 80 mm."), film: "#linie", web: `${WEINIG}/produkte/optimierkappsaegen/solid-cut-tf-2000-serie.html` },
    { step: t("Keilzinken", "Finger-jointing"), line: "SOLID JOINT", img: "joint.jpg", fact: t("Bis zu 200 Teile pro Minute, 28 km in einer 8-Stunden-Schicht.", "Up to 200 pieces a minute, 28 km in one 8-hour shift."), film: "#linie", web: `${WEINIG}/produkte/keilzinkenanlagen.html` },
    { step: t("Hobeln und Profilieren", "Planing and moulding"), line: "SOLID PROFILE", img: "profile.jpg", fact: t("7.000 U/min und bis zu 15 % mehr Vorschub, beim P 700.", "7,000 rpm and up to 15 % more feed, on the P 700."), film: "#hobeln", web: `${WEINIG}/produkte/hobelmaschinen-und-kehlmaschinen/solid-profile-p-serie.html` },
    { step: t("Verleimen", "Gluing"), line: "SOLID PRESS", img: "press.jpg", fact: t("Fünf Baureihen: L, T, C, B und X.", "Five series: L, T, C, B and X."), film: "#kantel", web: `${WEINIG}/produkte/verleimpressen.html` },
    { step: t("Fenster und CNC", "Windows and CNC"), line: "SOLID CNC CR", img: "cnc.png", fact: t("20 bis 85 komplette Fensterrahmen pro Schicht. Über 700 Installationen weltweit.", "20 to 85 complete window frames per shift. More than 700 installations worldwide."), film: "#fenster", web: "https://deals.weinig.com/fensterproduktion" },
    { step: t("Werkzeuge und Schleifen", "Tools and grinding"), line: "SOLID GRIND", img: "grind.jpg", fact: t("Universelle Werkzeug-Schleifmaschinen, dazu PowerLock für schnellen Werkzeugwechsel.", "Universal tool grinders, plus PowerLock for fast tool changes."), web: `${WEINIG}/produkte/werkzeugschleifmaschinen.html` },
  ];
  const DIGITAL = [
    ["App Suite", t("Echtzeit-Monitoring des Maschinenparks und ein direkter Draht zum Service.", "Live monitoring of the machine park and a direct line to service.")],
    ["Control Suite", t("Steuert Produktionslinien, legt Aufträge an und verfolgt sie.", "Runs production lines, creates orders and tracks them.")],
    [t("viaBOX und viaConnector Edge", "viaBOX and viaConnector Edge"), t("Verbinden WEINIG Maschinen mit Softwarelösungen und exportieren in andere Systeme.", "Connect WEINIG machines to software and export to other systems.")],
    ["Izy", t("Bringt auch einzelne Maschinen ins Netz.", "Brings single machines onto the network too.")],
  ];
  const LIFETIME = en
    ? ["Spare parts", "On-site service", "Technical hotline", "WEINIG tools", "Grinding service", "Repairs", "Maintenance and inspection", "Training Center"]
    : ["Ersatzteilservice", "Vor-Ort-Service", "Technische Hotline", "WEINIG Werkzeuge", "Schleifservice", "Reparaturen", "Wartung und Inspektion", "Training-Center"];
  const VALUES = [
    [t("Qualität", "quality"), t("Sorgfalt bis ins kleinste Detail, damit eine Maschine lange und wirtschaftlich läuft.", "Care down to the smallest detail, so a machine runs long and pays its way.")],
    [t("Zuverlässigkeit", "reliability"), t("Über 150.000 verkaufte Maschinen arbeiten weltweit. Ihre Verfügbarkeit entscheidet über den Gewinn.", "More than 150,000 machines sold work around the world. Their uptime decides the profit.")],
    [t("Beratung", "advice"), t("Systemplanung von WEINIG Concept oder der Experte vor Ort, je nach Aufgabe.", "System planning from WEINIG Concept or the expert on site, depending on the job.")],
    [t("Service", "service"), t("Ein weltweites Servicenetz mit geschulten Technikern, die schnell vor Ort sind.", "A worldwide service network with trained technicians who reach you fast.")],
    [t("von A bis Z", "from A to Z"), t("Von der Einzelmaschine bis zur schlüsselfertigen, automatisierten Anlage.", "From the single machine to the turnkey, automated plant.")],
  ];
  const navLinks = (
    <>
      <a href="#linie">{t("Fertigungslinie", "Production line")}</a><a href="#ausbeute">{t("Ausbeute", "Yield")}</a><a href="#produkte">{t("Produkte", "Products")}</a><a href="#werte">{t("Unternehmen", "Company")}</a><a href="#forum">{t("Fenster / CNC Forum", "Window / CNC Forum")}</a>
    </>
  );
  const switchTo = <a className="lang" href={en ? "/" : "/en"} hrefLang={en ? "de" : "en"} lang={en ? "de" : "en"}>{en ? "Deutsch" : "English"}</a>;
  const schematic = t("Schematische Darstellung, keine Maschinenzeichnung.", "Schematic view, not a machine drawing.");

  return (
    <>
      <div className="pre" id="pre" aria-hidden="true">
        <i className="curtain top" /><i className="curtain bot" /><canvas className="pre-gl" id="preGl" /><i className="seam" />
        <div className="pre-inner">
          <img src="/img/logo.png" width={120} height={120} alt="" />
          <span className="pre-count">000</span>
          <span className="pre-phrase">{t("Holz wächst", "Wood grows")}</span>
          <div className="pre-track"><div className="pre-bar" /></div>
        </div>
      </div>
      <noscript><style>{`.pre{display:none}`}</style></noscript>

      <header className="nav" id="nav">
        <a href="#top" className="logo" aria-label={t("WEINIG, zurück nach oben", "WEINIG, back to top")}><img src="/img/logo.png" width={120} height={120} alt="Michael Weinig AG" /></a>
        <nav aria-label={t("Hauptmenü", "Main menu")}>
          {navLinks}{switchTo}<a href="#kontakt" className="cta">{t("Kontakt", "Contact")}</a>
        </nav>
        <details className="nav-menu" id="navMenu">
          <summary aria-label={t("Menü", "Menu")}><i /><i /></summary>
          <div className="menu-panel">
            <div className="menu-links">{navLinks}</div>
            <p className="menu-foot"><a href="tel:+499341860">+49 9341 860</a><span>Weinigstraße 2/4, 97941 Tauberbischofsheim</span></p>
          </div>
        </details>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="hero-media" aria-hidden="true"><img src="/img/hero-halle.jpg" alt="" width={1600} height={900} fetchPriority="high" /></div>
          <canvas className="gl" aria-hidden="true" />
          <div className="hero-copy">
            <h1 id="heroTitle">WEINIG<br />{t("bietet mehr.", "offers more.")}</h1>
            <div className="hero-foot">
              <p id="heroSub">{t("Maschinen und Anlagen für Massivholz", "Machines and plants for solid wood")}<br />{t("und Holzwerkstoffe.", "and wood-based materials.")}</p>
              <a className="btn" href="#linie">{t("Zur Fertigungslinie", "See the production line")}</a>
            </div>
            <p className="hero-after" id="heroAfter">{t("Vom Rohholz zum fertigen Fenster. Aus einer Hand.", "From rough timber to the finished window. From one supplier.")}</p>
          </div>
        </section>

        <section className="intro" id="intro">
          <h2 className="reveal">{t("Mehr Ausbeute", "More yield")}<br />{t("aus jedem Brett.", "from every board.")}</h2>
          <div className="intro-body">
            <p className="scrubtext">{t("Ein Ast an der falschen Stelle, und das Brett ist Ausschuss. WEINIG Scanner finden ihn, bevor gesägt wird. Die Optimierung schneidet um ihn herum.", "One knot in the wrong place and the board is scrap. WEINIG scanners find it before the saw does. The optimisation cuts around it.")}</p>
            <p className="scrubtext">{t("Kurze Reststücke werden keilgezinkt und zu einer endlosen Lamelle verpresst. Danach hobelt und profiliert der Powermat alle vier Seiten in einem Durchgang.", "Short offcuts are finger-jointed and pressed into an endless lamella. Then the Powermat planes and moulds all four sides in a single pass.")}</p>
          </div>
          <ul className="ledger">
            <li><b>{t("150.000+", "150,000+")}</b><span>{t("verkaufte WEINIG Maschinen arbeiten in aller Welt.", "WEINIG machines sold, at work all over the world.")}</span></li>
            <li><b>{t("60.000+", "60,000+")}</b><span>{t("automatische Hobel- und Profiliermaschinen. Damit ist WEINIG Marktführer.", "automatic planing and moulding machines. That makes WEINIG the market leader.")}</span></li>
            <li><b>200</b><span>{t("m/min Vorschub bei Einzelbrettanlagen und Durchlaufpressen.", "m/min feed on single-board lines and continuous presses.")}</span></li>
            <li><b>1</b><span>{t("Partner von der Einzelmaschine bis zur schlüsselfertigen Linie.", "partner from the single machine to the turnkey line.")}</span></li>
          </ul>
        </section>

        <section className="pinwrap" id="linie">
          <div className="stage line-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="tags" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>{t("Jedes Brett ist anders.", "Every board is different.")}</h2>
                <p>{t("Holz ist gewachsen, nicht gegossen. Äste, Risse und Verfärbungen sitzen in jedem Brett woanders. Bevor die Säge ansetzt, muss die Linie wissen, wo.", "Wood is grown, not cast. Knots, cracks and stains sit somewhere else in every board. Before the saw goes in, the line has to know where.")}</p>
                <small className="hint">{t("Scrollen Sie, um das Brett durch die Linie zu schicken.", "Scroll to send the board down the line.")}</small>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>01</b><small>{t("Scannen", "Scanning")}</small></span>
                <h2>{t("Der Scanner sieht alle vier Seiten.", "The scanner sees all four sides.")}</h2>
                <p>{t("Laser und Kameras erfassen jedes Brett bei voller Vorschubgeschwindigkeit. Auch die Unterseite, die auf dem Band niemand sieht.", "Lasers and cameras capture every board at full feed speed. Including the underside, which nobody sees on the conveyor.")}</p>
                <small>WEINIG SOLID SCAN C 4000</small>
              </article>
              <article>
                <h2>{t("Aus dem Brett wird ein Datensatz.", "The board becomes a data set.")}</h2>
                <p>{t("Jeder Fehler bekommt Position, Größe und Typ. Gezählt wird, sobald er den Laser passiert hat.", "Every defect gets a position, a size and a type. It counts once it has passed the laser.")}</p>
                <ul className="found">
                  <li><i style={{ background: "#ffb547" }} />{t("Äste", "Knots")}<b id="nAst">0</b></li>
                  <li><i style={{ background: "#ff5d4f" }} />{t("Risse", "Cracks")}<b id="nRiss">0</b></li>
                  <li><i style={{ background: "#79b4ff" }} />{t("Bläue", "Blue stain")}<b id="nBlaeue">0</b></li>
                </ul>
              </article>
              <article>
                <h2>{t("Jetzt weiß die Säge, wo sie schneidet.", "Now the saw knows where to cut.")}</h2>
                <p>{t("Die Optimierung rechnet für jedes Brett den Schnitt mit der höchsten Ausbeute. Stücke, die zu kurz wären, gehen gleich mit raus.", "The optimisation works out the cut with the highest yield for every board. Pieces that would be too short go out with the defects.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>02</b><small>{t("Kappen", "Cross-cut")}</small></span>
                <h2>{t("Sechs Schnitte, und die Fehler sind draußen.", "Six cuts, and the defects are gone.")}</h2>
                <p>{t("Fünf Antriebswalzen unten und Druckrollen oben fahren das Brett auf jeden Schnitt. Das Blatt mit Ø 500 mm kommt pneumatisch von unten, Druckluft bläst die Fehlerstücke vom Tisch.", "Five drive rollers below and pressure rollers above move the board to each cut. The Ø 500 mm blade rises pneumatically from below, and compressed air blows the defect pieces off the table.")}</p>
                <small>WEINIG SOLID CUT TF 2000</small>
              </article>
              <article>
                <h2>{t("4 Stücke, 2.250 mm fehlerfreies Holz.", "4 pieces, 2,250 mm of clear wood.")}</h2>
                <p>{t("Keines ist länger als 700 mm. Genau diese Längen verarbeitet die Keilzinkenanlage.", "None is longer than 700 mm. Exactly the lengths the finger-jointing line takes.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>03</b><small>{t("Keilzinken", "Finger joint")}</small></span>
                <h2>{t("Wo der Ast war, sitzen jetzt Zinken.", "Where the knot was, there are fingers now.")}</h2>
                <p>{t("Hochkant im Paket laufen die Stücke an Vorritzer und Fräser vorbei, erst rechts, dann links. Danach haben beide Enden 15 mm lange Zinken und Leim.", "Standing on edge in a package, the pieces pass the scoring saw and the cutter, first on the right, then on the left. Both ends now carry 15 mm fingers and glue.")}</p>
                <small>WEINIG SOLID JOINT PS 2000</small>
              </article>
              <article>
                <h2>{t("Aus kurzen Stücken wird eine endlose Lamelle.", "Short pieces become an endless lamella.")}</h2>
                <p>{t("Die Presse schiebt die Zinken ineinander. Bis zu 200 Teile pro Minute, bis 6,1 m Ausgangslänge. Als Nächstes läuft die Lamelle in den Hobel.", "The press pushes the fingers together. Up to 200 pieces a minute, up to 6.1 m output length. Next, the lamella runs into the planer.")}</p>
                <small>{schematic}</small>
              </article>
            </div>
          </div>
        </section>

        <YieldCalc lang={lang} />

        <section className="pinwrap" id="hobeln">
          <div className="stage planer-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="tags" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>{t("Vier Seiten in einem Durchgang.", "Four sides in one pass.")}</h2>
                <p>{t("Aus der Keilzinkung kommt eine endlose Lamelle, aber noch sägerau: 140 × 45 mm, mit einer Keilzinkung alle gut 50 cm. Der SOLID PROFILE P 700 hobelt sie in einem Durchlauf auf allen vier Seiten.", "The finger-jointer delivers an endless lamella, still rough-sawn: 140 × 45 mm, with a finger joint every 50 cm or so. The SOLID PROFILE P 700 planes all four sides in one pass.")}</p>
                <small>WEINIG SOLID PROFILE P 700</small>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>04</b><small>{t("Abrichten", "Surfacing")}</small></span>
                <h2>{t("Zuerst die Unterseite, dann die Kante.", "First the underside, then the edge.")}</h2>
                <p>{t("Die untere Spindel hobelt die Unterseite eben, die rechte fügt die Kante am Anschlag. Von diesen zwei Flächen aus misst die Maschine alles Weitere.", "The bottom spindle planes the underside flat, the right one straightens the edge against the fence. The machine measures everything else from these two faces.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>05</b><small>{t("Auf Maß", "To size")}</small></span>
                <h2>{t("Aus 140 × 45 werden 132 × 40 mm.", "140 × 45 becomes 132 × 40 mm.")}</h2>
                <p>{t("Die linke Spindel hobelt auf Breite, die obere auf Dicke. Vorschubwalzen drücken das Holz dabei auf den Tisch.", "The left spindle planes to width, the top one to thickness. Feed rollers hold the wood down on the table.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>06</b><small>{t("Profilieren", "Moulding")}</small></span>
                <h2>{t("Das Messer ist das Negativ des Profils.", "The knife is the profile's negative.")}</h2>
                <p>{t("Wo das Profil tief ist, steht das Messer weit vor. Beim P 700 laufen die Spindeln standardmäßig mit 7.000 U/min. Das erlaubt bis zu 15 % mehr Vorschub als bei herkömmlichen Kehlmaschinen.", "Where the profile is deep, the knife reaches far out. On the P 700 the spindles run at 7,000 rpm as standard. That allows up to 15 % more feed than conventional moulders.")}</p>
                <small>{t("Optional 8.000 U/min", "8,000 rpm optional")}</small>
              </article>
              <article>
                <h2>{t("Anderes Profil, anderes Werkzeug.", "Another profile, another tool.")}</h2>
                <p>{t("Jedes Profil braucht sein eigenes Messer. Wählen Sie, was die Maschine als Nächstes fertigt:", "Every profile needs its own knife. Pick what the machine makes next:")}</p>
                <div className="profiles" role="group" aria-label={t("Profil wählen", "Choose a profile")}>
                  <button type="button" aria-pressed="true">{t("Bodendiele", "Floorboard")}</button>
                  <button type="button" aria-pressed="false">{t("Rhombusprofil", "Rhombus cladding")}</button>
                  <button type="button" aria-pressed="false">{t("Stülpschalung", "Weatherboard")}</button>
                </div>
                <small>{schematic}</small>
              </article>
            </div>
          </div>
        </section>

        {/* between the planer and the window: how a planed lamella becomes window timber */}
        <section className="lower kantel" id="kantel">
          <div className="split">
            <div>
              <h2 className="reveal">{t("Drei Lamellen, eine Fensterkantel.", "Three lamellas, one window scantling.")}</h2>
              <p className="lede">{t("Fensterholz muss jahrzehntelang gerade bleiben. Deshalb wird es nicht aus einem Stück geschnitten, sondern aus gehobelten Lamellen verleimt, die Jahresringe gegeneinander gedreht.", "Window timber has to stay straight for decades. So it is not cut from one piece but glued from planed lamellas, with the growth rings turned against each other.")}</p>
              <ul className="kantel-facts">
                <li><b>3</b><span>{t("Lamellen, keilgezinkt und gehobelt wie oben im Film.", "lamellas, finger-jointed and planed as in the film above.")}</span></li>
                <li><b>78 × 68</b><span>{t("mm Querschnitt. Daraus fräst die CNC gleich einen Fensterflügel.", "mm cross-section. The CNC mills a window sash from it next.")}</span></li>
                <li><b>SOLID PRESS</b><span>{t("Verleimpressen von WEINIG.", "Glue presses from WEINIG.")} <a href={`${WEINIG}/produkte/verleimpressen.html`} target="_blank" rel="noopener">{t("Auf weinig.de", "On weinig.de")}</a></span></li>
              </ul>
            </div>
            <figure className="kantel-fig">
              <KantelSection />
              <figcaption>{t("Querschnitt der Kantel. Die dunklen Linien sind die Leimfugen.", "Cross-section of the scantling. The dark lines are the glue lines.")}</figcaption>
            </figure>
          </div>
        </section>

        <section className="pinwrap" id="fenster">
          <div className="stage window-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>{t("Ein Fenster, ab Losgröße 1.", "A window, from batch size 1.")}</h2>
                <p>{t("Ein Flügel braucht vier dieser Kanteln. Die SOLID CNC CR macht daraus fertige Rahmenteile, auch wenn nur ein einziges Fenster bestellt ist.", "A sash needs four of these scantlings. The SOLID CNC CR turns them into finished frame parts, even when only one window is on order.")}</p>
                <small>WEINIG SOLID CNC CR 400 V</small>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>07</b><small>{t("Spannen", "Clamping")}</small></span>
                <h2>{t("Die Klemmen halten, das Aggregat fährt.", "The clamps hold, the spindle moves.")}</h2>
                <p>{t("Die WEINIG 3D-Klemmtechnik hält jedes Teil so, dass das Werkzeug fast überall ansetzen kann. Das Profil mit dem Glasfalz entsteht in derselben Aufspannung.", "WEINIG 3D clamping holds each part so the tool can reach almost every face. The profile with the glazing rebate is cut in the same set-up.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>08</b><small>{t("Zapfen", "Tenons")}</small></span>
                <h2>{t("Profilieren, Bohren und Fräsen in einem.", "Profiling, drilling and milling in one.")}</h2>
                <p>{t("Nach dem Profil kommen die Zapfen an die Enden der Riegel. Kein Teil muss dafür an die nächste Maschine.", "After the profile, the rails get tenons on their ends. No part has to move to another machine for it.")}</p>
              </article>
              <article>
                <span className="code"><small>{t("Schritt", "Step")}</small><b>09</b><small>{t("Fügen", "Joining")}</small></span>
                <h2>{t("Vier Teile, ein Flügel.", "Four parts, one sash.")}</h2>
                <p>{t("Die Zapfen der Riegel greifen in die Schenkel. Je nach Modell fertigt eine SOLID CNC CR 20 bis 85 komplette Fensterrahmen pro 8-Stunden-Schicht.", "The rail tenons go into the stiles. Depending on the model, a SOLID CNC CR makes 20 to 85 complete window frames per 8-hour shift.")}</p>
                <small>{t("WEINIG Angabe, gemessen am WEINIG Musterfenster.", "WEINIG figure, measured on the WEINIG sample window.")}</small>
              </article>
              <article>
                <h2>{t("Vom Rohholz zum Fenster.", "From rough timber to window.")}</h2>
                <p>{t("Jeder Schritt auf dieser Seite läuft auf einer WEINIG Maschine. Am 11. und 12. November 2026 zeigt WEINIG die Fensterfertigung live, beim Fenster / CNC Forum.", "Every step on this page runs on a WEINIG machine. On 11 and 12 November 2026, WEINIG shows window production live at the Window / CNC Forum.")}</p>
                <small>{schematic}</small>
              </article>
            </div>
          </div>
        </section>

        <section className="lower systeme" id="systeme">
          <div className="split">
            <h2 className="reveal">{t("Von der Einzelmaschine bis zur schlüsselfertigen Linie.", "From the single machine to the turnkey line.")}</h2>
            <div className="split-body">
              <p className="lede">{t("WEINIG System Solutions verbindet Maschinen der ganzen Gruppe zu einer Anlage. Wo das eigene Portfolio nicht reicht, ergänzt das Team zugekaufte Komponenten.", "WEINIG System Solutions links machines from across the group into one plant. Where the group's own range stops, the team adds bought-in components.")}</p>
              <ol className="phases">
                {STEPS_WSS.map(([title, d]) => <li key={title}><b>{title}</b><span>{d}</span></li>)}
              </ol>
            </div>
          </div>
          <figure className="wide-photo"><img src="/img/system.jpg" alt={t("Gestapelte Lamellen vor einer WEINIG Anlage mit Absaugleitungen", "Stacked lamellas in front of a WEINIG plant with extraction ducts")} width={1280} height={720} loading="lazy" /></figure>
          <h3 className="list-title">{t("Was auf WEINIG Linien entsteht", "What WEINIG lines make")}</h3>
          <ul className="apps">
            {APPLICATIONS.map((a) => (
              <li key={a.name}>
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  {a.rects.map(([x, y, w, h, cross], i) => <rect key={i} x={x} y={y} width={w} height={h} className={cross ? "x" : undefined} />)}
                </svg>
                <span>{a.name}</span>
                <a href={`${WEINIG}/systemloesungen/anwendungsbeispiele/${a.href}.html`} target="_blank" rel="noopener">{t("Anwendungsbeispiel", "Application example")}<span className="sr"> {a.name} {t("auf weinig.de", "on weinig.de")}</span></a>
              </li>
            ))}
          </ul>
        </section>

        <section className="lower produkte" id="produkte">
          <h2 className="reveal">{t("Für jeden Schritt eine Maschine.", "A machine for every step.")}</h2>
          <ol className="catalog">
            {PORTFOLIO.map((r) => (
              <li key={r.step}>
                <figure><img src={`/img/produkte/${r.img}`} alt={`WEINIG ${r.line}`} width={480} height={270} loading="lazy" /></figure>
                <span className="cat-step">{r.step}</span>
                <h3>{r.line}</h3>
                <p>{r.fact}</p>
                <span className="cat-links">
                  {r.film && <a href={r.film}>{t("Im Film", "In the film")}<span className="sr">: {r.line}</span></a>}
                  <a href={r.web} target="_blank" rel="noopener">weinig.de<span className="sr">: {r.line}</span></a>
                </span>
              </li>
            ))}
          </ol>
          <div className="catalog-foot">
            <p><b>HOLZ-HER</b> {t("ist die Marke der WEINIG Gruppe für Holzwerkstoffe: Kantenanleimen, CNC und Plattensägen.", "is the WEINIG Group brand for wood-based panels: edge banding, CNC and panel saws.")}</p>
            <a className="btn calc-cta" href="#kontakt">{t("Welche Maschine passt zu Ihrem Holz?", "Which machine suits your wood?")}</a>
          </div>
        </section>

        <section className="lower service" id="service">
          <div className="split">
            <h2 className="reveal">{t("Eine Maschine läuft Jahrzehnte.", "A machine runs for decades.")}</h2>
            <p className="lede split-body">{t("WEINIG LifeTime Services betreut die Investition vor, während und nach dem Kauf. Am meisten zählt der Dauerbetrieb.", "WEINIG LifeTime Services looks after the investment before, during and after the purchase. What counts most is the years of running.")}</p>
          </div>
          <div className="service-grid">
            <div>
              <h3>W4.0 digital</h3>
              <dl className="defs">
                {DIGITAL.map(([title, d]) => <div key={title}><dt>{title}</dt><dd>{d}</dd></div>)}
              </dl>
            </div>
            <div>
              <h3>LifeTime Services</h3>
              <ul className="services">{LIFETIME.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="hotline">{t("Service-Hotline", "Service hotline")} <a href="tel:+49934186222">+49 9341 86 222</a></p>
            </div>
            <figure><img src="/img/service.jpg" alt={t("WEINIG Servicetechniker an einer Maschine", "WEINIG service technician at a machine")} width={1280} height={720} loading="lazy" /></figure>
          </div>
        </section>

        <section className="lower werte" id="werte">
          <h2 className="reveal">{t("Fünfmal 100 %.", "100 %, five times.")}</h2>
          <ul className="values">
            {VALUES.map(([title, d]) => <li key={title}><b>100 % {title}</b><span>{d}</span></li>)}
          </ul>
        </section>

        <section className="forum" id="forum">
          <h2 className="reveal">{t("Fenster / CNC Forum", "Window / CNC Forum")}</h2>
          <p>{t("11. und 12. November 2026. Für alle, die Fenster und Türen fertigen und die Maschinen dahinter sehen wollen.", "11 and 12 November 2026. For everyone who makes windows and doors and wants to see the machines behind them.")}</p>
          <a className="btn" href="#kontakt">{t("Kontakt aufnehmen", "Get in touch")}</a>
        </section>
      </main>

      <footer className="foot" id="kontakt">
        <h2>{t("Kontakt", "Contact")}</h2>
        <address>
          <b>Michael Weinig AG</b>
          <span>{t("Weinigstraße 2/4, 97941 Tauberbischofsheim", "Weinigstraße 2/4, 97941 Tauberbischofsheim, Germany")}</span>
          <a href="tel:+499341860">+49 9341 860</a>
          <a href={HOME} target="_blank" rel="noopener">weinig.de</a>
        </address>
        <p className="foot-note">{t("Konzeptentwurf für die Michael Weinig AG. Angaben und Bilder von weinig.de.", "Concept draft for Michael Weinig AG. Facts and images from weinig.de.")} {switchTo}</p>
      </footer>
      <Experience />
    </>
  );
}
