import { useState, useEffect, useRef, useCallback } from "react";

const SURFACE_SITES = [
  { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Main_Page", tag: "ENCYCLOPEDIA" },
  { name: "Reddit", url: "https://old.reddit.com", tag: "FORUM" },
  { name: "Hacker News", url: "https://news.ycombinator.com", tag: "TECH" },
  { name: "BBC News", url: "https://www.bbc.com/news", tag: "NEWS" },
  { name: "GitHub Trending", url: "https://github.com/trending", tag: "CODE" },
  { name: "Stack Overflow", url: "https://stackoverflow.com/questions", tag: "Q&A" },
  { name: "ArXiv CS.AI", url: "https://arxiv.org/list/cs.AI/recent", tag: "PAPERS" },
  { name: "Product Hunt", url: "https://www.producthunt.com", tag: "PRODUCTS" },
];

const DEEP_SITES = [
  { name: "Internet Archive", url: "https://archive.org", tag: "ARCHIVE" },
  { name: "JSTOR Open Access", url: "https://www.jstor.org/open", tag: "JOURNALS" },
  { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov", tag: "BIOMEDICAL" },
  { name: "SEC EDGAR", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany", tag: "FILINGS" },
  { name: "USPTO Patents", url: "https://patft.uspto.gov/netahtml/PTO/search-bool.html", tag: "PATENTS" },
  { name: "PACER Courts", url: "https://www.pacer.gov", tag: "LEGAL" },
  { name: "NASA Open Data", url: "https://data.nasa.gov", tag: "SPACE" },
  { name: "World Bank Data", url: "https://data.worldbank.org", tag: "ECONOMICS" },
];

const DARK_SITES = [
  { name: "Ahmia Search", url: "http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion", tag: "SEARCH" },
  { name: "The Hidden Wiki", url: "http://zqktlwiuavvvqqt4ybvgvi7tyo4hjl5xgfuvpdf6otjiycgwqbym2qad.onion", tag: "DIRECTORY" },
  { name: "DuckDuckGo .onion", url: "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion", tag: "SEARCH" },
  { name: "ProtonMail .onion", url: "https://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion", tag: "EMAIL" },
  { name: "SecureDrop Dir", url: "http://sdolvtfhatvsysc6l34d65ymdwxcujausv7k5jk4cy5ttzhjoi6fzvyd.onion", tag: "WHISTLEBLOW" },
  { name: "Torch Search", url: "http://xmh57jrknzkhv6y3ls3ubitzfqnkrwxhopf5aygthi7d6rplyvk3noyd.onion", tag: "SEARCH" },
  { name: "OnionShare .onion", url: "http://lldan5gahapx5k7iafb3s4ikijc4ni7gx5iywdflkba5y2eulmwqd.onion", tag: "FILES" },
  { name: "Tor Project .onion", url: "http://2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion", tag: "INFO" },
];

const EXTRACTIONS = [
  { id: "links", label: "LINKS", sel: "a[href]" },
  { id: "images", label: "IMAGES", sel: "img" },
  { id: "headings", label: "HEADINGS", sel: "h1,h2,h3,h4,h5,h6" },
  { id: "paragraphs", label: "TEXT", sel: "p" },
  { id: "tables", label: "TABLES", sel: "table" },
  { id: "meta", label: "META", sel: "meta" },
];

const LAYERS = {
  surface: { sites: SURFACE_SITES, color: "#39ff14", label: "SRF", fullLabel: "SURFACE_WEB", desc: "Indexed clearnet" },
  deep: { sites: DEEP_SITES, color: "#ffbd2e", label: "DEP", fullLabel: "DEEP_WEB", desc: "Gated databases" },
  dark: { sites: DARK_SITES, color: "#ff2e63", label: "DRK", fullLabel: "DARK_WEB", desc: "Tor hidden svcs" },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseHTML(html, type) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const map = { links:"a[href]", images:"img", headings:"h1,h2,h3,h4,h5,h6", paragraphs:"p", tables:"table", meta:"meta" };
  const els = doc.querySelectorAll(map[type] || "a[href]");
  return Array.from(els).slice(0, 80).map((el, i) => {
    if (type === "links") {
      const h = el.getAttribute("href") || "";
      const t = el.textContent.trim().slice(0, 100);
      return (t || h) ? { n: i+1, text: t || "—", href: h } : null;
    }
    if (type === "images") {
      const s = el.getAttribute("src") || el.getAttribute("data-src") || "";
      return s ? { n: i+1, alt: (el.getAttribute("alt")||"").slice(0,60), src: s.slice(0,180) } : null;
    }
    if (type === "headings") return { n: i+1, lvl: el.tagName, text: el.textContent.trim().slice(0,180) };
    if (type === "tables") return { n: i+1, rows: el.querySelectorAll("tr").length, cols: el.querySelectorAll("tr:first-child td,tr:first-child th").length, preview: el.textContent.trim().slice(0,150) };
    if (type === "meta") {
      const nm = el.getAttribute("name") || el.getAttribute("property") || "";
      const ct = el.getAttribute("content") || "";
      return (nm||ct) ? { n: i+1, name: nm, content: ct.slice(0,180) } : null;
    }
    return { n: i+1, text: el.textContent.trim().slice(0,250) };
  }).filter(Boolean);
}

function mockDarkResults(type, name) {
  if (type === "links") return [{n:1,text:`${name} Index`,href:"/"},{n:2,text:"Directory",href:"/dir"},{n:3,text:"About",href:"/about"},{n:4,text:"Status",href:"/status"},{n:5,text:"PGP Contact",href:"/pgp"}];
  if (type === "meta") return [{n:1,name:"title",content:`${name} — Hidden Service`},{n:2,name:"robots",content:"noindex,nofollow"},{n:3,name:"server",content:"nginx/1.24"}];
  if (type === "headings") return [{n:1,lvl:"H1",text:`${name}`},{n:2,lvl:"H2",text:"Services"},{n:3,lvl:"H2",text:"Updates"}];
  if (type === "images") return [{n:1,alt:"logo",src:"/static/logo.png"},{n:2,alt:"banner",src:"/static/banner.png"}];
  return [{n:1,text:"Tor hidden service — encrypted circuit active."},{n:2,text:"No identifying data collected."},{n:3,text:"All connections routed through 3-hop relay."}];
}

function LogStream({ logs, color }) {
  const r = useRef(null);
  useEffect(() => { r.current && (r.current.scrollTop = r.current.scrollHeight); }, [logs]);
  if (!logs.length) return null;
  return (
    <div ref={r} className="log-stream" style={{ borderColor: color + "18" }}>
      {logs.map((l, i) => (
        <div key={i} style={{ opacity: .3 + (i/logs.length)*.7 }}>
          <span className="log-prefix" style={{ color: color + "55" }}>{">"}</span>{l}
        </div>
      ))}
    </div>
  );
}

function DataGrid({ data, color }) {
  const [sk, setSk] = useState(null);
  const [sa, setSa] = useState(true);
  if (!data?.length) return null;
  const keys = Object.keys(data[0]);
  let rows = [...data];
  if (sk) rows.sort((a,b) => { const c = String(a[sk]??"").localeCompare(String(b[sk]??""),undefined,{numeric:true}); return sa?c:-c; });
  return (
    <div className="data-grid-wrap">
      <div className="data-count" style={{ color: color+"88" }}>{data.length} records</div>
      <div className="data-grid-scroll">
        <table className="data-grid">
          <thead>
            <tr>{keys.map(k => (
              <th key={k} onClick={() => { sk===k ? setSa(!sa) : (setSk(k), setSa(true)); }} style={{ color: sk===k ? color : color+"99" }}>
                {k}{sk===k?(sa?" ↑":" ↓"):""}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row,i) => (
              <tr key={i} className={i%2===0?"even":"odd"}>
                {keys.map(k => <td key={k} title={String(row[k]??"")}>{String(row[k]??"").slice(0,120)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LayerPanel({ layerKey }) {
  const layer = LAYERS[layerKey];
  const c = layer.color;
  const isDark = layerKey === "dark";

  const [picked, setPicked] = useState(null);
  const [customUrl, setCustomUrl] = useState("");
  const [custom, setCustom] = useState(false);
  const [ext, setExt] = useState("links");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [torUp, setTorUp] = useState(false);
  const [torBusy, setTorBusy] = useState(false);

  const log = useCallback(m => setLogs(p => [...p, m]), []);
  const target = custom ? customUrl : (picked?.url || "");
  const tName = custom ? customUrl : (picked?.name || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const torConnect = async () => {
    setTorBusy(true); setLogs([]);
    log("SOCKS5 proxy init → 127.0.0.1:9050"); await sleep(600);
    log("Bootstrap relay chain..."); await sleep(500);
    log("Circuit: GUARD → MIDDLE → EXIT"); await sleep(800);
    log("+ Guard [REDACTED]"); await sleep(350);
    log("+ Middle [REDACTED]"); await sleep(400);
    log("+ Exit [REDACTED]"); await sleep(300);
    log("CIRCUIT ESTABLISHED — encrypted"); setTorUp(true); setTorBusy(false);
  };

  const scrape = async () => {
    if (!target) return;
    if (isDark && !torUp) { log("ERR: Tor not connected"); return; }
    setLoading(true); setResults(null); setLogs([]);

    if (isDark) {
      log(`TOR ROUTE → ${target}`); await sleep(700);
      log("HSDir resolve..."); await sleep(1000);
      log("Rendezvous OK"); await sleep(500);
      log("+ Hidden service connected"); await sleep(300);
      const m = mockDarkResults(ext, tName);
      setResults(m); log(`${m.length} records extracted`); log("DONE");
      setLoading(false); return;
    }

    try {
      log(`GET ${target}`); log(`MODE: ${ext}`);
      const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      log(`STATUS ${r.status}`);
      const html = await r.text();
      log(`${(html.length/1024).toFixed(1)}KB received`);
      const d = parseHTML(html, ext);
      setResults(d); log(`${d.length} records extracted`); log("DONE");
    } catch(e) { log(`ERR: ${e.message}`); }
    finally { setLoading(false); }
  };

  const exportData = fmt => {
    if (!results?.length) return;
    let blob, ex;
    if (fmt === "csv") {
      const ks = Object.keys(results[0]);
      blob = new Blob([[ks.join(","), ...results.map(r => ks.map(k => `"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n")], {type:"text/csv"});
      ex = "csv";
    } else {
      blob = new Blob([JSON.stringify(results,null,2)], {type:"application/json"});
      ex = "json";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${layerKey}_${Date.now()}.${ex}`; a.click();
  };

  return (
    <div className="layer-panel" style={{ "--lc": c }}>
      {isDark && (
        <div className="tor-banner">
          <div className="tor-warn">SIMULATION MODE</div>
          <div className="tor-desc">
            Real .onion scraping needs a Tor daemon + backend proxy. This demo shows the workflow — no actual Tor requests leave this browser.
          </div>
          <div className="tor-status-row">
            <div className="tor-dot" data-state={torUp?"up":torBusy?"busy":"down"} />
            <span className="tor-label">TOR: {torUp?"CONNECTED":torBusy?"CONNECTING":"OFFLINE"}</span>
            {!torUp && <button className="btn-sm" onClick={torConnect} disabled={torBusy} style={{borderColor:c+"44",color:c}}>{torBusy?"...":"CONNECT"}</button>}
          </div>
        </div>
      )}

      <div className="panel-body">
        <div className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
          <button className="sidebar-toggle" style={{color: c}} onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '▲ HIDE TARGETS' : '▼ SELECT TARGET'}
          </button>
          <div className="sidebar-head" style={{color:c}}>TARGETS</div>
          <div className="site-list">
            {layer.sites.map((s,i) => (
              <button key={i} className={`site-row ${!custom && picked?.url===s.url ? "active" : ""}`}
                onClick={() => { setPicked(s); setCustom(false); setResults(null); setLogs([]); }}
                style={{ "--ac": c }}>
                <span className="site-tag" style={{background:c+"18",color:c}}>{s.tag}</span>
                <span className="site-name">{s.name}</span>
              </button>
            ))}
          </div>
          <div className="custom-toggle-area">
            <button className={`custom-toggle ${custom?"on":""}`} onClick={() => { setCustom(!custom); setResults(null); setLogs([]); }} style={{borderColor:custom?c+"55":"#222",color:custom?c:"#555"}}>
              {custom ? "× CUSTOM URL" : "+ CUSTOM URL"}
            </button>
            {custom && (
              <input className="custom-input" value={customUrl} onChange={e=>setCustomUrl(e.target.value)}
                placeholder={isDark?"http://xxxx.onion":"https://..."} style={{borderColor:c+"30",color:c}} autoFocus />
            )}
          </div>
        </div>

        <div className="main-area">
          <div className="target-bar" style={{borderColor:c+"15"}}>
            <div className="target-label" style={{color:c+"66"}}>TARGET</div>
            <div className="target-url">{target || "—"}</div>
            {target && <div className="target-dot" style={{background:c,boxShadow:`0 0 8px ${c}`}} />}
          </div>

          <div className="controls-row">
            <div className="ext-chips">
              {EXTRACTIONS.map(e => (
                <button key={e.id} className={`chip ${ext===e.id?"on":""}`}
                  onClick={() => setExt(e.id)}
                  style={{ "--ac": c, borderColor: ext===e.id?c+"66":"#1a1a1a", color: ext===e.id?c:"#555", background: ext===e.id?c+"0c":"transparent" }}>
                  {e.label}
                </button>
              ))}
            </div>
            <div className="action-btns">
              <button className="btn-primary" onClick={scrape}
                disabled={loading||!target||(isDark&&!torUp)}
                style={{borderColor:c+"55",color:c,background:c+"10",opacity:(loading||!target||(isDark&&!torUp))?.3:1}}>
                {loading ? "SCANNING..." : "SCRAPE"}
              </button>
              {results?.length > 0 && (
                <>
                  <button className="btn-export" onClick={()=>exportData("json")} style={{borderColor:"#222",color:"#666"}}>JSON</button>
                  <button className="btn-export" onClick={()=>exportData("csv")} style={{borderColor:"#222",color:"#666"}}>CSV</button>
                </>
              )}
            </div>
          </div>

          <LogStream logs={logs} color={c} />
          <DataGrid data={results} color={c} />

          {!results && !loading && !logs.length && (
            <div className="empty-state">
              <div className="empty-ascii" style={{color:c+"15"}}>
{`    ╔══════════════════╗
    ║   SELECT TARGET  ║
    ║   THEN [SCRAPE]  ║
    ╚══════════════════╝`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("surface");
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB"));
    tick(); const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const lyr = LAYERS[tab];

  return (
    <div className="app-root" style={{ "--primary": lyr.color }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Azeret+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --mono: 'Share Tech Mono', monospace; --ui: 'Azeret Mono', monospace; }

        .app-root {
          min-height: 100vh;
          background: #020204;
          color: #999;
          font-family: var(--ui);
          position: relative;
          overflow-x: hidden;
        }

        .app-root::before {
          content: "";
          position: fixed; inset: 0; z-index: 999; pointer-events: none;
          background: repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,.04) 1px, rgba(0,0,0,.04) 2px);
        }

        .app-root::after {
          content: "";
          position: fixed; inset: 0; z-index: 998; pointer-events: none;
          background: radial-gradient(ellipse at 50% 0%, var(--primary)04 0%, transparent 70%);
        }

        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 38px;
          background: #060608; border-bottom: 1px solid #111;
          font-family: var(--mono); font-size: 11px;
          position: sticky; top: 0; z-index: 100;
        }
        .topbar-left { display: flex; align-items: center; gap: 16px; }
        .topbar-brand { color: var(--primary); letter-spacing: 4px; font-size: 12px; }
        .topbar-sep { color: #222; }
        .topbar-info { color: #333; font-size: 10px; letter-spacing: 1px; }
        .topbar-right { display: flex; align-items: center; gap: 14px; color: #333; font-size: 10px; }
        .topbar-clock { color: var(--primary); opacity: .5; font-variant-numeric: tabular-nums; }

        .layer-tabs {
          display: flex; height: 44px;
          background: #0a0a0c; border-bottom: 1px solid #111;
          position: sticky; top: 38px; z-index: 99;
          overflow-x: auto; overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .layer-tabs::-webkit-scrollbar { display: none; }
        .layer-tab {
          flex: 1; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--mono); font-size: 11px; letter-spacing: 2px;
          color: #333; transition: all .2s; position: relative;
          border-bottom: 2px solid transparent; white-space: nowrap; padding: 0 12px;
        }
        .layer-tab:hover { color: #666; }
        .layer-tab.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--primary)06; }
        .layer-tab .tab-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .layer-tab .tab-desc { font-size: 8px; letter-spacing: 1px; opacity: .5; text-transform: uppercase; }

        .layer-header {
          padding: 20px 28px 14px;
          display: flex; align-items: baseline; gap: 14px;
          border-bottom: 1px solid #0d0d0d;
        }
        .layer-header h2 {
          font-family: var(--mono); font-size: 14px; font-weight: 400;
          color: var(--primary); letter-spacing: 6px;
        }
        .layer-header .lh-desc { font-size: 10px; color: #2a2a2a; letter-spacing: 1px; }

        .layer-panel { animation: panelIn .25s ease; }
        @keyframes panelIn { from { opacity:0; } to { opacity:1; } }

        .tor-banner {
          margin: 16px 28px 0; padding: 14px 18px;
          border: 1px solid #ff2e6318; border-radius: 2px;
          background: #0a0308; font-family: var(--mono); font-size: 10px;
        }
        .tor-warn { color: #ff2e63; font-size: 11px; letter-spacing: 3px; margin-bottom: 6px; }
        .tor-desc { color: #442233; line-height: 1.6; margin-bottom: 12px; }
        .tor-status-row { display: flex; align-items: center; gap: 10px; }
        .tor-dot {
          width: 7px; height: 7px; border-radius: 50%; transition: all .3s;
        }
        .tor-dot[data-state="up"] { background: #0f0; box-shadow: 0 0 8px #0f0; }
        .tor-dot[data-state="busy"] { background: #ff0; box-shadow: 0 0 8px #ff0; animation: pulse 1s infinite; }
        .tor-dot[data-state="down"] { background: #f44; box-shadow: 0 0 6px #f44; }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .tor-label { font-size: 10px; color: #555; letter-spacing: 2px; }
        .btn-sm {
          padding: 3px 14px; font-family: var(--mono); font-size: 9px;
          background: transparent; border: 1px solid; border-radius: 1px;
          cursor: pointer; letter-spacing: 2px; transition: all .15s;
        }
        .btn-sm:hover:not(:disabled) { filter: brightness(1.4); }
        .btn-sm:disabled { opacity: .3; cursor: default; }

        .panel-body {
          display: grid; grid-template-columns: 220px 1fr;
          min-height: calc(100vh - 170px);
        }

        .sidebar {
          border-right: 1px solid #0d0d0d; padding: 16px 0;
          display: flex; flex-direction: column;
        }
        .sidebar-toggle {
          display: none; width: 100%; padding: 8px 16px;
          font-family: var(--mono); font-size: 9px; letter-spacing: 2px;
          background: transparent; border: none; border-bottom: 1px solid #0d0d0d;
          color: #555; cursor: pointer; text-align: left;
        }
        .sidebar-head {
          padding: 0 16px 10px; font-family: var(--mono); font-size: 9px;
          letter-spacing: 3px; opacity: .6;
        }
        .site-list {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column;
          padding: 0 8px; gap: 2px;
        }
        .site-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border: none; background: transparent;
          cursor: pointer; text-align: left; border-radius: 2px;
          transition: all .1s; border-left: 2px solid transparent;
        }
        .site-row:hover { background: #ffffff04; }
        .site-row.active { background: var(--ac)08; border-left-color: var(--ac); }
        .site-tag {
          font-family: var(--mono); font-size: 7px; letter-spacing: 1.5px;
          padding: 2px 6px; border-radius: 1px; flex-shrink: 0;
        }
        .site-name { font-family: var(--ui); font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .site-row.active .site-name { color: #ccc; }

        .custom-toggle-area { padding: 12px 10px 0; border-top: 1px solid #0d0d0d; margin-top: 8px; }
        .custom-toggle {
          width: 100%; padding: 7px; font-family: var(--mono); font-size: 9px;
          letter-spacing: 2px; background: transparent; border: 1px dashed;
          border-radius: 1px; cursor: pointer; transition: all .15s;
        }
        .custom-toggle:hover { filter: brightness(1.3); }
        .custom-input {
          width: 100%; margin-top: 8px; padding: 7px 10px;
          font-family: var(--mono); font-size: 10px;
          background: #050506; border: 1px solid; border-radius: 1px;
          outline: none;
        }
        .custom-input:focus { box-shadow: 0 0 0 1px var(--lc)22; }

        .main-area { padding: 16px 24px 40px; min-width: 0; }

        .target-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border: 1px solid; border-radius: 2px;
          margin-bottom: 14px; background: #060607;
        }
        .target-label { font-family: var(--mono); font-size: 8px; letter-spacing: 2px; flex-shrink: 0; }
        .target-url { font-family: var(--mono); font-size: 11px; color: #666; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .target-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .controls-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .ext-chips { display: flex; gap: 4px; flex-wrap: wrap; }
        .chip {
          padding: 5px 12px; font-family: var(--mono); font-size: 9px;
          letter-spacing: 1.5px; border: 1px solid; border-radius: 1px;
          cursor: pointer; transition: all .12s; background: transparent;
        }
        .chip:hover { filter: brightness(1.3); }
        .action-btns { display: flex; gap: 6px; }
        .btn-primary {
          padding: 7px 24px; font-family: var(--mono); font-size: 10px;
          letter-spacing: 3px; border: 1px solid; border-radius: 1px;
          cursor: pointer; transition: all .15s;
        }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.4); transform: translateY(-1px); }
        .btn-primary:disabled { cursor: default; }
        .btn-export {
          padding: 7px 14px; font-family: var(--mono); font-size: 9px;
          letter-spacing: 1px; border: 1px solid; border-radius: 1px;
          background: transparent; cursor: pointer; transition: all .15s;
        }
        .btn-export:hover { color: #aaa !important; }

        .log-stream {
          background: #030304; border: 1px solid; border-radius: 2px;
          padding: 12px 14px; font-family: var(--mono); font-size: 10px;
          line-height: 1.9; max-height: 160px; overflow-y: auto;
          margin-bottom: 14px; color: var(--lc);
        }
        .log-prefix { margin-right: 8px; }

        .data-grid-wrap { margin-top: 4px; }
        .data-count { font-family: var(--mono); font-size: 9px; letter-spacing: 1px; margin-bottom: 8px; }
        .data-grid-scroll { overflow-x: auto; }
        .data-grid {
          width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 10px;
        }
        .data-grid th {
          text-align: left; padding: 8px 10px;
          border-bottom: 1px solid #1a1a1a;
          font-size: 8px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; cursor: pointer; user-select: none;
          white-space: nowrap;
        }
        .data-grid td {
          padding: 6px 10px; border-bottom: 1px solid #0a0a0a;
          color: #777; max-width: 300px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .data-grid .odd { background: #ffffff02; }

        .empty-state { padding: 60px 0; text-align: center; }
        .empty-ascii { font-family: var(--mono); font-size: 12px; white-space: pre; line-height: 1.6; }

        @keyframes spin { to { transform: rotate(360deg); } }

        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }
        ::selection { background: var(--primary)33; }

        @media (max-width: 700px) {
          .panel-body { grid-template-columns: 1fr; }
          .sidebar {
            border-right: none; border-bottom: 1px solid #0d0d0d;
            overflow: hidden; transition: max-height .3s ease;
          }
          .sidebar.collapsed { max-height: 42px; }
          .sidebar.expanded { max-height: 320px; overflow-y: auto; }
          .sidebar-toggle { display: block; }
          .sidebar-head { display: none; }
          .layer-tab .tab-desc { display: none; }
          .layer-tab { min-width: 100px; font-size: 10px; letter-spacing: 1px; }
          .main-area { padding: 14px 14px 32px; }
          .layer-header { padding: 14px 14px 10px; }
          .controls-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .action-btns { width: 100%; }
          .btn-primary { flex: 1; text-align: center; padding: 10px 8px; font-size: 9px; }
          .topbar-info, .topbar-right .topbar-session { display: none; }
          .target-url { font-size: 9px; }
          .chip { padding: 7px 10px; font-size: 8px; }
        }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-brand">WEBSCOPE</span>
          <span className="topbar-sep">│</span>
          <span className="topbar-info">MULTI-LAYER EXTRACTION</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-session">SESSION {Math.random().toString(36).slice(2,8).toUpperCase()}</span>
          <span className="topbar-clock">{time}</span>
        </div>
      </div>

      <div className="layer-tabs">
        {Object.entries(LAYERS).map(([k, v]) => (
          <button key={k} className={`layer-tab ${tab===k?"active":""}`} onClick={() => setTab(k)}
            style={{ "--primary": v.color }}>
            <span className="tab-dot" />
            <span>{v.fullLabel}</span>
            <span className="tab-desc">{v.desc}</span>
          </button>
        ))}
      </div>

      <div className="layer-header">
        <h2>{lyr.fullLabel}</h2>
        <span className="lh-desc">{lyr.desc}</span>
      </div>

      <LayerPanel key={tab} layerKey={tab} />

      <div style={{ textAlign:"center", padding:"20px 0 30px", fontFamily:"var(--mono)", fontSize:8, color:"#161616", letterSpacing:3 }}>
        USE RESPONSIBLY — COMPLY WITH ALL APPLICABLE LAWS
      </div>
    </div>
  );
}
