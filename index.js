require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

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
  console.error(err);

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
