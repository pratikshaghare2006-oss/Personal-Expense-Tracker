document.addEventListener("DOMContentLoaded", () => {
  const reg = $("#registerForm"),
    login = $("#loginForm");
  if (reg)
    reg.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(reg);
      if (f.get("password") !== f.get("confirm"))
        return showMsg($("#msg"), "Passwords do not match");
      try {
        const d = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: f.get("name"),
            email: f.get("email"),
            password: f.get("password"),
          }),
        });
        localStorage.setItem("pet_token", d.token);
        localStorage.setItem("pet_user", JSON.stringify(d.user));
        location.href = "/user/dashboard.html";
      } catch (x) {
        showMsg($("#msg"), x.message);
      }
    };
  if (login)
    login.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(login);
      try {
        const d = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: f.get("email"),
            password: f.get("password"),
          }),
        });
        localStorage.setItem("pet_token", d.token);
        localStorage.setItem("pet_user", JSON.stringify(d.user));
        location.href =
          d.user.role === "admin"
            ? "/admin/dashboard.html"
            : "/user/dashboard.html";
      } catch (x) {
        showMsg($("#msg"), x.message);
      }
    };
});
