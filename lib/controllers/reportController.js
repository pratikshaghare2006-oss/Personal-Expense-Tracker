const db = require("../db");

exports.report = async (req, res) => {
  try {
    const userId = req.user.id;

    const { start, end, type, category } = req.query;

    /*
     * Build filters safely using parameterized
     * PostgreSQL values.
     */

    const conditions = ["t.user_id = $1"];

    const params = [userId];

    let index = 2;

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

    if (type === "income" || type === "expense") {
      conditions.push(`t.type = $${index}`);

      params.push(type);
      index++;
    }

    if (category) {
      const categoryId = Number(category);

      if (Number.isInteger(categoryId) && categoryId > 0) {
        conditions.push(`t.category_id = $${index}`);

        params.push(categoryId);
        index++;
      }
    }

    const where = conditions.join(" AND ");

    /*
     * 1. Transaction rows
     */

    const transactionsResult = await db.query(
      `
        SELECT
          t.id,
          t.title,
          t.amount,
          t.type,
          TO_CHAR(
            t.transaction_date,
            'YYYY-MM-DD'
          ) AS transaction_date,
          COALESCE(
            c.name,
            'Uncategorized'
          ) AS category_name
        FROM transactions t
        LEFT JOIN categories c
          ON c.id = t.category_id
        WHERE ${where}
        ORDER BY
          t.transaction_date DESC,
          t.id DESC
        `,
      params,
    );

    /*
     * 2. Overall summary
     */

    const summaryResult = await db.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'income'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS income,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'expense'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS expense,

          COUNT(*) AS count

        FROM transactions t

        WHERE ${where}
        `,
      params,
    );

    /*
     * 3. Monthly income/expense report
     */

    const monthlyResult = await db.query(
      `
        SELECT
          TO_CHAR(
            t.transaction_date,
            'YYYY-MM'
          ) AS month,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'income'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS income,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'expense'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS expense

        FROM transactions t

        WHERE ${where}

        GROUP BY
          TO_CHAR(
            t.transaction_date,
            'YYYY-MM'
          )

        ORDER BY month ASC
        `,
      params,
    );

    /*
     * 4. Expense by category
     *
     * We deliberately force expense here because
     * this report represents spending categories.
     */

    const categoryConditions = ["t.user_id = $1", "t.type = 'expense'"];

    const categoryParams = [userId];

    let categoryIndex = 2;

    if (start) {
      categoryConditions.push(`t.transaction_date >= $${categoryIndex}`);

      categoryParams.push(start);
      categoryIndex++;
    }

    if (end) {
      categoryConditions.push(`t.transaction_date <= $${categoryIndex}`);

      categoryParams.push(end);
      categoryIndex++;
    }

    if (category) {
      const categoryId = Number(category);

      if (Number.isInteger(categoryId) && categoryId > 0) {
        categoryConditions.push(`t.category_id = $${categoryIndex}`);

        categoryParams.push(categoryId);

        categoryIndex++;
      }
    }

    const categoryWhere = categoryConditions.join(" AND ");

    const categoriesResult = await db.query(
      `
        SELECT
          COALESCE(
            c.name,
            'Uncategorized'
          ) AS category,

          COALESCE(
            SUM(t.amount),
            0
          ) AS total

        FROM transactions t

        LEFT JOIN categories c
          ON c.id = t.category_id

        WHERE ${categoryWhere}

        GROUP BY
          COALESCE(
            c.name,
            'Uncategorized'
          )

        ORDER BY
          total DESC
        `,
      categoryParams,
    );

    /*
     * Convert PostgreSQL numeric values to numbers.
     *
     * PostgreSQL commonly returns NUMERIC values
     * as strings through node-postgres.
     */

    const transactions = transactionsResult.rows.map((row) => ({
      ...row,
      amount: Number(row.amount) || 0,
    }));

    const summaryRow = summaryResult.rows[0] || {};

    const summary = {
      income: Number(summaryRow.income) || 0,

      expense: Number(summaryRow.expense) || 0,

      count: Number(summaryRow.count) || 0,
    };

    const monthly = monthlyResult.rows.map((row) => ({
      month: row.month,

      income: Number(row.income) || 0,

      expense: Number(row.expense) || 0,
    }));

    const categories = categoriesResult.rows.map((row) => ({
      category: row.category,

      total: Number(row.total) || 0,
    }));

    res.json({
      summary,
      monthly,
      categories,
      transactions,
      filters: {
        start: start || null,
        end: end || null,
        type: type || null,
        category: category || null,
      },
    });
  } catch (e) {
    console.error("Report generation error:", e);

    res.status(500).json({
      error: "Could not generate report",
    });
  }
};
