require("dotenv").config();
const db = require("../lib/db");
const bcrypt = require("bcryptjs");
(async () => {
  const [, , email, name, password] = process.argv;
  if (!email || !name || !password) {
    console.log("Usage: npm run create-admin -- email name password");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO UPDATE SET role='admin',password_hash=EXCLUDED.password_hash,name=EXCLUDED.name",
    [name, email, hash],
  );
  console.log("Admin created/updated");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
