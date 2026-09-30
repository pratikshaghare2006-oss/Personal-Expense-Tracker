const db = require("../db");
exports.list = async (req, res) => {
  try {
    const r = await db.query(
      "SELECT t.*,c.name category_name FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=$1 ORDER BY transaction_date DESC,id DESC",
      [req.user.id],
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "Could not load transactions" });
  }
};
exports.summary = async (req, res) => {
  try {
    const r = await db.query(
      "SELECT COALESCE(SUM(amount) FILTER(WHERE type='income'),0) income,COALESCE(SUM(amount) FILTER(WHERE type='expense'),0) expense FROM transactions WHERE user_id=$1",
      [req.user.id],
    );
    const x = r.rows[0];
    res.json({
      income: Number(x.income),
      expense: Number(x.expense),
      balance: Number(x.income) - Number(x.expense),
    });
  } catch (e) {
    res.status(500).json({ error: "Could not load summary" });
  }
};
