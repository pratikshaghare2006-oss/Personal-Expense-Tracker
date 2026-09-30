const db = require("../db");
exports.list = async (req, res) => {
  const r = await db.query(
    "SELECT b.*,c.name category_name FROM budgets b JOIN categories c ON c.id=b.category_id WHERE b.user_id=$1 ORDER BY year DESC,month DESC",
    [req.user.id],
  );
  res.json(r.rows);
};
exports.create = async (req, res) => {
  const { category_id, amount, month, year } = req.body;
  const r = await db.query(
    "INSERT INTO budgets(user_id,category_id,amount,month,year) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,category_id,month,year) DO UPDATE SET amount=EXCLUDED.amount RETURNING *",
    [req.user.id, category_id, amount, month, year],
  );
  res.status(201).json(r.rows[0]);
};
exports.remove = async (req, res) => {
  await db.query("DELETE FROM budgets WHERE id=$1 AND user_id=$2", [
    req.params.id,
    req.user.id,
  ]);
  res.json({ message: "Budget deleted" });
};
