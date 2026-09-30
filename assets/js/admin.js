function adminGuard() {
  const u = user();

  if (!token() || u?.role !== "admin") {
    location.href = "/admin/login.html";
    return false;
  }

  return true;
}

// =====================================================
// ADMIN DASHBOARD STATS
// =====================================================

async function adminStats() {
  const d = await api("/admin/stats");

  ["users", "transactions", "expenses", "income", "messages"].forEach((k) => {
    const el = $("#" + k);

    if (el) {
      el.textContent = k === "expenses" || k === "income" ? money(d[k]) : d[k];
    }
  });
}

// =====================================================
// USERS
// =====================================================

async function adminUsers() {
  const d = await api("/admin/users");

  const body = $("#userBody");

  if (!body) return;

  body.innerHTML = d
    .map(
      (u) => `
        <tr>
          <td>${u.id}</td>

          <td>${esc(u.name)}</td>

          <td>${esc(u.email)}</td>

          <td>
            <span class="pill">
              ${esc(u.role)}
            </span>
          </td>

          <td>
            ${new Date(u.created_at).toLocaleDateString()}
          </td>

          <td>
            <a
              class="btn btn-outline"
              href="/admin/user-details.html?id=${u.id}"
            >
              View
            </a>
          </td>
        </tr>
      `,
    )
    .join("");
}

// =====================================================
// TRANSACTIONS
// =====================================================

async function adminTransactions() {
  const d = await api("/admin/transactions");

  const body = $("#adminTxBody");

  if (!body) return;

  body.innerHTML = d
    .map(
      (t) => `
        <tr>
          <td>${esc(t.user_name)}</td>

          <td>${esc(t.title)}</td>

          <td>${esc(t.type)}</td>

          <td>${money(t.amount)}</td>

          <td>${esc(t.transaction_date)}</td>
        </tr>
      `,
    )
    .join("");
}

// =====================================================
// CATEGORIES
// =====================================================

async function adminCategories() {
  const d = await api("/admin/categories");

  const body = $("#adminCatBody");

  if (!body) return;

  body.innerHTML = d
    .map(
      (c) => `
        <tr>
          <td>${esc(c.name)}</td>

          <td>${esc(c.type)}</td>

          <td>${esc(c.user_name || "—")}</td>
        </tr>
      `,
    )
    .join("");
}

// =====================================================
// MESSAGES
// =====================================================

async function adminMessages() {
  const d = await api("/admin/messages");

  const body = $("#messageBody");

  if (!body) return;

  body.innerHTML = d
    .map(
      (m) => `
        <tr>
          <td>${esc(m.name || "—")}</td>

          <td>${esc(m.email)}</td>

          <td>${esc(m.subject || "—")}</td>

          <td>${esc(m.message)}</td>

          <td>${esc(m.status)}</td>

          <td>
            <button
              class="btn btn-success"
              onclick="readMsg(${m.id})"
            >
              Read
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
}

async function readMsg(id) {
  await api("/admin/messages/" + id + "/read", {
    method: "PUT",
  });

  adminMessages();
}

// =====================================================
// LOAD USERS FOR REPORT FILTER
// =====================================================

async function loadReportUsers() {
  const select = $("#reportUser");

  if (!select) return;

  try {
    const users = await api("/admin/users");

    select.innerHTML =
      `<option value="">All Users</option>` +
      users
        .map(
          (u) =>
            `<option value="${u.id}">
              ${esc(u.name)} - ${esc(u.email)}
            </option>`,
        )
        .join("");
  } catch (e) {
    console.error("Could not load report users:", e);
  }
}

// =====================================================
// LOAD CATEGORIES FOR REPORT FILTER
// =====================================================

async function loadReportCategories() {
  const select = $("#reportCategory");

  if (!select) return;

  try {
    const categories = await api("/admin/categories");

    const unique = new Map();

    categories.forEach((c) => {
      if (c.id) {
        unique.set(c.id, c);
      }
    });

    select.innerHTML =
      `<option value="">All Categories</option>` +
      Array.from(unique.values())
        .map(
          (c) =>
            `<option value="${c.id}">
              ${esc(c.name)}
            </option>`,
        )
        .join("");
  } catch (e) {
    console.error("Could not load report categories:", e);
  }
}

// =====================================================
// ADMIN REPORT
// =====================================================

async function loadAdminReports() {
  const message = $("#reportMessage");

  try {
    if (message) {
      message.hidden = true;
    }

    const params = new URLSearchParams();

    const start = $("#start")?.value;
    const end = $("#end")?.value;
    const type = $("#reportType")?.value;
    const category = $("#reportCategory")?.value;
    const selectedUser = $("#reportUser")?.value;

    if (start) params.set("start", start);

    if (end) params.set("end", end);

    if (type) params.set("type", type);

    if (category) params.set("category", category);

    if (selectedUser) params.set("user", selectedUser);

    const query = params.toString();

    const data = await api("/admin/reports" + (query ? "?" + query : ""));

    renderReportSummary(data.summary);

    renderMonthlyReport(data.monthly);

    renderDailyReport(data.daily);

    renderCategoryReport(data.categories);

    renderUserReport(data.users);

    renderTransactionReport(data.transactions);
  } catch (e) {
    console.error(e);

    if (message) {
      message.textContent = e.message || "Could not generate reports.";

      message.hidden = false;
      message.className = "alert";
    }
  }
}

// =====================================================
// SUMMARY
// =====================================================

function renderReportSummary(summary) {
  const income = Number(summary.income || 0);

  const expense = Number(summary.expense || 0);

  const balance = income - expense;

  if ($("#reportIncome")) {
    $("#reportIncome").textContent = money(income);
  }

  if ($("#reportExpense")) {
    $("#reportExpense").textContent = money(expense);
  }

  if ($("#reportBalance")) {
    $("#reportBalance").textContent = money(balance);
  }

  if ($("#reportCount")) {
    $("#reportCount").textContent = Number(summary.count || 0).toLocaleString(
      "en-IN",
    );
  }
}

// =====================================================
// MONTHLY
// =====================================================

function renderMonthlyReport(rows) {
  const body = $("#monthlyBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyRow(4);

    return;
  }

  body.innerHTML = rows
    .map((r) => {
      const balance = Number(r.income || 0) - Number(r.expense || 0);

      return `
        <tr>
          <td>${esc(r.month)}</td>

          <td class="report-income">
            ${money(r.income)}
          </td>

          <td class="report-expense">
            ${money(r.expense)}
          </td>

          <td>
            ${money(balance)}
          </td>
        </tr>
      `;
    })
    .join("");
}

// =====================================================
// DAILY
// =====================================================

function renderDailyReport(rows) {
  const body = $("#dailyBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyRow(4);

    return;
  }

  body.innerHTML = rows
    .map((r) => {
      const balance = Number(r.income || 0) - Number(r.expense || 0);

      return `
        <tr>
          <td>${esc(r.date)}</td>

          <td class="report-income">
            ${money(r.income)}
          </td>

          <td class="report-expense">
            ${money(r.expense)}
          </td>

          <td>
            ${money(balance)}
          </td>
        </tr>
      `;
    })
    .join("");
}

// =====================================================
// CATEGORY
// =====================================================

function renderCategoryReport(rows) {
  const body = $("#categoryBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyRow(3);

    return;
  }

  body.innerHTML = rows
    .map(
      (r) => `
        <tr>
          <td>
            <strong>
              ${esc(r.category)}
            </strong>
          </td>

          <td>
            ${Number(r.transactions).toLocaleString("en-IN")}
          </td>

          <td class="report-expense">
            ${money(r.total)}
          </td>
        </tr>
      `,
    )
    .join("");
}

// =====================================================
// USER
// =====================================================

function renderUserReport(rows) {
  const body = $("#userReportBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyRow(6);

    return;
  }

  body.innerHTML = rows
    .map((r) => {
      const balance = Number(r.income || 0) - Number(r.expense || 0);

      return `
        <tr>

          <td>
            <strong>
              ${esc(r.name)}
            </strong>
          </td>

          <td>
            ${esc(r.email)}
          </td>

          <td>
            ${Number(r.transactions).toLocaleString("en-IN")}
          </td>

          <td class="report-income">
            ${money(r.income)}
          </td>

          <td class="report-expense">
            ${money(r.expense)}
          </td>

          <td>
            ${money(balance)}
          </td>

        </tr>
      `;
    })
    .join("");
}

// =====================================================
// TRANSACTIONS
// =====================================================

function renderTransactionReport(rows) {
  const body = $("#transactionReportBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = emptyRow(7);

    return;
  }

  body.innerHTML = rows
    .map(
      (r) => `
        <tr>

          <td>
            ${r.id}
          </td>

          <td>
            ${esc(r.user_name)}
          </td>

          <td>
            ${esc(r.title)}
          </td>

          <td>
            ${esc(r.category)}
          </td>

          <td>
            <span class="pill">
              ${esc(r.type)}
            </span>
          </td>

          <td class="${
            r.type === "income" ? "report-income" : "report-expense"
          }">
            ${money(r.amount)}
          </td>

          <td>
            ${esc(r.transaction_date)}
          </td>

        </tr>
      `,
    )
    .join("");
}

// =====================================================
// EMPTY TABLE
// =====================================================

function emptyRow(columns) {
  return `
    <tr>
      <td
        colspan="${columns}"
        style="text-align:center;padding:30px;"
      >
        No report data found.
      </td>
    </tr>
  `;
}

// =====================================================
// RESET FILTERS
// =====================================================

function resetReportFilters() {
  if ($("#start")) $("#start").value = "";

  if ($("#end")) $("#end").value = "";

  if ($("#reportType")) {
    $("#reportType").value = "";
  }

  if ($("#reportCategory")) {
    $("#reportCategory").value = "";
  }

  if ($("#reportUser")) {
    $("#reportUser").value = "";
  }

  loadAdminReports();
}

// =====================================================
// PRINT ONE REPORT
// =====================================================

function printReport(id, title) {
  const section = document.getElementById(id);

  if (!section) return;

  document.querySelectorAll(".report-section").forEach((el) => {
    el.classList.remove("print-target");
  });

  section.classList.add("print-target");

  document.body.classList.add("printing");

  const oldTitle = document.title;

  document.title = "ExpenseTrack - " + title;

  window.print();

  setTimeout(() => {
    document.body.classList.remove("printing");

    section.classList.remove("print-target");

    document.title = oldTitle;
  }, 500);
}

// =====================================================
// PRINT ALL REPORTS
// =====================================================

function printAllReports() {
  document.body.classList.add("printing-all");

  const oldTitle = document.title;

  document.title = "ExpenseTrack - Complete Admin Reports";

  window.print();

  setTimeout(() => {
    document.body.classList.remove("printing-all");

    document.title = oldTitle;
  }, 500);
}

// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  if (!adminGuard()) return;

  try {
    // Dashboard
    if ($("#users")) {
      await adminStats();
    }

    // Users
    if ($("#userBody")) {
      await adminUsers();
    }

    // Transactions
    if ($("#adminTxBody")) {
      await adminTransactions();
    }

    // Categories
    if ($("#adminCatBody")) {
      await adminCategories();
    }

    // Messages
    if ($("#messageBody")) {
      await adminMessages();
    }

    // User details
    const q = new URLSearchParams(location.search);

    if ($("#userDetail") && q.get("id")) {
      const d = await api("/admin/users/" + q.get("id"));

      $("#userDetail").innerHTML = `
          <h2>
            ${esc(d.user.name)}
          </h2>

          <p>
            ${esc(d.user.email)}
          </p>

          <p>
            Role: ${esc(d.user.role)}
          </p>

          <h3>
            Transactions
          </h3>

          <div class="table-wrap">

            <table class="table">

              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>

              ${d.transactions
                .map(
                  (t) => `
                    <tr>
                      <td>
                        ${esc(t.title)}
                      </td>

                      <td>
                        ${esc(t.type)}
                      </td>

                      <td>
                        ${money(t.amount)}
                      </td>

                      <td>
                        ${esc(t.transaction_date)}
                      </td>
                    </tr>
                  `,
                )
                .join("")}

            </table>

          </div>
        `;
    }

    // REPORT PAGE
    if ($("#reportFilters")) {
      await loadReportUsers();

      await loadReportCategories();

      await loadAdminReports();

      $("#reportFilters").addEventListener("submit", (e) => {
        e.preventDefault();

        loadAdminReports();
      });
    }
  } catch (e) {
    console.error(e);
  }
});

// Make functions available to HTML
window.readMsg = readMsg;

window.printReport = printReport;

window.printAllReports = printAllReports;

window.resetReportFilters = resetReportFilters;
