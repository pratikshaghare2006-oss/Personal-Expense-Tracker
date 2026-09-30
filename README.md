# Personal Expense Tracker

Blue-theme expense and income tracker built with HTML, CSS, JavaScript, Node.js, Express and PostgreSQL.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add your PostgreSQL `DATABASE_URL` and `JWT_SECRET`.
3. Run `npm install`.
4. Run the SQL in `database/schema.sql`, then `database/seed.sql` if needed.
5. Run `npm run dev`.
6. Open http://localhost:3000

## Admin

Create an admin with:
`npm run create-admin -- admin@example.com Admin@123 Admin`
