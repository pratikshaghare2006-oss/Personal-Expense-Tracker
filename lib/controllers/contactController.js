exports.create = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!message || !email)
    return res.status(400).json({ error: "Email and message are required" });
  await db.query(
    "INSERT INTO messages(user_id,name,email,subject,message) VALUES($1,$2,$3,$4,$5)",
    [req.user?.id || null, name || "", email, subject || "", message],
  );
  res.json({ message: "Message sent successfully" });
};
