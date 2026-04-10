# AGENT PROMPT: Build a Full-Stack Web Intelligence Platform

You are building a production-ready web scraping platform called **WEBSCOPE** that scrapes data from the Surface Web, Deep Web, and Dark Web. Each layer operates independently. The project must be fully functional — no simulations, no mock data, no placeholder logic. Every feature must work end-to-end.

---

## TECH STACK (strict)

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Backend**: Next.js API routes (no separate backend server)
- **Database**: MongoDB Atlas (via Mongoose)
- **Authentication**: NextAuth.js with Google OAuth + credentials (email/password)
- **Scraping**: Cheerio (HTML parsing), Puppeteer (JS-rendered pages), node-fetch
- **Dark Web**: socks-proxy-agent (SOCKS5 proxy through local Tor daemon)
- **Export**: json2csv library for CSV, native JSON.stringify for JSON
- **Deployment**: Vercel (frontend + API routes)

---

## PROJECT STRUCTURE

Create this exact folder structure:

```
webscope/
├── app/
│   ├── layout.js
│   ├── page.js                          # Landing / redirect to dashboard
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.js
│   │   └── register/page.js
│   ├── dashboard/
│   │   ├── page.js                      # Main scraper UI
│   │   ├── history/page.js              # Past scrape results
│   │   └── settings/page.js             # User settings
│   └── api/
│       ├── auth/[...nextauth]/route.js  # NextAuth config
│       ├── scrape/
│       │   ├── surface/route.js         # Surface web scraping endpoint
│       │   ├── deep/route.js            # Deep web scraping endpoint
│       │   └── dark/route.js            # Dark web scraping endpoint
│       ├── results/
│       │   ├── route.js                 # GET all results, POST save result
│       │   └── [id]/route.js            # GET/DELETE single result
│       └── export/route.js              # Export results as JSON/CSV
├── lib/
│   ├── mongodb.js                       # MongoDB connection singleton
│   ├── models/
│   │   ├── User.js                      # User schema
│   │   └── ScrapeResult.js              # Scrape result schema
│   ├── scrapers/
│   │   ├── surface.js                   # Surface web scraper logic
│   │   ├── deep.js                      # Deep web scraper logic
│   │   └── dark.js                      # Dark web scraper logic
│   └── utils/
│       ├── parser.js                    # HTML parsing utilities
│       ├── export.js                    # JSON/CSV export helpers
│       └── sanitize.js                  # Content sanitization
├── components/
│   ├── ScraperPanel.jsx                 # Main scraper interface
│   ├── SiteList.jsx                     # Pre-loaded site picker
│   ├── ResultsTable.jsx                 # Data display table
│   ├── TerminalLog.jsx                  # Live log output
│   ├── ExportButtons.jsx                # Export controls
│   ├── Navbar.jsx                       # Navigation bar
│   └── AuthGuard.jsx                    # Route protection wrapper
├── .env.local                           # Environment variables
├── package.json
├── tailwind.config.js
└── next.config.mjs
```

---

## ENVIRONMENT VARIABLES (.env.local)

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/webscope
NEXTAUTH_SECRET=<random-32-char-string>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
TOR_SOCKS_PROXY=socks5h://127.0.0.1:9050
```

---

## DATABASE SCHEMAS

### User (lib/models/User.js)
```
{
  name: String,
  email: { type: String, unique: true },
  password: String (hashed with bcrypt),
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: Date
}
```

### ScrapeResult (lib/models/ScrapeResult.js)
```
{
  userId: ObjectId (ref User),
  url: String,
  layer: { type: String, enum: ['surface', 'deep', 'dark'] },
  extractionType: String,
  resultCount: Number,
  data: [Mixed],             # Array of extracted objects
  rawHtmlSize: Number,        # Size of fetched HTML in bytes
  duration: Number,           # Scrape time in milliseconds
  status: { type: String, enum: ['success', 'partial', 'failed'] },
  error: String,
  createdAt: { type: Date, default: Date.now, expires: 604800 } # TTL: 7 days auto-delete
}
```

---

## API ROUTES — DETAILED SPECS

### POST /api/scrape/surface
**Input body:**
```json
{
  "url": "https://example.com",
  "extractionType": "links" | "images" | "headings" | "paragraphs" | "tables" | "meta"
}
```

**Logic:**
1. Validate URL (must start with http:// or https://, no .onion)
2. First attempt: fetch with node-fetch (set User-Agent header to a real browser UA, timeout 15s)
3. If fetch fails or page needs JS rendering: fall back to Puppeteer headless Chrome
4. Parse HTML with Cheerio using the appropriate CSS selector for extractionType:
   - links: `a[href]` → extract { text, href }
   - images: `img` → extract { alt, src }
   - headings: `h1,h2,h3,h4,h5,h6` → extract { level, text }
   - paragraphs: `p` → extract { text }
   - tables: `table` → extract { rows, cols, preview }
   - meta: `meta` → extract { name, content }
5. Limit results to 100 items max
6. Save to MongoDB with userId from session
7. Return { success: true, data: [...], count: N, duration: Nms }

**Error handling:** Return { success: false, error: "message" } with appropriate HTTP status

### POST /api/scrape/deep
**Input body:**
```json
{
  "url": "https://example.com",
  "extractionType": "links",
  "auth": {                          # Optional
    "username": "...",
    "password": "...",
    "loginUrl": "...",               # URL of login page
    "usernameSelector": "#username", # CSS selector for username field
    "passwordSelector": "#password", # CSS selector for password field
    "submitSelector": "#submit"      # CSS selector for submit button
  }
}
```

**Logic:**
1. Always use Puppeteer for deep web (needs JS + cookies + sessions)
2. If auth is provided:
   a. Navigate to loginUrl
   b. Type credentials into the specified selectors
   c. Click submit and wait for navigation
   d. Then navigate to the target url
3. If no auth: just navigate with Puppeteer (handles cookies/JS automatically)
4. Extract data same as surface
5. Save to MongoDB
6. Close browser instance after each request (don't leak memory)

### POST /api/scrape/dark
**Input body:**
```json
{
  "url": "http://xxxxx.onion/...",
  "extractionType": "links"
}
```

**Logic:**
1. Check user role — must be 'admin' (return 403 if not)
2. Validate URL contains .onion
3. Use node-fetch with socks-proxy-agent pointing to TOR_SOCKS_PROXY env var
4. The Tor SOCKS5 proxy handles DNS resolution for .onion (that's what socks5h:// means)
5. Set timeout to 30s (Tor is slower)
6. Parse response HTML with Cheerio
7. Run content sanitization (strip any scripts, iframes, embedded objects)
8. Save to MongoDB
9. Return results

**IMPORTANT:** If Tor is not running, return a clear error: "Tor proxy unavailable. Ensure Tor daemon is running on port 9050."

### GET /api/results
- Requires auth
- Returns all scrape results for the current user, sorted by createdAt desc
- Support query params: ?layer=surface&limit=20&page=1

### GET /api/results/[id]
- Returns single result by ID (must belong to current user)

### DELETE /api/results/[id]
- Deletes single result (must belong to current user)

### POST /api/export
**Input body:**
```json
{
  "resultId": "...",
  "format": "json" | "csv"
}
```
- Fetch the result from MongoDB
- Convert data array to requested format
- Return as downloadable file with correct Content-Type and Content-Disposition headers

---

## FRONTEND — DASHBOARD PAGE (app/dashboard/page.js)

This is the main UI. Build it as a single page with 3 tabs.

### Layout:
- Top navbar with logo "WEBSCOPE", user avatar/name, logout button
- 3 tabs below navbar: SURFACE WEB | DEEP WEB | DARK WEB
- Each tab has identical layout but different color accent and different pre-loaded sites

### Each tab contains:
1. **Left sidebar (scrollable, ~250px wide):**
   - Search/filter input at top
   - List of pre-loaded sites as clickable items (show name + category tag)
   - Divider line
   - "Custom URL" toggle button — when active, shows a text input for entering any URL
   - For DEEP WEB tab only: additional collapsible section for login credentials (username, password, login URL, CSS selectors for form fields)

2. **Right main area:**
   - Active target URL display bar at top
   - Row of extraction type buttons: LINKS | IMAGES | HEADINGS | TEXT | TABLES | META
   - "SCRAPE" button (primary action)
   - Terminal log area — shows real-time progress messages (use state updates during fetch)
   - Results table — sortable columns, shows extracted data
   - Export buttons: JSON | CSV
   - Clear button to reset results

### Pre-loaded sites per tab:

**Surface Web:**
| Name | URL | Category |
|------|-----|----------|
| Wikipedia | https://en.wikipedia.org/wiki/Main_Page | Encyclopedia |
| Reddit | https://old.reddit.com | Forum |
| Hacker News | https://news.ycombinator.com | Tech |
| BBC News | https://www.bbc.com/news | News |
| GitHub Trending | https://github.com/trending | Code |
| Stack Overflow | https://stackoverflow.com/questions | Q&A |
| ArXiv CS.AI | https://arxiv.org/list/cs.AI/recent | Papers |
| Product Hunt | https://www.producthunt.com | Products |

**Deep Web:**
| Name | URL | Category |
|------|-----|----------|
| Internet Archive | https://archive.org | Archive |
| JSTOR Open | https://www.jstor.org/open | Journals |
| PubMed | https://pubmed.ncbi.nlm.nih.gov | Biomedical |
| SEC EDGAR | https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany | Filings |
| USPTO Patents | https://patft.uspto.gov | Patents |
| PACER | https://www.pacer.gov | Legal |
| NASA Open Data | https://data.nasa.gov | Space |
| World Bank Data | https://data.worldbank.org | Economics |

**Dark Web:**
| Name | URL | Category |
|------|-----|----------|
| Ahmia Search | https://ahmia.fi | Search |
| DuckDuckGo .onion | https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion | Search |
| ProtonMail .onion | https://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion | Email |
| SecureDrop | https://secrdrop5wyphb5x.onion | Whistleblower |
| Torch | http://xmh57jrknzkhv6y3ls3ubitzfqnkrwxhopf5aygthi7d6rplyvk3noyd.onion | Search |
| OnionShare | https://onionshare.org | Files |
| Keybase | https://keybase.io | Identity |
| Tor Project | https://www.torproject.org | Privacy |

### Color accents per tab:
- Surface: cyan/teal (#06b6d4)
- Deep: amber/orange (#f59e0b)
- Dark: red/crimson (#ef4444)

### Dark Web tab special behavior:
- Show a warning banner at top: "Dark web scraping requires Tor daemon running locally on port 9050. Admin access required."
- Before allowing scrape, make a test request to verify Tor is available
- If user role is not 'admin', show "Access restricted to admin users" and disable scrape button

---

## SCRAPER IMPLEMENTATIONS (lib/scrapers/)

### surface.js
```
Export async function scrapeSurface(url, extractionType) {
  // 1. Try node-fetch first with headers:
  //    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  //    Accept: text/html
  //    Accept-Language: en-US,en;q=0.9
  //    Timeout: 15000ms
  //
  // 2. If response is not HTML or status >= 400, try Puppeteer:
  //    Launch headless Chrome
  //    Set viewport 1920x1080
  //    Navigate with waitUntil: 'networkidle2'
  //    Get page content
  //    Close browser
  //
  // 3. Parse HTML with Cheerio
  // 4. Extract based on extractionType
  // 5. Return { data: [...], rawHtmlSize: N, duration: N }
}
```

### deep.js
```
Export async function scrapeDeep(url, extractionType, authConfig) {
  // Always use Puppeteer
  // 1. Launch headless Chrome with args: ['--no-sandbox', '--disable-setuid-sandbox']
  // 2. If authConfig provided:
  //    a. goto(authConfig.loginUrl, { waitUntil: 'networkidle2' })
  //    b. type(authConfig.usernameSelector, authConfig.username)
  //    c. type(authConfig.passwordSelector, authConfig.password)
  //    d. click(authConfig.submitSelector)
  //    e. waitForNavigation({ waitUntil: 'networkidle2' })
  // 3. goto(url, { waitUntil: 'networkidle2' })
  // 4. Get page.content()
  // 5. Parse with Cheerio, extract data
  // 6. ALWAYS close browser in finally block
  // 7. Return { data: [...], rawHtmlSize: N, duration: N }
}
```

### dark.js
```
Export async function scrapeDark(url, extractionType) {
  // 1. Create SOCKS proxy agent: new SocksProxyAgent(process.env.TOR_SOCKS_PROXY)
  // 2. fetch(url, { agent, timeout: 30000, headers: { User-Agent: '...' } })
  // 3. If connection refused → throw "Tor daemon not running"
  // 4. Parse HTML with Cheerio
  // 5. Run sanitization: strip <script>, <iframe>, <object>, <embed> tags
  // 6. Extract data
  // 7. Return { data: [...], rawHtmlSize: N, duration: N }
}
```

---

## AUTHENTICATION (NextAuth.js)

Configure in app/api/auth/[...nextauth]/route.js:

1. **Credentials provider:**
   - Accept email + password
   - Look up user in MongoDB
   - Compare password with bcrypt
   - Return user object with id, name, email, role

2. **Google provider:**
   - Use GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - On first login, create user in MongoDB with role 'user'

3. **Session callback:** Include user.id and user.role in session object
4. **JWT callback:** Include id and role in token

5. **Registration (app/(auth)/register/page.js):**
   - Form: name, email, password, confirm password
   - Hash password with bcrypt (12 rounds)
   - Save to MongoDB
   - Redirect to login

---

## CONTENT SANITIZATION (lib/utils/sanitize.js)

For ALL scraped content (especially dark web):
1. Strip all `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>` tags
2. Remove all `on*` event handler attributes (onclick, onerror, etc.)
3. Remove `javascript:` URLs from href/src attributes
4. Truncate any single text field to 500 characters max
5. Strip null bytes and control characters

---

## IMPORTANT RULES

1. **No mock data anywhere.** Every scrape must make a real HTTP request and return real parsed data.
2. **No simulations.** The Tor connection either works (daemon running) or returns an error. No fake "connecting..." animations with predetermined outcomes.
3. **Every API route must be authenticated.** Use getServerSession() to verify. Return 401 if not authenticated.
4. **Dark web routes must check admin role.** Return 403 if not admin.
5. **Always close Puppeteer browsers.** Use try/finally to prevent memory leaks.
6. **Rate limit API routes.** Max 10 scrapes per minute per user. Return 429 if exceeded.
7. **Handle errors gracefully.** Never return raw stack traces to the client. Log server-side, return clean error messages.
8. **Validate all inputs.** Check URL format, reject obviously malicious inputs, sanitize extraction types.
9. **Set proper CORS headers** on API routes.
10. **The frontend must work without JavaScript disabled** — use Next.js SSR where possible.

---

## SETUP INSTRUCTIONS TO INCLUDE IN README.md

Write a README that includes:

1. Prerequisites: Node.js 18+, MongoDB Atlas account, Google OAuth credentials (optional), Tor (optional, for dark web)
2. Clone, npm install, create .env.local
3. How to set up MongoDB Atlas free tier
4. How to get Google OAuth credentials
5. How to install and run Tor daemon:
   - macOS: `brew install tor && tor`
   - Ubuntu: `sudo apt install tor && sudo systemctl start tor`
   - Windows: Download Tor Expert Bundle, run tor.exe
6. `npm run dev` → open http://localhost:3000
7. Default admin setup: explain how to manually set role to 'admin' in MongoDB for dark web access

---

## PACKAGES TO INSTALL

```bash
npm install next react react-dom
npm install tailwindcss @tailwindcss/typography postcss autoprefixer
npm install next-auth @auth/mongodb-adapter
npm install mongoose mongodb
npm install bcryptjs
npm install cheerio
npm install puppeteer
npm install socks-proxy-agent
npm install json2csv
```

---

## FINAL CHECKLIST BEFORE DELIVERY

- [ ] `npm run build` completes with zero errors
- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] Surface web scrape of https://news.ycombinator.com returns real links
- [ ] Deep web scrape of https://pubmed.ncbi.nlm.nih.gov returns real data
- [ ] Dark web scrape shows proper error when Tor is not running
- [ ] Dark web scrape works when Tor daemon is active (test with ahmia.fi first since it's clearnet)
- [ ] Results are saved to MongoDB and appear in history page
- [ ] JSON export downloads a valid .json file
- [ ] CSV export downloads a valid .csv file
- [ ] Non-admin users cannot access dark web scrape endpoint
- [ ] Rate limiting returns 429 after 10 rapid requests
- [ ] No console errors in browser
- [ ] No unhandled promise rejections in server logs
