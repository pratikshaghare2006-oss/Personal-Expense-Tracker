const db = require("../db");
exports.list = async (req, res) => {
  const r = await db.query(
    "SELECT * FROM categories WHERE user_id=$1 ORDER BY type,name",
    [req.user.id],
  );
  res.json(r.rows);
};
exports.create = async (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !["expense", "income"].includes(type))
    return res.status(400).json({ error: "Invalid category" });
  const r = await db.query(
    "INSERT INTO categories(user_id,name,type,color) VALUES($1,$2,$3,$4) RETURNING *",
    [req.user.id, name, type, color || "#2563eb"],
  );
  res.status(201).json(r.rows[0]);
};
exports.remove = async (req, res) => {
  await db.query("DELETE FROM categories WHERE id=$1 AND user_id=$2", [
    req.params.id,
    req.user.id,
  ]);
  res.json({ message: "Category deleted" });
};
