import Experience from "./Experience";

const WEINIG = "https://www.weinig.de/de";
// Cross-sections of what the lines make, as rectangles [x, y, w, h] in a 60 x 60 box; "x" marks wood cut across the grain.
const sq = (y: number, h: number, n: number, x0 = 5, w = 50) => Array.from({ length: n }, (_, i) => [x0 + (i * w) / n, y, w / n, h, 1]);
const APPLICATIONS = [
  { name: "Brettschichtholz (BSH)", href: "brettschichtholz-bsh-duo-und-triobalken", rects: Array.from({ length: 6 }, (_, i) => [18, 6 + i * 8, 24, 8, 0]) },
  { name: "Duo- und Triobalken", href: "brettschichtholz-bsh-duo-und-triobalken", rects: Array.from({ length: 3 }, (_, i) => [15, 15 + i * 10, 30, 10, 0]) },
  { name: "Brettsperrholz (BSP / CLT)", href: "brettsperrholz-bspclt", rects: [[5, 15, 50, 6, 0], ...sq(21, 6, 8), [5, 27, 50, 6, 0], ...sq(33, 6, 8), [5, 39, 50, 6, 0]] },
  { name: "Massivholzplatten", href: "massivholzplatten", rects: sq(24, 12, 6) },
  { name: "Mehrschichtplatten", href: "mehrschichtplatten", rects: [[5, 22, 50, 4, 0], ...sq(26, 8, 10), [5, 34, 50, 4, 0]] },
  { name: "Blockverleimung", href: "blockverleimung", rects: [0, 1, 2].flatMap((r) => sq(12 + r * 12, 12, 3, 12, 36)) },
];
const STEPS_WSS = [
  ["Konzept", "Eine Lösung für Ihre Produktionsaufgabe und Ihren Business-Case."],
  ["Planung", "Vom Produktionsprozess über das Layout bis zum Leitrechner."],
  ["Auftragsabwicklung", "Als Generalunternehmer oder als Systemintegrator, nach Ihrer Wahl."],
  ["Produktionsbegleitung", "Ein Projektleiter bleibt bis zum Ende der Gewährleistung Ihr Ansprechpartner."],
];
// the portfolio in the order the wood meets it; machines shown in the films above link back to them
const PORTFOLIO = [
  { step: "Auftrennen", line: "SOLID RIP, SOLID SPLIT", href: `${WEINIG}/produkte/auftrennsaegen.html` },
  { step: "Scannen", line: "SOLID SCAN", href: "#linie" },
  { step: "Kappen", line: "SOLID CUT", href: "#linie" },
  { step: "Keilzinken", line: "SOLID JOINT", href: "#linie" },
  { step: "Hobeln und Profilieren", line: "SOLID PROFILE", href: "#hobeln" },
  { step: "Verleimen", line: "SOLID PRESS", href: `${WEINIG}/produkte/verleimpressen.html` },
  { step: "Fenster und CNC", line: "SOLID CNC CR, Vario MC 50", href: "#fenster" },
  { step: "Werkzeuge und Schleifen", line: "SOLID GRIND, PowerLock", href: `${WEINIG}/produkte/werkzeugschleifmaschinen.html` },
];
const DIGITAL = [
  ["App Suite", "Echtzeit-Monitoring des Maschinenparks und ein direkter Draht zum Service."],
  ["Control Suite", "Steuert Produktionslinien, legt Aufträge an und verfolgt sie."],
  ["viaBOX und viaConnector Edge", "Verbinden WEINIG Maschinen mit Softwarelösungen und exportieren in andere Systeme."],
  ["Izy", "Bringt auch einzelne Maschinen ins Netz."],
];
const LIFETIME = ["Ersatzteilservice", "Vor-Ort-Service", "Technische Hotline", "WEINIG Werkzeuge", "Schleifservice", "Reparaturen", "Wartung und Inspektion", "Training-Center"];
const VALUES = [
  ["Qualität", "Sorgfalt bis ins kleinste Detail, damit eine Maschine lange und wirtschaftlich läuft."],
  ["Zuverlässigkeit", "Über 150.000 verkaufte Maschinen arbeiten weltweit. Ihre Verfügbarkeit entscheidet über den Gewinn."],
  ["Beratung", "Systemplanung von WEINIG Concept oder der Experte vor Ort, je nach Aufgabe."],
  ["Service", "Ein weltweites Servicenetz mit geschulten Technikern, die schnell vor Ort sind."],
  ["von A bis Z", "Von der Einzelmaschine bis zur schlüsselfertigen, automatisierten Anlage."],
];

export default function Page() {
  return (
    <>
      <div className="pre" id="pre" aria-hidden="true">
        <i className="curtain top" /><i className="curtain bot" /><canvas className="pre-gl" id="preGl" /><i className="seam" />
        <div className="pre-inner">
          <img src="/img/logo.png" width={120} height={120} alt="" />
          <span className="pre-count">000</span>
          <span className="pre-phrase">Holz wächst</span>
          <div className="pre-track"><div className="pre-bar" /></div>
        </div>
      </div>
      <noscript><style>{`.pre{display:none}`}</style></noscript>

      <header className="nav" id="nav">
        <a href="#top" className="logo" aria-label="WEINIG, zurück nach oben"><img src="/img/logo.png" width={120} height={120} alt="Michael Weinig AG" /></a>
        <nav aria-label="Hauptmenü">
          <a href="#linie">Fertigungslinie</a><a href="#produkte">Produkte</a><a href="#werte">Unternehmen</a><a href="#forum">Fenster / CNC Forum</a><a href="#kontakt" className="cta">Kontakt</a>
        </nav>
        <details className="nav-menu" id="navMenu">
          <summary aria-label="Menü"><i /><i /></summary>
          <div className="menu-panel">
            <div className="menu-links"><a href="#linie">Fertigungslinie</a><a href="#produkte">Produkte</a><a href="#werte">Unternehmen</a><a href="#forum">Fenster / CNC Forum</a></div>
            <p className="menu-foot"><a href="tel:+499341860">+49 9341 860</a><span>Weinigstraße 2/4, 97941 Tauberbischofsheim</span></p>
          </div>
        </details>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="hero-media" aria-hidden="true"><img src="/img/hero-halle.jpg" alt="" width={1600} height={900} fetchPriority="high" /></div>
          <canvas className="gl" aria-hidden="true" />
          <div className="hero-copy">
            <h1 id="heroTitle">WEINIG<br />bietet mehr.</h1>
            <div className="hero-foot">
              <p id="heroSub">Maschinen und Anlagen für Massivholz<br />und Holzwerkstoffe.</p>
              <a className="btn" href="#linie">Zur Fertigungslinie</a>
            </div>
            <p className="hero-after" id="heroAfter">Vom Rohholz zum fertigen Fenster. Aus einer Hand.</p>
          </div>
        </section>

        <section className="intro" id="intro">
          <h2 className="reveal">Mehr Ausbeute<br />aus jedem Brett.</h2>
          <div className="intro-body">
            <p className="scrubtext">Ein Ast an der falschen Stelle, und das Brett ist Ausschuss. WEINIG Scanner finden ihn, bevor gesägt wird. Die Optimierung schneidet um ihn herum.</p>
            <p className="scrubtext">Kurze Reststücke werden keilgezinkt und zu einer endlosen Lamelle verpresst. Danach hobelt und profiliert der Powermat alle vier Seiten in einem Durchgang.</p>
          </div>
          <ul className="ledger">
            <li><b>150.000+</b><span>verkaufte WEINIG Maschinen arbeiten in aller Welt.</span></li>
            <li><b>60.000+</b><span>automatische Hobel- und Profiliermaschinen. Damit ist WEINIG Marktführer.</span></li>
            <li><b>200</b><span>m/min Vorschub bei Einzelbrettanlagen und Durchlaufpressen.</span></li>
            <li><b>1</b><span>Partner von der Einzelmaschine bis zur schlüsselfertigen Linie.</span></li>
          </ul>
        </section>

        <section className="pinwrap" id="linie">
          <div className="stage line-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="tags" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>Jedes Brett ist anders.</h2>
                <p>Holz ist gewachsen, nicht gegossen. Äste, Risse und Verfärbungen sitzen in jedem Brett woanders. Bevor die Säge ansetzt, muss die Linie wissen, wo.</p>
                <small className="hint">Scrollen Sie, um das Brett durch die Linie zu schicken.</small>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>01</b><small>Scannen</small></span>
                <h2>Der Scanner sieht alle vier Seiten.</h2>
                <p>Laser und Kameras erfassen jedes Brett bei voller Vorschubgeschwindigkeit. Auch die Unterseite, die auf dem Band niemand sieht.</p>
                <small>WEINIG SOLID SCAN C 4000</small>
              </article>
              <article>
                <h2>Aus dem Brett wird ein Datensatz.</h2>
                <p>Jeder Fehler bekommt Position, Größe und Typ. Gezählt wird, sobald er den Laser passiert hat.</p>
                <ul className="found">
                  <li><i style={{ background: "#ffb547" }} />Äste<b id="nAst">0</b></li>
                  <li><i style={{ background: "#ff5d4f" }} />Risse<b id="nRiss">0</b></li>
                  <li><i style={{ background: "#79b4ff" }} />Bläue<b id="nBlaeue">0</b></li>
                </ul>
              </article>
              <article>
                <h2>Jetzt weiß die Säge, wo sie schneidet.</h2>
                <p>Die Optimierung rechnet für jedes Brett den Schnitt mit der höchsten Ausbeute. Stücke, die zu kurz wären, gehen gleich mit raus.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>02</b><small>Kappen</small></span>
                <h2>Sechs Schnitte, und die Fehler sind draußen.</h2>
                <p>Fünf Antriebswalzen unten und Druckrollen oben fahren das Brett auf jeden Schnitt. Das Blatt mit Ø 500 mm kommt pneumatisch von unten, Druckluft bläst die Fehlerstücke vom Tisch.</p>
                <small>WEINIG SOLID CUT TF 2000</small>
              </article>
              <article>
                <h2>4 Stücke, 2.250 mm fehlerfreies Holz.</h2>
                <p>Keines ist länger als 700 mm. Genau diese Längen verarbeitet die Keilzinkenanlage.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>03</b><small>Keilzinken</small></span>
                <h2>Wo der Ast war, sitzen jetzt Zinken.</h2>
                <p>Hochkant im Paket laufen die Stücke an Vorritzer und Fräser vorbei, erst rechts, dann links. Danach haben beide Enden 15 mm lange Zinken und Leim.</p>
                <small>WEINIG SOLID JOINT PS 2000</small>
              </article>
              <article>
                <h2>Aus kurzen Stücken wird eine endlose Lamelle.</h2>
                <p>Die Presse schiebt die Zinken ineinander. Bis zu 200 Teile pro Minute, bis 6,1 m Ausgangslänge. Als Nächstes läuft die Lamelle in den Hobel.</p>
                <small>Schematische Darstellung, keine Maschinenzeichnung.</small>
              </article>
            </div>
          </div>
        </section>

        <section className="pinwrap" id="hobeln">
          <div className="stage planer-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="tags" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>Vier Seiten in einem Durchgang.</h2>
                <p>Aus der Keilzinkung kommt eine endlose Lamelle, aber noch sägerau: 140 × 45 mm, mit einer Keilzinkung alle gut 50 cm. Der SOLID PROFILE P 700 hobelt sie in einem Durchlauf auf allen vier Seiten.</p>
                <small>WEINIG SOLID PROFILE P 700</small>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>04</b><small>Abrichten</small></span>
                <h2>Zuerst die Unterseite, dann die Kante.</h2>
                <p>Die untere Spindel hobelt die Unterseite eben, die rechte fügt die Kante am Anschlag. Von diesen zwei Flächen aus misst die Maschine alles Weitere.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>05</b><small>Auf Maß</small></span>
                <h2>Aus 140 × 45 werden 132 × 40 mm.</h2>
                <p>Die linke Spindel hobelt auf Breite, die obere auf Dicke. Vorschubwalzen drücken das Holz dabei auf den Tisch.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>06</b><small>Profilieren</small></span>
                <h2>Das Messer ist das Negativ des Profils.</h2>
                <p>Wo das Profil tief ist, steht das Messer weit vor. Beim P 700 laufen die Spindeln standardmäßig mit 7.000 U/min. Das erlaubt bis zu 15 % mehr Vorschub als bei herkömmlichen Kehlmaschinen.</p>
                <small>Optional 8.000 U/min</small>
              </article>
              <article>
                <h2>Anderes Profil, anderes Werkzeug.</h2>
                <p>Jedes Profil braucht sein eigenes Messer. Wählen Sie, was die Maschine als Nächstes fertigt:</p>
                <div className="profiles" role="group" aria-label="Profil wählen">
                  <button type="button" aria-pressed="true">Bodendiele</button>
                  <button type="button" aria-pressed="false">Rhombusprofil</button>
                  <button type="button" aria-pressed="false">Stülpschalung</button>
                </div>
                <small>Schematische Darstellung, keine Maschinenzeichnung.</small>
              </article>
            </div>
          </div>
        </section>

        <section className="pinwrap" id="fenster">
          <div className="stage window-stage">
            <canvas className="gl" aria-hidden="true" />
            <div className="panels">
              <article>
                <h2>Ein Fenster, ab Losgröße 1.</h2>
                <p>Ein Flügel braucht vier Kanteln, jede aus drei Lamellen verleimt. Die SOLID CNC CR macht daraus fertige Rahmenteile, auch wenn nur ein einziges Fenster bestellt ist.</p>
                <small>WEINIG SOLID CNC CR 400 V</small>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>07</b><small>Spannen</small></span>
                <h2>Die Klemmen halten, das Aggregat fährt.</h2>
                <p>Die WEINIG 3D-Klemmtechnik hält jedes Teil so, dass das Werkzeug fast überall ansetzen kann. Das Profil mit dem Glasfalz entsteht in derselben Aufspannung.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>08</b><small>Zapfen</small></span>
                <h2>Profilieren, Bohren und Fräsen in einem.</h2>
                <p>Nach dem Profil kommen die Zapfen an die Enden der Riegel. Kein Teil muss dafür an die nächste Maschine.</p>
              </article>
              <article>
                <span className="code"><small>Schritt</small><b>09</b><small>Fügen</small></span>
                <h2>Vier Teile, ein Flügel.</h2>
                <p>Die Zapfen der Riegel greifen in die Schenkel. Je nach Modell fertigt eine SOLID CNC CR 20 bis 85 komplette Fensterrahmen pro 8-Stunden-Schicht.</p>
                <small>WEINIG Angabe, gemessen am WEINIG Musterfenster.</small>
              </article>
              <article>
                <h2>Vom Rohholz zum Fenster.</h2>
                <p>Jeder Schritt auf dieser Seite läuft auf einer WEINIG Maschine. Am 11. und 12. November 2026 zeigt WEINIG die Fensterfertigung live, beim Fenster / CNC Forum.</p>
                <small>Schematische Darstellung, keine Maschinenzeichnung.</small>
              </article>
            </div>
          </div>
        </section>

        <section className="lower systeme" id="systeme">
          <div className="split">
            <h2 className="reveal">Von der Einzelmaschine bis zur schlüsselfertigen Linie.</h2>
            <div className="split-body">
              <p className="lede">WEINIG System Solutions verbindet Maschinen der ganzen Gruppe zu einer Anlage. Wo das eigene Portfolio nicht reicht, ergänzt das Team zugekaufte Komponenten.</p>
              <ol className="phases">
                {STEPS_WSS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}
              </ol>
            </div>
          </div>
          <figure className="wide-photo"><img src="/img/system.jpg" alt="Gestapelte Lamellen vor einer WEINIG Anlage mit Absaugleitungen" width={1280} height={720} loading="lazy" /></figure>
          <h3 className="list-title">Was auf WEINIG Linien entsteht</h3>
          <ul className="apps">
            {APPLICATIONS.map((a) => (
              <li key={a.name}>
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  {a.rects.map(([x, y, w, h, cross], i) => <rect key={i} x={x} y={y} width={w} height={h} className={cross ? "x" : undefined} />)}
                </svg>
                <span>{a.name}</span>
                <a href={`${WEINIG}/systemloesungen/anwendungsbeispiele/${a.href}.html`} target="_blank" rel="noopener">Anwendungsbeispiel<span className="sr"> {a.name} auf weinig.de</span></a>
              </li>
            ))}
          </ul>
        </section>

        <section className="lower produkte" id="produkte">
          <h2 className="reveal">Für jeden Schritt eine Maschine.</h2>
          <ul className="portfolio">
            {PORTFOLIO.map((r) => (
              <li key={r.step}>
                <span className="step">{r.step}</span>
                <span className="family">{r.line}</span>
                {r.href.startsWith("#")
                  ? <a href={r.href}>Oben im Film<span className="sr">: {r.step}</span></a>
                  : <a href={r.href} target="_blank" rel="noopener">Auf weinig.de<span className="sr">: {r.step}</span></a>}
              </li>
            ))}
            <li>
              <span className="step">Holzwerkstoffe</span>
              <span className="family">HOLZ-HER: Kantenanleimen, CNC, Plattensägen</span>
              <span className="note">Marke der WEINIG Gruppe</span>
            </li>
          </ul>
        </section>

        <section className="lower service" id="service">
          <div className="split">
            <h2 className="reveal">Eine Maschine läuft Jahrzehnte.</h2>
            <p className="lede split-body">WEINIG LifeTime Services betreut die Investition vor, während und nach dem Kauf. Am meisten zählt der Dauerbetrieb.</p>
          </div>
          <div className="service-grid">
            <div>
              <h3>W4.0 digital</h3>
              <dl className="defs">
                {DIGITAL.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
              </dl>
            </div>
            <div>
              <h3>LifeTime Services</h3>
              <ul className="services">{LIFETIME.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="hotline">Service-Hotline <a href="tel:+49934186222">+49 9341 86 222</a></p>
            </div>
            <figure><img src="/img/service.jpg" alt="WEINIG Servicetechniker an einer Maschine" width={1280} height={720} loading="lazy" /></figure>
          </div>
        </section>

        <section className="lower werte" id="werte">
          <h2 className="reveal">Fünfmal 100 %.</h2>
          <ul className="values">
            {VALUES.map(([t, d]) => <li key={t}><b>100 % {t}</b><span>{d}</span></li>)}
          </ul>
        </section>

        <section className="forum" id="forum">
          <h2 className="reveal">Fenster / CNC Forum</h2>
          <p>11. und 12. November 2026. Für alle, die Fenster und Türen fertigen und die Maschinen dahinter sehen wollen.</p>
          <a className="btn" href="#kontakt">Kontakt aufnehmen</a>
        </section>
      </main>

      <footer className="foot" id="kontakt">
        <h2>Kontakt</h2>
        <address>
          <b>Michael Weinig AG</b>
          <span>Weinigstraße 2/4, 97941 Tauberbischofsheim</span>
          <a href="tel:+499341860">+49 9341 860</a>
          <a href="https://www.weinig.de/de/" target="_blank" rel="noopener">weinig.de</a>
        </address>
        <p className="foot-note">Konzeptentwurf für die Michael Weinig AG. Angaben und Bilder von weinig.de.</p>
      </footer>
      <Experience />
    </>
  );
}
