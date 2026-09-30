require("dotenv").config();
const express = require("express"),
  cors = require("cors"),
  path = require("path");
const db = require("../lib/db"),
  { requireAuth, requireAdmin } = require("../lib/auth");

const auth = require("../lib/controllers/authController"),
  expense = require("../lib/controllers/expenseController"),
  income = require("../lib/controllers/incomeController"),
  transaction = require("../lib/controllers/transactionController"),
  category = require("../lib/controllers/categoryController"),
  budget = require("../lib/controllers/budgetController"),
  report = require("../lib/controllers/reportController"),
  profile = require("../lib/controllers/profileController"),
  contact = require("../lib/controllers/contactController"),
  admin = require("../lib/controllers/adminController"),
  adminReport = require("../lib/controllers/adminReportController");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));
app.post("/api/auth/register", auth.register);
app.post("/api/auth/login", auth.login);
app.post("/api/contact", contact.create);

// Public health check
app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS database_time");

    res.json({
      ok: true,
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Health check database error:", error);

    res.status(500).json({
      ok: false,
      error: "Database connection failed",
    });
  }
});

app.use("/api", requireAuth);
app.get("/api/me", profile.get);
app.put("/api/profile", profile.update);
app.put("/api/profile/password", profile.password);
app.get("/api/expenses", expense.list);
app.post("/api/expenses", expense.create);
app.delete("/api/expenses/:id", expense.remove);
app.get("/api/income", income.list);
app.post("/api/income", income.create);
app.delete("/api/income/:id", income.remove);
app.get("/api/transactions", transaction.list);
app.get("/api/summary", transaction.summary);
app.get("/api/categories", category.list);
app.post("/api/categories", category.create);
app.delete("/api/categories/:id", category.remove);
app.get("/api/budgets", budget.list);
app.post("/api/budgets", budget.create);
app.delete("/api/budgets/:id", budget.remove);
app.get("/api/reports", report.report);
app.use("/api/admin", requireAdmin);
app.get("/api/admin/stats", admin.stats);
app.get("/api/admin/users", admin.users);
app.get("/api/admin/users/:id", admin.user);
app.get("/api/admin/transactions", admin.transactions);
app.get("/api/admin/categories", admin.categories);
app.get("/api/admin/messages", admin.messages);
app.put("/api/admin/messages/:id/read", admin.markMessage);
app.get("/api/admin/reports", adminReport.report);
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Expense Tracker running on http://localhost:${port}`);
  });
}

module.exports = app;
