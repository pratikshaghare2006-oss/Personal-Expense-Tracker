exports.ok = (res, data, message = "Success") =>
  res.json({ success: true, message, data });
exports.fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });
