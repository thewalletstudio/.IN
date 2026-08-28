# The Wallet Studio — second-page + backend foundation

This package is designed to be merged into the existing `.IN` GitHub repository. The existing homepage visual system is preserved; the main change is that product-card `Order This Design` buttons now open `product.html?design=XX` instead of Instagram.

## Important
- Keep the existing root product images and `logo.jpg` from your GitHub repository.
- Back-design slots `design-35.jpg` through `design-65.jpg` are reserved. Add your own files with those exact names later.
- Do not commit `.env` or the database to GitHub.
- This build includes an order API, SQLite database, admin login/dashboard foundation, order status controls, customer search, product management and design 35–65 management.
- Live OTP and a real payment gateway still require a provider account/credentials before production.

## Local run
1. Copy `.env.example` to `.env`.
2. Set a strong `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/`.
6. Admin: `http://localhost:3000/admin/`.

## Deploy
Use a Node.js web-service host, not GitHub Pages, for the Express server. Connect the GitHub repository and set:
- Build: `npm install`
- Start: `npm start`
- Environment variables: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

If the host uses ephemeral storage, move uploads and the SQLite database to persistent storage before production.
