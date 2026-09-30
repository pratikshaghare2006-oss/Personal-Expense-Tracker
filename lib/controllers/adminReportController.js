const db = require("../db");

exports.report = async (req, res) => {
  try {
    const { start, end, type, category, user } = req.query;

    const conditions = [];
    const params = [];
    let index = 1;

    // Date filter
    if (start) {
      conditions.push(`t.transaction_date >= $${index}`);
      params.push(start);
      index++;
    }

    if (end) {
      conditions.push(`t.transaction_date <= $${index}`);
      params.push(end);
      index++;
    }

    // Type filter
    if (type === "income" || type === "expense") {
      conditions.push(`t.type = $${index}`);
      params.push(type);
      index++;
    }

    // Category filter
    if (category) {
      const categoryId = Number(category);

      if (Number.isInteger(categoryId) && categoryId > 0) {
        conditions.push(`t.category_id = $${index}`);
        params.push(categoryId);
        index++;
      }
    }

    // User filter
    if (user) {
      const userId = Number(user);

      if (Number.isInteger(userId) && userId > 0) {
        conditions.push(`t.user_id = $${index}`);
        params.push(userId);
        index++;
      }
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // --------------------------------------------------
    // 1. OVERALL SUMMARY
    // --------------------------------------------------

    const summaryResult = await db.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'income' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'expense' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS expense,

        COUNT(*) AS count,

        COUNT(DISTINCT t.user_id) AS users

      FROM transactions t
      ${where}
    `,
      params,
    );

    // --------------------------------------------------
    // 2. MONTHLY REPORT
    // --------------------------------------------------

    const monthlyResult = await db.query(
      `
      SELECT
        TO_CHAR(t.transaction_date, 'YYYY-MM') AS month,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'income' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'expense' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS expense

      FROM transactions t

      ${where}

      GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM')

      ORDER BY month ASC
    `,
      params,
    );

    // --------------------------------------------------
    // 3. DAILY REPORT
    // --------------------------------------------------

    const dailyResult = await db.query(
      `
      SELECT
        TO_CHAR(t.transaction_date, 'YYYY-MM-DD') AS date,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'income' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'expense' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS expense

      FROM transactions t

      ${where}

      GROUP BY t.transaction_date

      ORDER BY t.transaction_date ASC
    `,
      params,
    );

    // --------------------------------------------------
    // 4. EXPENSE BY CATEGORY
    // --------------------------------------------------

    const categoryResult = await db.query(
      `
      SELECT
        COALESCE(c.name, 'Uncategorized') AS category,

        COALESCE(
          SUM(t.amount), 0
        ) AS total

      FROM transactions t

      LEFT JOIN categories c
        ON c.id = t.category_id

      ${where}
      ${where ? "AND" : "WHERE"} t.type = 'expense'

      GROUP BY COALESCE(c.name, 'Uncategorized')

      ORDER BY total DESC
    `,
      params,
    );

    // --------------------------------------------------
    // 5. USER-WISE REPORT
    // --------------------------------------------------

    const userResult = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,

        COUNT(t.id) AS transactions,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'income' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'expense' THEN t.amount
              ELSE 0
            END
          ), 0
        ) AS expense

      FROM users u

      LEFT JOIN transactions t
        ON t.user_id = u.id

      ${where ? where.replace("WHERE ", "WHERE ") : ""}

      GROUP BY u.id, u.name, u.email

      ORDER BY expense DESC, u.name ASC
    `,
      params,
    );

    // --------------------------------------------------
    // 6. TRANSACTION REPORT
    // --------------------------------------------------

    const transactionResult = await db.query(
      `
      SELECT
        t.id,
        u.name AS user_name,
        u.email,

        t.title,
        t.type,
        t.amount,

        COALESCE(c.name, 'Uncategorized') AS category,

        TO_CHAR(
          t.transaction_date,
          'YYYY-MM-DD'
        ) AS transaction_date

      FROM transactions t

      LEFT JOIN users u
        ON u.id = t.user_id

      LEFT JOIN categories c
        ON c.id = t.category_id

      ${where}

      ORDER BY
        t.transaction_date DESC,
        t.id DESC
    `,
      params,
    );

    // --------------------------------------------------
    // Convert PostgreSQL NUMERIC values
    // --------------------------------------------------

    const summaryRow = summaryResult.rows[0] || {};

    const summary = {
      income: Number(summaryRow.income) || 0,
      expense: Number(summaryRow.expense) || 0,
      balance:
        (Number(summaryRow.income) || 0) - (Number(summaryRow.expense) || 0),
      count: Number(summaryRow.count) || 0,
      users: Number(summaryRow.users) || 0,
    };

    const monthly = monthlyResult.rows.map((row) => ({
      month: row.month,
      income: Number(row.income) || 0,
      expense: Number(row.expense) || 0,
      balance: (Number(row.income) || 0) - (Number(row.expense) || 0),
    }));

    const daily = dailyResult.rows.map((row) => ({
      date: row.date,
      income: Number(row.income) || 0,
      expense: Number(row.expense) || 0,
      balance: (Number(row.income) || 0) - (Number(row.expense) || 0),
    }));

    const categories = categoryResult.rows.map((row) => ({
      category: row.category,
      total: Number(row.total) || 0,
    }));

    const users = userResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      transactions: Number(row.transactions) || 0,
      income: Number(row.income) || 0,
      expense: Number(row.expense) || 0,
      balance: (Number(row.income) || 0) - (Number(row.expense) || 0),
    }));

    const transactions = transactionResult.rows.map((row) => ({
      ...row,
      amount: Number(row.amount) || 0,
    }));

    res.json({
      summary,
      monthly,
      daily,
      categories,
      users,
      transactions,

      filters: {
        start: start || null,
        end: end || null,
        type: type || null,
        category: category || null,
        user: user || null,
      },
    });
  } catch (error) {
    console.error("Admin report error:", error);

    res.status(500).json({
      error: "Could not generate admin report",
      details: error.message,
    });
  }
};
