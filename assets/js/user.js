requireLogin();

const pathName = location.pathname;

/* =========================================================
   SUMMARY
========================================================= */

async function loadSummary() {
  const d = await api("/summary");

  if ($("#incomeTotal")) $("#incomeTotal").textContent = money(d.income);

  if ($("#expenseTotal")) $("#expenseTotal").textContent = money(d.expense);

  if ($("#balanceTotal")) $("#balanceTotal").textContent = money(d.balance);

  if ($("#balanceText")) {
    $("#balanceText").textContent =
      d.balance >= 0
        ? "You are within your income."
        : "Your expenses are higher than income.";
  }
}

/* =========================================================
   CATEGORIES
========================================================= */

async function loadCats(type) {
  const cs = await api("/categories");

  return cs.filter((c) => !type || c.type === type);
}

async function fillCategories(sel, type) {
  const cs = await loadCats(type);

  sel.innerHTML =
    '<option value="">Select category</option>' +
    cs.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
}

/* =========================================================
   TRANSACTIONS
========================================================= */

function row(t, kind) {
  return `
    <tr>
      <td>${esc(t.title)}</td>

      <td>${esc(t.category_name || "—")}</td>

      <td>${esc(t.transaction_date)}</td>

      <td class="${kind === "income" ? "income" : "expense"}">
        ${kind === "income" ? "+" : "-"}${money(t.amount)}
      </td>

      <td>
        <button
          class="btn btn-danger"
          onclick="deleteTx(${t.id},'${kind}')"
        >
          Delete
        </button>
      </td>
    </tr>
  `;
}

async function loadTransactions(type) {
  const data = await api(type ? "/" + type : "/transactions");

  const tb = $("#transactionBody");

  if (!tb) return;

  tb.innerHTML = data.length
    ? data.map((x) => row(x, type || x.type)).join("")
    : `
      <tr>
        <td colspan="5" class="empty">
          No transactions yet.
        </td>
      </tr>
    `;
}

async function deleteTx(id, type) {
  if (!confirm("Delete this transaction?")) return;

  await api(`/${type}/${id}`, {
    method: "DELETE",
  });

  if ($("#transactionBody")) await loadTransactions(type);

  if ($("#incomeTotal")) await loadSummary();
}

/* =========================================================
   USER PROFILE
========================================================= */

async function initUserPage() {
  if (!token()) return;

  const u = user();

  $$("[data-user-name]").forEach((x) => (x.textContent = u?.name || "User"));

  const form = $("#profileForm");

  if (form) {
    const me = await api("/me");

    form.name.value = me.name;
    form.email.value = me.email;

    form.onsubmit = async (e) => {
      e.preventDefault();

      try {
        await api("/profile", {
          method: "PUT",
          body: JSON.stringify({
            name: form.name.value,
          }),
        });

        showMsg($("#msg"), "Profile updated.", true);

        localStorage.setItem(
          "pet_user",
          JSON.stringify({
            ...u,
            name: form.name.value,
          }),
        );
      } catch (x) {
        showMsg($("#msg"), x.message);
      }
    };
  }
}

/* =========================================================
   CATEGORIES PAGE
========================================================= */

async function renderCats() {
  const d = await api("/categories");

  const list = $("#categoryList");

  if (!list) return;

  list.innerHTML = d.length
    ? d
        .map(
          (c) => `
          <div class="card">
            <strong>${esc(c.name)}</strong>

            <span class="pill">
              ${esc(c.type)}
            </span>

            <button
              style="float:right"
              class="btn btn-danger"
              onclick="removeCat(${c.id})"
            >
              Delete
            </button>
          </div>
        `,
        )
        .join("")
    : '<div class="empty">No categories.</div>';
}

async function removeCat(id) {
  await api("/categories/" + id, {
    method: "DELETE",
  });

  await renderCats();
}

/* =========================================================
   BUDGETS
========================================================= */

async function renderBudgets() {
  const d = await api("/budgets");

  const list = $("#budgetList");

  if (!list) return;

  list.innerHTML = d.length
    ? d
        .map(
          (b) => `
          <div class="card">
            <strong>
              ${esc(b.category_name)}
            </strong>

            <p>
              ${money(b.amount)}
              · ${b.month}/${b.year}
            </p>

            <button
              class="btn btn-danger"
              onclick="removeBudget(${b.id})"
            >
              Delete
            </button>
          </div>
        `,
        )
        .join("")
    : '<div class="empty">No budgets.</div>';
}

async function removeBudget(id) {
  await api("/budgets/" + id, {
    method: "DELETE",
  });

  await renderBudgets();
}

/* =========================================================
   REPORT HELPERS
========================================================= */

let currentReport = null;

function reportNumber(value) {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function formatMonth(month) {
  if (!month) return "";

  const parts = String(month).split("-");

  if (parts.length !== 2) return month;

  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function reportQuery() {
  const params = new URLSearchParams();

  const start = $("#reportStart")?.value || "";

  const end = $("#reportEnd")?.value || "";

  const type = $("#reportType")?.value || "";

  const category = $("#reportCategory")?.value || "";

  if (start) params.set("start", start);

  if (end) params.set("end", end);

  if (type) params.set("type", type);

  if (category) params.set("category", category);

  const query = params.toString();

  return query ? "?" + query : "";
}

/* =========================================================
   REPORT CATEGORY FILTER
========================================================= */

async function loadReportCategories() {
  const select = $("#reportCategory");

  if (!select) return;

  const categories = await api("/categories");

  select.innerHTML =
    '<option value="">All Categories</option>' +
    categories
      .map(
        (c) =>
          `<option value="${c.id}">
            ${esc(c.name)}
          </option>`,
      )
      .join("");
}

/* =========================================================
   REPORT SUMMARY
========================================================= */

function renderReportSummary(summary) {
  const income = reportNumber(summary.income);

  const expense = reportNumber(summary.expense);

  const balance = income - expense;

  if ($("#reportIncome")) $("#reportIncome").textContent = money(income);

  if ($("#reportExpense")) $("#reportExpense").textContent = money(expense);

  if ($("#reportBalance")) $("#reportBalance").textContent = money(balance);

  if ($("#reportCount"))
    $("#reportCount").textContent = Number(summary.count || 0);
}

/* =========================================================
   MONTHLY CHART
========================================================= */

function renderMonthlyChart(monthly) {
  const chart = $("#monthlyChart");

  if (!chart) return;

  if (!monthly.length) {
    chart.innerHTML =
      '<div class="empty-report">No monthly data available.</div>';

    return;
  }

  const values = monthly.flatMap((m) => [
    reportNumber(m.income),
    reportNumber(m.expense),
  ]);

  const max = Math.max(...values, 1);

  chart.innerHTML = monthly
    .map((m) => {
      const income = reportNumber(m.income);

      const expense = reportNumber(m.expense);

      const incomeHeight = Math.max(income > 0 ? 3 : 0, (income / max) * 180);

      const expenseHeight = Math.max(
        expense > 0 ? 3 : 0,
        (expense / max) * 180,
      );

      return `
        <div
          class="month-column"
          title="${esc(formatMonth(m.month))}"
        >
          <div class="month-bars">

            <div
              class="month-bar income"
              style="height:${incomeHeight}px"
              title="Income: ${money(income)}"
            ></div>

            <div
              class="month-bar expense"
              style="height:${expenseHeight}px"
              title="Expense: ${money(expense)}"
            ></div>

          </div>

          <div class="month-label">
            ${esc(formatMonth(m.month))}
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   CATEGORY REPORT
========================================================= */

function renderCategoryReport(categories) {
  const box = $("#categoryReport");

  if (!box) return;

  if (!categories.length) {
    box.innerHTML =
      '<div class="empty-report">No expense data available.</div>';

    return;
  }

  const max = Math.max(...categories.map((c) => reportNumber(c.total)), 1);

  box.innerHTML = categories
    .map((c) => {
      const total = reportNumber(c.total);

      const percent = (total / max) * 100;

      return `
        <div class="category-row">

          <div
            class="category-name"
            title="${esc(c.category)}"
          >
            ${esc(c.category)}
          </div>

          <div class="category-progress">
            <div
              class="category-progress-fill"
              style="width:${percent}%"
            ></div>
          </div>

          <div class="category-amount">
            ${money(total)}
          </div>

        </div>
      `;
    })
    .join("");
}

/* =========================================================
   TRANSACTION REPORT TABLE
========================================================= */

function renderReportTransactions(transactions) {
  const body = $("#reportTransactionBody");

  if (!body) return;

  if (!transactions.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="empty-report"
        >
          No transactions found
          for the selected filters.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = transactions
    .map((t) => {
      const type = t.type === "income" ? "income" : "expense";

      const amount = reportNumber(t.amount);

      return `
          <tr>
            <td>
              ${esc(t.transaction_date || "")}
            </td>

            <td>
              ${esc(t.title || "—")}
            </td>

            <td>
              ${esc(t.category_name || "Uncategorized")}
            </td>

            <td>
              <span
                class="type-pill ${type}"
              >
                ${type}
              </span>
            </td>

            <td
              class="amount ${type}"
            >
              ${type === "income" ? "+" : "-"}${money(amount)}
            </td>
          </tr>
        `;
    })
    .join("");
}

/* =========================================================
   LOAD REPORT
========================================================= */

async function renderReports() {
  const errorBox = $("#reportError");

  if (errorBox) errorBox.innerHTML = "";

  try {
    const query = reportQuery();

    const d = await api("/reports" + query);

    currentReport = d;

    renderReportSummary(
      d.summary || {
        income: 0,
        expense: 0,
        count: 0,
      },
    );

    renderMonthlyChart(d.monthly || []);

    renderCategoryReport(d.categories || []);

    renderReportTransactions(d.transactions || []);

    if ($("#reportResultText")) {
      $("#reportResultText").textContent =
        `${(d.transactions || []).length} transaction(s)`;
    }

    updatePrintPeriod();
  } catch (e) {
    console.error("Report error:", e);

    if (errorBox) {
      errorBox.innerHTML = `
        <div class="report-error">
          ${esc(e.message || "Could not load report.")}
        </div>
      `;
    }

    if ($("#monthlyChart")) {
      $("#monthlyChart").innerHTML =
        '<div class="empty-report">Unable to load report.</div>';
    }
  }
}

/* =========================================================
   PRINT
========================================================= */

function updatePrintPeriod() {
  const target = $("#printPeriod");

  if (!target) return;

  const start = $("#reportStart")?.value;

  const end = $("#reportEnd")?.value;

  if (start && end) {
    target.textContent = `Period: ${start} to ${end}`;
  } else if (start) {
    target.textContent = `From: ${start}`;
  } else if (end) {
    target.textContent = `Until: ${end}`;
  } else {
    target.textContent = "Period: All available transactions";
  }
}

function printReport() {
  updatePrintPeriod();
  window.print();
}

/* =========================================================
   CSV EXPORT
========================================================= */

function csvEscape(value) {
  const text = value == null ? "" : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function exportReportCSV() {
  if (!currentReport || !currentReport.transactions) {
    alert("Please load the report first.");

    return;
  }

  const rows = [["Date", "Title", "Category", "Type", "Amount"]];

  currentReport.transactions.forEach((t) => {
    rows.push([
      t.transaction_date || "",
      t.title || "",
      t.category_name || "Uncategorized",
      t.type || "",
      reportNumber(t.amount),
    ]);
  });

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "expense-report.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/* =========================================================
   CLEAR REPORT FILTERS
========================================================= */

function clearReportFilters() {
  if ($("#reportStart")) $("#reportStart").value = "";

  if ($("#reportEnd")) $("#reportEnd").value = "";

  if ($("#reportType")) $("#reportType").value = "";

  if ($("#reportCategory")) $("#reportCategory").value = "";

  renderReports();
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!token()) return;

    if ($("#incomeTotal")) await loadSummary();

    if (pathName.includes("transactions")) {
      await loadTransactions();
    }

    /* Expense form */

    if ($("#expenseForm")) {
      await fillCategories($("#category"), "expense");

      $("#expenseForm").onsubmit = async (e) => {
        e.preventDefault();

        try {
          await api("/expenses", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
          });

          showMsg($("#msg"), "Expense added successfully.", true);

          e.target.reset();
        } catch (x) {
          showMsg($("#msg"), x.message);
        }
      };
    }

    /* Income form */

    if ($("#incomeForm")) {
      await fillCategories($("#category"), "income");

      $("#incomeForm").onsubmit = async (e) => {
        e.preventDefault();

        try {
          await api("/income", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
          });

          showMsg($("#msg"), "Income added successfully.", true);

          e.target.reset();
        } catch (x) {
          showMsg($("#msg"), x.message);
        }
      };
    }

    /* Category form */

    if ($("#categoryForm")) {
      $("#categoryForm").onsubmit = async (e) => {
        e.preventDefault();

        try {
          await api("/categories", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
          });

          showMsg($("#msg"), "Category created.", true);

          e.target.reset();

          await renderCats();
        } catch (x) {
          showMsg($("#msg"), x.message);
        }
      };

      await renderCats();
    }

    /* Budget form */

    if ($("#budgetForm")) {
      await fillCategories($("#category"), "expense");

      $("#budgetForm").onsubmit = async (e) => {
        e.preventDefault();

        try {
          await api("/budgets", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
          });

          showMsg($("#msg"), "Budget saved.", true);

          e.target.reset();

          await renderBudgets();
        } catch (x) {
          showMsg($("#msg"), x.message);
        }
      };

      await renderBudgets();
    }

    /* Reports */

    if ($("#monthlyChart")) {
      await loadReportCategories();
      await renderReports();

      if ($("#applyReportFilters")) {
        $("#applyReportFilters").onclick = renderReports;
      }

      if ($("#clearReportFilters")) {
        $("#clearReportFilters").onclick = clearReportFilters;
      }

      if ($("#printReport")) {
        $("#printReport").onclick = printReport;
      }

      if ($("#exportReport")) {
        $("#exportReport").onclick = exportReportCSV;
      }
    }

    await initUserPage();
  } catch (e) {
    console.error(e);
  }
});

/* =========================================================
   GLOBALS
========================================================= */

window.deleteTx = deleteTx;

window.removeCat = removeCat;

window.removeBudget = removeBudget;

window.renderReports = renderReports;
