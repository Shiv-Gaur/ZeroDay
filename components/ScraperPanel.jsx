"use client";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import SiteList from "./SiteList";
import TerminalLog from "./TerminalLog";
import ResultsTable from "./ResultsTable";
import ExportButtons from "./ExportButtons";

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
  { name: "USPTO Patents", url: "https://patft.uspto.gov", tag: "PATENTS" },
  { name: "PACER Courts", url: "https://www.pacer.gov", tag: "LEGAL" },
  { name: "NASA Open Data", url: "https://data.nasa.gov", tag: "SPACE" },
  { name: "World Bank Data", url: "https://data.worldbank.org", tag: "ECONOMICS" },
];

const DARK_SITES = [
  { name: "Ahmia Search", url: "https://ahmia.fi", tag: "SEARCH" },
  { name: "DuckDuckGo .onion", url: "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion", tag: "SEARCH" },
  { name: "ProtonMail .onion", url: "https://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion", tag: "EMAIL" },
  { name: "SecureDrop", url: "https://secrdrop5wyphb5x.onion", tag: "WHISTLEBLOW" },
  { name: "Torch", url: "http://xmh57jrknzkhv6y3ls3ubitzfqnkrwxhopf5aygthi7d6rplyvk3noyd.onion", tag: "SEARCH" },
  { name: "OnionShare", url: "https://onionshare.org", tag: "FILES" },
  { name: "Keybase", url: "https://keybase.io", tag: "IDENTITY" },
  { name: "Tor Project", url: "https://www.torproject.org", tag: "PRIVACY" },
];

const LAYERS = {
  surface: { sites: SURFACE_SITES, color: "#06b6d4", label: "SRF", fullLabel: "SURFACE_WEB", desc: "Indexed clearnet" },
  deep: { sites: DEEP_SITES, color: "#f59e0b", label: "DEP", fullLabel: "DEEP_WEB", desc: "Gated databases" },
  dark: { sites: DARK_SITES, color: "#ef4444", label: "DRK", fullLabel: "DARK_WEB", desc: "Tor hidden svcs" },
};

const EXTRACTIONS = [
  { id: "links", label: "LINKS" },
  { id: "images", label: "IMAGES" },
  { id: "headings", label: "HEADINGS" },
  { id: "paragraphs", label: "TEXT" },
  { id: "tables", label: "TABLES" },
  { id: "meta", label: "META" },
];

function LayerPanel({ layerKey }) {
  const { data: session } = useSession();
  const layer = LAYERS[layerKey];
  const c = layer.color;
  const isDark = layerKey === "dark";
  const isDeep = layerKey === "deep";

  const [picked, setPicked] = useState(null);
  const [customUrl, setCustomUrl] = useState("");
  const [custom, setCustom] = useState(false);
  const [ext, setExt] = useState("links");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [resultId, setResultId] = useState(null);

  // Deep web auth fields
  const [showAuth, setShowAuth] = useState(false);
  const [authLogin, setAuthLogin] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authUserSel, setAuthUserSel] = useState("#username");
  const [authPassSel, setAuthPassSel] = useState("#password");
  const [authSubmitSel, setAuthSubmitSel] = useState("#submit");

  const log = useCallback((m) => setLogs((p) => [...p, m]), []);
  const target = custom ? customUrl : picked?.url || "";

  const scrape = async () => {
    if (!target) return;
    setLoading(true);
    setResults(null);
    setResultId(null);
    setLogs([]);

    log(`TARGET: ${target}`);
    log(`MODE: ${ext}`);
    log(`LAYER: ${layerKey.toUpperCase()}`);

    try {
      const endpoint = `/api/scrape/${layerKey}`;
      const body = { url: target, extractionType: ext };

      // Add auth config for deep web if provided
      if (isDeep && showAuth && authLogin) {
        body.auth = {
          loginUrl: authLogin,
          username: authUser,
          password: authPass,
          usernameSelector: authUserSel,
          passwordSelector: authPassSel,
          submitSelector: authSubmitSel,
        };
        log("AUTH: Credentials provided");
      }

      log("REQUESTING...");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        log(`ERR: ${data.error || `HTTP ${res.status}`}`);
        return;
      }

      log(`STATUS: ${res.status} OK`);
      log(`METHOD: ${data.method || layerKey}`);
      log(`DURATION: ${data.duration}`);
      log(`RECORDS: ${data.count}`);
      log("DONE ✓");

      setResults(data.data);
      setResultId(data.resultId);
    } catch (err) {
      log(`ERR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clientExport = (fmt) => {
    if (!results?.length) return;
    let blob, extension;
    if (fmt === "csv") {
      const ks = Object.keys(results[0]);
      const rows = [
        ks.join(","),
        ...results.map((r) => ks.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")),
      ];
      blob = new Blob([rows.join("\n")], { type: "text/csv" });
      extension = "csv";
    } else {
      blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
      extension = "json";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${layerKey}_${Date.now()}.${extension}`;
    a.click();
  };

  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="layer-panel" style={{ "--lc": c }}>
      {isDark && (
        <div className="tor-banner">
          <div className="tor-warn">⚠ DARK WEB — TOR REQUIRED</div>
          <div className="tor-desc">
            Dark web scraping requires Tor daemon running locally on port 9050. Admin access required.
          </div>
          {!isAdmin && (
            <div className="tor-restricted">
              🔒 Access restricted to admin users. Contact your administrator.
            </div>
          )}
        </div>
      )}

      <div className="panel-body">
        <div className="sidebar-wrap">
          <SiteList
            sites={layer.sites}
            color={c}
            custom={custom}
            picked={picked}
            isDark={isDark}
            onSelectSite={(s) => {
              setPicked(s);
              setCustom(false);
              setResults(null);
              setResultId(null);
              setLogs([]);
            }}
            onToggleCustom={() => {
              setCustom(!custom);
              setResults(null);
              setResultId(null);
              setLogs([]);
            }}
            onCustomUrl={setCustomUrl}
          />

          {isDeep && (
            <div className="auth-section">
              <button
                className={`custom-toggle ${showAuth ? "on" : ""}`}
                onClick={() => setShowAuth(!showAuth)}
                style={{ borderColor: showAuth ? c + "55" : "#222", color: showAuth ? c : "#555" }}
              >
                {showAuth ? "× AUTH CONFIG" : "🔑 AUTH CONFIG"}
              </button>
              {showAuth && (
                <div className="auth-fields">
                  <input placeholder="Login URL" value={authLogin} onChange={(e) => setAuthLogin(e.target.value)} style={{ borderColor: c + "30", color: c }} />
                  <input placeholder="Username" value={authUser} onChange={(e) => setAuthUser(e.target.value)} style={{ borderColor: c + "30", color: c }} />
                  <input placeholder="Password" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} style={{ borderColor: c + "30", color: c }} />
                  <input placeholder="Username selector (#username)" value={authUserSel} onChange={(e) => setAuthUserSel(e.target.value)} style={{ borderColor: c + "20", color: c + "88" }} />
                  <input placeholder="Password selector (#password)" value={authPassSel} onChange={(e) => setAuthPassSel(e.target.value)} style={{ borderColor: c + "20", color: c + "88" }} />
                  <input placeholder="Submit selector (#submit)" value={authSubmitSel} onChange={(e) => setAuthSubmitSel(e.target.value)} style={{ borderColor: c + "20", color: c + "88" }} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="main-area">
          <div className="target-bar" style={{ borderColor: c + "15" }}>
            <div className="target-label" style={{ color: c + "66" }}>TARGET</div>
            <div className="target-url">{target || "—"}</div>
            {target && <div className="target-dot" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />}
          </div>

          <div className="controls-row">
            <div className="ext-chips">
              {EXTRACTIONS.map((e) => (
                <button
                  key={e.id}
                  className={`chip ${ext === e.id ? "on" : ""}`}
                  onClick={() => setExt(e.id)}
                  style={{
                    "--ac": c,
                    borderColor: ext === e.id ? c + "66" : "#1a1a1a",
                    color: ext === e.id ? c : "#555",
                    background: ext === e.id ? c + "0c" : "transparent",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
            <div className="action-btns">
              <button
                id="scrape-btn"
                className="btn-primary"
                onClick={scrape}
                disabled={loading || !target || (isDark && !isAdmin)}
                style={{
                  borderColor: c + "55",
                  color: c,
                  background: c + "10",
                  opacity: loading || !target || (isDark && !isAdmin) ? 0.3 : 1,
                }}
              >
                {loading ? "SCANNING..." : "SCRAPE"}
              </button>
              {results?.length > 0 && (
                <ExportButtons resultId={resultId} color={c} onExport={clientExport} />
              )}
              {results?.length > 0 && (
                <button
                  className="btn-export"
                  onClick={() => {
                    setResults(null);
                    setResultId(null);
                    setLogs([]);
                  }}
                  style={{ borderColor: "#222", color: "#666" }}
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          <TerminalLog logs={logs} color={c} />
          <ResultsTable data={results} color={c} />

          {!results && !loading && !logs.length && (
            <div className="empty-state">
              <div className="empty-ascii" style={{ color: c + "15" }}>
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

export default function ScraperPanel() {
  const [tab, setTab] = useState("surface");

  const lyr = LAYERS[tab];

  return (
    <div className="scraper-root" style={{ "--primary": lyr.color }}>
      <div className="layer-tabs">
        {Object.entries(LAYERS).map(([k, v]) => (
          <button
            key={k}
            className={`layer-tab ${tab === k ? "active" : ""}`}
            onClick={() => setTab(k)}
            style={{ "--primary": v.color }}
          >
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
    </div>
  );
}
