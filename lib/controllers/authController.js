const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken } = require("../auth");
const { email, required } = require("../helpers/validation");

async function register(req, res) {
  const { name, email: userEmail, password } = req.body;
  if (
    !required(name, userEmail, password) ||
    !email(userEmail) ||
    password.length < 6
  )
    return res
      .status(400)
      .json({ error: "Enter valid name, email and password (6+ characters)." });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role",
      [name.trim(), userEmail.toLowerCase().trim(), hash],
    );
    const user = result.rows[0];
    const defaults = [
      ["Food", "expense"],
      ["Transport", "expense"],
      ["Shopping", "expense"],
      ["Bills", "expense"],
      ["Health", "expense"],
      ["Salary", "income"],
      ["Other", "income"],
    ];
    for (const [n, t] of defaults)
      await db.query(
        "INSERT INTO categories(user_id,name,type) VALUES($1,$2,$3)",
        [user.id, n, t],
      );
    res.json({ token: signToken(user), user });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Email already registered." });
    console.error(e);
    res.status(500).json({ error: "Registration failed." });
  }
}

async function login(req, res) {
  const { email: userEmail, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [
      String(userEmail || "")
        .toLowerCase()
        .trim(),
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
      return res.status(401).json({ error: "Invalid email or password." });
    res.json({
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed." });
  }
}

module.exports = { register, login };
