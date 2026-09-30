const db = require("../db");
exports.stats = async (req, res) => {
  const [u, t, e, i, m] = await Promise.all([
    db.query("SELECT COUNT(*) count FROM users WHERE role='user'"),
    db.query("SELECT COUNT(*) count FROM transactions"),
    db.query(
      "SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE type='expense'",
    ),
    db.query(
      "SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE type='income'",
    ),
    db.query("SELECT COUNT(*) count FROM messages WHERE status='unread'"),
  ]);
  res.json({
    users: Number(u.rows[0].count),
    transactions: Number(t.rows[0].count),
    expenses: Number(e.rows[0].total),
    income: Number(i.rows[0].total),
    messages: Number(m.rows[0].count),
  });
};
exports.users = async (req, res) => {
  const r = await db.query(
    "SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC",
  );
  res.json(r.rows);
};
exports.user = async (req, res) => {
  const u = await db.query(
    "SELECT id,name,email,role,created_at FROM users WHERE id=$1",
    [req.params.id],
  );
  const t = await db.query(
    "SELECT * FROM transactions WHERE user_id=$1 ORDER BY transaction_date DESC",
    [req.params.id],
  );
  res.json({ user: u.rows[0], transactions: t.rows });
};
exports.transactions = async (req, res) => {
  const r = await db.query(
    "SELECT t.*,u.name user_name,u.email FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.transaction_date DESC,t.id DESC",
  );
  res.json(r.rows);
};
exports.categories = async (req, res) => {
  const r = await db.query(
    "SELECT c.*,u.name user_name FROM categories c LEFT JOIN users u ON u.id=c.user_id ORDER BY c.name",
  );
  res.json(r.rows);
};
exports.messages = async (req, res) => {
  const r = await db.query(
    "SELECT m.*,u.name user_name FROM messages m LEFT JOIN users u ON u.id=m.user_id ORDER BY m.created_at DESC",
  );
  res.json(r.rows);
};
exports.markMessage = async (req, res) => {
  await db.query("UPDATE messages SET status='read' WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ message: "Marked as read" });
};
