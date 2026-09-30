const db = require("../db");
const bcrypt = require("bcryptjs");
exports.get = async (req, res) => {
  const r = await db.query(
    "SELECT id,name,email,role,created_at FROM users WHERE id=$1",
    [req.user.id],
  );
  res.json(r.rows[0]);
};
exports.update = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const r = await db.query(
    "UPDATE users SET name=$1 WHERE id=$2 RETURNING id,name,email,role",
    [name, req.user.id],
  );
  res.json(r.rows[0]);
};
exports.password = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const r = await db.query("SELECT password_hash FROM users WHERE id=$1", [
    req.user.id,
  ]);
  if (
    !r.rows[0] ||
    !(await bcrypt.compare(currentPassword || "", r.rows[0].password_hash))
  )
    return res.status(400).json({ error: "Current password is incorrect" });
  const h = await bcrypt.hash(newPassword, 10);
  await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
    h,
    req.user.id,
  ]);
  res.json({ message: "Password updated" });
};
