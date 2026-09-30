exports.email = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
exports.amount = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;
exports.required = (...values) =>
  values.every((v) => String(v ?? "").trim() !== "");
