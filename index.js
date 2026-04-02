if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { verifyAccessToken } = require("./helper-function/jwt");

const app = express();

// =========================
// Security & Basic Middleware
// =========================
app.set("trust proxy", 1); // important if behind proxy (nginx, cloudflare, etc.)

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600, // adjust as needed
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET || "saporsi_cookie_secret"));

// =========================
// View Engine (EJS)
// =========================
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

function wrapHtmlWithShell(html, req) {
  if (typeof html !== "string") return html;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html;

  const bodyInner = bodyMatch[1];
  const isAuthPage = req.path.startsWith("/auth");
  const isLoggedIn = Boolean(req.user);
  const userRole = req.user?.role || "";
  const year = new Date().getFullYear();

  const navHtml =
    userRole === "merchant"
      ? `
      <nav class="shell-nav">
        <a href="/merchant">Dashboard</a>
        <a href="/merchant/orders">Orders</a>
      </nav>`
      : `
      <nav class="shell-nav">
        <a href="/admin">Dashboard</a>
        <a href="/admin/merchants">Merchants</a>
        <a href="/admin/locations">Locations</a>
        <a href="/admin/machines">Machines</a>
        <a href="/admin/products">Products</a>
        <a href="/admin/slots">Slots</a>
        <a href="/admin/orders">Orders</a>
      </nav>`;

  const shellBody = (isAuthPage || !isLoggedIn)
    ? `
<body class="shell shell-auth shell-guest">
  <div class="auth-layout auth-layout-full">
    <section class="auth-panel auth-panel-full">
      ${bodyInner}
    </section>
  </div>
</body>`
    : `
<body class="shell shell-app">
  <div class="app-layout">
    <aside class="shell-sidebar">
      <a class="brand" href="/admin">Saporsi Core</a>
      ${navHtml}
      <a class="shell-logout" href="/auth/logout">Logout</a>
    </aside>
    <main class="shell-main">
      <header class="shell-header">
        <h1>${req.path === "/admin" ? "Admin Workspace" : "Operational Workspace"}</h1>
        <p>${req.path}</p>
      </header>
      <section class="shell-content">${bodyInner}</section>
    </main>
  </div>
</body>`;

  return html.replace(/<body[^>]*>[\s\S]*?<\/body>/i, shellBody);
}

// Inject global stylesheet and app shell into every rendered HTML view.
app.use((req, res, next) => {
  // Optional user hydration so shell can decide to show/hide sidebar.
  if (!req.user && req.cookies && req.cookies.access_token) {
    try {
      const decoded = verifyAccessToken(String(req.cookies.access_token));
      req.user = {
        id: String(decoded.sub || ""),
        role: decoded.role || "",
        merchant_id: decoded.merchant_id ?? null,
      };
    } catch (_) {
      // ignore invalid token here; route-level auth middleware remains the source of truth
    }
  }

  const originalRender = res.render.bind(res);

  res.render = (view, locals = {}, callback) => {
    const renderLocals = typeof locals === "function" ? {} : locals;
    const renderCallback = typeof locals === "function" ? locals : callback;
    const linkTag = '<link rel="stylesheet" href="/public/theme-v2.css" />';
    const renderCb = (err, html) => {
      if (err) {
        if (typeof renderCallback === "function") return renderCallback(err);
        return next(err);
      }

      const htmlWithTheme =
        typeof html === "string" && !html.includes('href="/public/theme-v2.css"')
          ? html.replace("</head>", `  ${linkTag}\n</head>`)
          : html;
      const themedHtml = wrapHtmlWithShell(htmlWithTheme, req);

      if (typeof renderCallback === "function") return renderCallback(null, themedHtml);
      return res.send(themedHtml);
    };

    if (typeof renderCallback === "function") {
      return originalRender(view, renderLocals, renderCb);
    }

    return originalRender(view, renderLocals, renderCb);
  };

  return next();
});

// =========================
// Static Files
// =========================
app.use("/public", express.static(path.join(__dirname, "public")));

// =========================
// Routes
// =========================
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const merchantRoutes = require("./routes/merchant");
const ordersRoutes = require("./routes/merchant/orders");
const vendor = require("./routes/vendor");

// const apiRoutes = require("./routes/api");

// Landing / Health
app.get("/", (req, res) => {
  return res.redirect("/auth/login");
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "saporsi-core",
    time: new Date().toISOString(),
  });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/merchant", merchantRoutes);
app.use("/orders", ordersRoutes);
app.use("/vendor", vendor);
// app.use("/api", apiRoutes);

// =========================
// 404 Handler
// =========================
app.use((req, res) => {
  return res.status(404).render("errors/404", {
    title: "Not Found",
    path: req.originalUrl,
  });
});

// =========================
// Error Handler
// =========================
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).render("errors/500", {
    title: "Server Error",
    debug: isDev ? (err && err.stack ? err.stack : String(err)) : null,
  });
});

// =========================
// Server Start
// =========================
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Saporsi Core running on port ${PORT}`);
});

console.log(process.env.JWT_SECRET, 'JWT SECRET');