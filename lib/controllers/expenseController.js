const db = require("../db");
exports.list = async (req, res) => {
  try {
    const r = await db.query(
      "SELECT t.*,c.name category_name FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=$1 AND t.type='expense' ORDER BY transaction_date DESC,id DESC",
      [req.user.id],
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "Could not load expenses" });
  }
};
exports.create = async (req, res) => {
  const { title, amount, category_id, transaction_date, description } =
    req.body;
  if (!title || Number(amount) < 0)
    return res.status(400).json({ error: "Title and valid amount required" });
  try {
    const r = await db.query(
      "INSERT INTO transactions(user_id,category_id,type,amount,title,transaction_date,description) VALUES($1,$2,'expense',$3,$4,$5,$6) RETURNING *",
      [
        req.user.id,
        category_id || null,
        amount,
        title,
        transaction_date || new Date().toISOString().slice(0, 10),
        description || "",
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Could not add expense" });
  }
};
exports.remove = async (req, res) => {
  await db.query(
    "DELETE FROM transactions WHERE id=$1 AND user_id=$2 AND type='expense'",
    [req.params.id, req.user.id],
  );
  res.json({ message: "Expense deleted" });
};
