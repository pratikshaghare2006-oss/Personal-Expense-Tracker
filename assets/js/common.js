const API = "/api";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function token() {
  return localStorage.getItem("pet_token");
}
function user() {
  try {
    return JSON.parse(localStorage.getItem("pet_user") || "null");
  } catch {
    return null;
  }
}
async function api(path, options = {}) {
  options.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token()) options.headers.Authorization = "Bearer " + token();
  const r = await fetch(API + path, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
function money(n) {
  return (
    "₹" +
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}
function logout() {
  localStorage.clear();
  location.href = "/user/login.html";
}
function requireLogin() {
  if (!token()) location.href = "/user/login.html";
}
function showMsg(el, msg, ok = false) {
  if (el) {
    el.textContent = msg;
    el.className = ok ? "alert success" : "alert";
    el.hidden = false;
  }
}
function setupNav() {
  const b = $(".nav-toggle"),
    n = $(".nav-links");
  if (b) b.onclick = () => n.classList.toggle("open");
}
document.addEventListener("DOMContentLoaded", setupNav);
