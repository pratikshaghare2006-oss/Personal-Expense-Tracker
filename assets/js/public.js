document.addEventListener("DOMContentLoaded", () => {
  const f = $("#contactForm");
  if (f)
    f.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      try {
        await api("/contact", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(fd)),
        });
        showMsg($("#msg"), "Your message was sent.", true);
        f.reset();
      } catch (x) {
        showMsg($("#msg"), x.message);
      }
    };
});
