let currentReportData = {
  summary: {
    income: 0,
    expense: 0,
    balance: 0,
    count: 0,
    users: 0,
  },

  monthly: [],
  daily: [],
  categories: [],
  users: [],
  transactions: [],
};

function reportMoney(value) {
  return (
    "₹" +
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function reportDate(value) {
  if (!value) return "—";

  const parts = String(value).split("-");

  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return value;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function loadReportFilters() {
  try {
    const users = await api("/admin/users");

    const userSelect = $("#reportUser");

    if (!userSelect) return;

    userSelect.innerHTML = `
      <option value="">All Users</option>
    `;

    safeArray(users).forEach((u) => {
      const option = document.createElement("option");

      option.value = u.id;

      option.textContent = `${u.name} - ${u.email}`;

      userSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Could not load users:", error);
  }

  try {
    const categories = await api("/admin/categories");

    const categorySelect = $("#reportCategory");

    if (!categorySelect) return;

    categorySelect.innerHTML = `
      <option value="">All Categories</option>
    `;

    const unique = new Map();

    safeArray(categories).forEach((c) => {
      if (!unique.has(c.name)) {
        unique.set(c.name, c);
      }
    });

    unique.forEach((c) => {
      const option = document.createElement("option");

      option.value = c.id || "";

      option.textContent = c.name;

      if (!c.id) {
        option.disabled = true;
      }

      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Could not load categories:", error);
  }
}

async function generateAdminReports() {
  const errorBox = $("#reportError");

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  const start = $("#startDate")?.value || "";
  const end = $("#endDate")?.value || "";
  const type = $("#reportType")?.value || "";
  const category = $("#reportCategory")?.value || "";
  const userId = $("#reportUser")?.value || "";

  if (start && end && start > end) {
    showReportError("Start date cannot be later than end date.");

    return;
  }

  try {
    const query = new URLSearchParams();

    if (start) query.set("start", start);

    if (end) query.set("end", end);

    if (type) query.set("type", type);

    if (category) query.set("category", category);

    if (userId) query.set("user", userId);

    const queryString = query.toString();

    const data = await api(
      "/admin/reports" + (queryString ? "?" + queryString : ""),
    );

    currentReportData = {
      summary: data?.summary || {
        income: 0,
        expense: 0,
        balance: 0,
        count: 0,
        users: 0,
      },

      monthly: safeArray(data?.monthly),

      daily: safeArray(data?.daily),

      categories: safeArray(data?.categories),

      users: safeArray(data?.users),

      transactions: safeArray(data?.transactions),
    };

    renderSummary(currentReportData.summary);

    renderMonthly(currentReportData.monthly);

    renderDaily(currentReportData.daily);

    renderCategories(currentReportData.categories);

    renderUsers(currentReportData.users);

    renderTransactions(currentReportData.transactions);
  } catch (error) {
    console.error(error);

    showReportError(error.message || "Unable to generate reports.");
  }
}

function showReportError(message) {
  const errorBox = $("#reportError");

  if (!errorBox) return;

  errorBox.textContent = message;

  errorBox.hidden = false;
}

function renderSummary(summary) {
  $("#reportIncome").textContent = reportMoney(summary.income);

  $("#reportExpense").textContent = reportMoney(summary.expense);

  $("#reportBalance").textContent = reportMoney(summary.balance);

  $("#reportCount").textContent = Number(summary.count || 0).toLocaleString(
    "en-IN",
  );

  $("#reportUsers").textContent = Number(summary.users || 0).toLocaleString(
    "en-IN",
  );
}

function renderMonthly(rows) {
  const body = $("#monthlyBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          No monthly report data found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${esc(row.month)}</td>

          <td class="income-text">
            ${reportMoney(row.income)}
          </td>

          <td class="expense-text">
            ${reportMoney(row.expense)}
          </td>

          <td class="balance-text">
            ${reportMoney(row.balance)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderDaily(rows) {
  const body = $("#dailyBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          No daily report data found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${reportDate(row.date)}</td>

          <td class="income-text">
            ${reportMoney(row.income)}
          </td>

          <td class="expense-text">
            ${reportMoney(row.expense)}
          </td>

          <td class="balance-text">
            ${reportMoney(row.balance)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderCategories(rows) {
  const body = $("#categoryBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="2" class="empty-row">
          No expense category data found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            <span class="category-name">
              ${esc(row.category)}
            </span>
          </td>

          <td class="expense-text">
            ${reportMoney(row.total)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderUsers(rows) {
  const body = $("#userReportBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          No user report data found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            <strong>
              ${esc(row.name)}
            </strong>
          </td>

          <td>
            ${esc(row.email)}
          </td>

          <td>
            ${Number(row.transactions || 0).toLocaleString("en-IN")}
          </td>

          <td class="income-text">
            ${reportMoney(row.income)}
          </td>

          <td class="expense-text">
            ${reportMoney(row.expense)}
          </td>

          <td class="balance-text">
            ${reportMoney(row.balance)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderTransactions(rows) {
  const body = $("#transactionReportBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          No transaction data found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>

          <td>
            ${esc(row.user_name || "—")}
          </td>

          <td>
            ${esc(row.title)}
          </td>

          <td>
            <span
              class="type-badge ${
                row.type === "income" ? "income-badge" : "expense-badge"
              }"
            >
              ${esc(row.type)}
            </span>
          </td>

          <td>
            ${esc(row.category || "Uncategorized")}
          </td>

          <td
            class="${row.type === "income" ? "income-text" : "expense-text"}"
          >
            ${reportMoney(row.amount)}
          </td>

          <td>
            ${reportDate(row.transaction_date)}
          </td>

        </tr>
      `,
    )
    .join("");
}

function resetReportFilters() {
  if ($("#startDate")) {
    $("#startDate").value = "";
  }

  if ($("#endDate")) {
    $("#endDate").value = "";
  }

  if ($("#reportType")) {
    $("#reportType").value = "";
  }

  if ($("#reportCategory")) {
    $("#reportCategory").value = "";
  }

  if ($("#reportUser")) {
    $("#reportUser").value = "";
  }

  generateAdminReports();
}

function printSection(id) {
  const section = document.getElementById(id);

  if (!section) return;

  document.body.classList.add("printing-single");

  document.querySelectorAll(".report-section").forEach((el) => {
    el.classList.remove("print-target");
  });

  section.classList.add("print-target");

  window.print();

  setTimeout(() => {
    section.classList.remove("print-target");

    document.body.classList.remove("printing-single");
  }, 500);
}

function printAllReports() {
  document.body.classList.add("printing-all");

  window.print();

  setTimeout(() => {
    document.body.classList.remove("printing-all");
  }, 500);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!adminGuard()) return;

  await loadReportFilters();

  await generateAdminReports();
});
