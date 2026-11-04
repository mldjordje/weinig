"use client";

import { useState, type CSSProperties } from "react";
import type { Lang } from "./Landing";

// The visitor's own numbers in, extra clear wood and its value out. Nothing here is a WEINIG figure, and the copy says so.
export function yieldGain(volume: number, now: number, gain: number, price: number, invest: number) {
  const after = Math.min(now + gain, 98);
  const m3 = (volume * (after - now)) / 100;
  const eur = m3 * price;
  return { after, m3, eur, years: invest > 0 && eur > 0 ? invest / eur : null };
}

export default function YieldCalc({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (de: string, english: string) => (en ? english : de);
  const locale = en ? "en-GB" : "de-DE";
  const num = (v: number, d = 0) => v.toLocaleString(locale, { maximumFractionDigits: d, minimumFractionDigits: d });
  const eur = (v: number) => v.toLocaleString(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const [volume, setVolume] = useState(20000);
  const [now, setNow] = useState(65);
  const [gain, setGain] = useState(4);
  const [price, setPrice] = useState(400);
  const [invest, setInvest] = useState("");
  const r = yieldGain(volume, now, gain, price, Number(invest.replace(/\D/g, "")) || 0);

  const rows = [
    { id: "vol", label: t("Rohholz pro Jahr", "Rough timber per year"), value: `${num(volume)} m³`, min: 1000, max: 100000, step: 500, v: volume, set: setVolume },
    { id: "now", label: t("Ausbeute heute", "Yield today"), value: `${num(now)} %`, min: 40, max: 90, step: 1, v: now, set: setNow },
    { id: "gain", label: t("Mehr Ausbeute durch Scannen und Optimieren", "Extra yield from scanning and optimising"), value: t(`+${num(gain)} %-Punkte`, `+${num(gain)} points`), min: 1, max: 15, step: 1, v: gain, set: setGain },
    { id: "price", label: t("Wert von 1 m³ fehlerfreiem Holz", "Value of 1 m³ of clear wood"), value: eur(price), min: 150, max: 1500, step: 10, v: price, set: setPrice },
  ];

  return (
    <section className="lower yield" id="ausbeute">
      <div className="split">
        <h2 className="reveal">{t("Rechnen Sie mit Ihrem Holz.", "Run the numbers on your wood.")}</h2>
        <p className="lede split-body">{t("Ein Scanner bezahlt sich mit dem Holz, das nicht mehr im Ausschuss landet. Stellen Sie Ihre eigenen Werte ein.", "A scanner pays for itself with the wood that no longer ends up as scrap. Set your own values.")}</p>
      </div>

      <div className="calc">
        <form className="calc-in" onSubmit={(e) => e.preventDefault()}>
          {rows.map((row) => (
            <div className="calc-row" key={row.id}>
              <label htmlFor={`c-${row.id}`}>{row.label}</label>
              <output htmlFor={`c-${row.id}`}>{row.value}</output>
              <input id={`c-${row.id}`} type="range" min={row.min} max={row.max} step={row.step} value={row.v}
                onChange={(e) => row.set(Number(e.target.value))} style={{ "--fill": `${((row.v - row.min) / (row.max - row.min)) * 100}%` } as CSSProperties} />
            </div>
          ))}
          <div className="calc-row">
            <label htmlFor="c-inv">{t("Investition, optional", "Investment, optional")}</label>
            <input id="c-inv" className="calc-num" inputMode="numeric" autoComplete="off" placeholder={t("z. B. 450.000 €", "e.g. €450,000")}
              value={invest} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 9); setInvest(d ? num(Number(d)) : ""); }} />
          </div>
        </form>

        <div className="calc-out">
          <div className="boards" aria-hidden="true">
            <div className="board"><span>{t("Heute", "Today")}</span><i style={{ "--y": `${now}%` } as CSSProperties}><b /></i><em>{num(now)} %</em></div>
            <div className="board"><span>{t("Mit Scanner", "With scanner")}</span><i style={{ "--y": `${now}%`, "--g": `${r.after - now}%` } as CSSProperties}><b /><b className="gain" /></i><em>{num(r.after)} %</em></div>
          </div>
          <dl className="calc-result" aria-live="polite">
            <div><dt>{t("Mehr fehlerfreies Holz pro Jahr", "More clear wood per year")}</dt><dd>+{num(r.m3)} m³</dd></div>
            <div><dt>{t("Mehr Wert pro Jahr", "More value per year")}</dt><dd>{eur(r.eur)}</dd></div>
            {r.years !== null && <div><dt>{t("Die Investition ist bezahlt nach", "The investment is paid back after")}</dt><dd>{r.years < 1 ? t(`${num(r.years * 12)} Monaten`, `${num(r.years * 12)} months`) : t(`${num(r.years, 1)} Jahren`, `${num(r.years, 1)} years`)}</dd></div>}
          </dl>
          <p className="calc-note">{t("Eine Beispielrechnung: Die Werte stellen Sie ein, nicht WEINIG. Wie viel Ausbeute Scanner und Optimierung bei Ihrem Holz tatsächlich bringen, misst WEINIG an Ihren eigenen Brettern.", "An example calculation: you set the values, not WEINIG. How much yield scanning and optimising really add for your wood, WEINIG measures on your own boards.")}</p>
          <a className="btn calc-cta" href="#kontakt">{t("Mit WEINIG nachrechnen", "Check it with WEINIG")}</a>
        </div>
      </div>
    </section>
  );
}
