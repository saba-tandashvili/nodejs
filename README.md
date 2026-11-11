# Products API

Express API for managing products and users in PostgreSQL with Prisma ORM.

## Setup

1. Install dependencies with `npm install`.
2. Create a PostgreSQL database and set its connection string in a local `.env` file:

   ```env
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/ecommerce?schema=public"
   PORT=3000
   JWT_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
   ```

   The application also supports the legacy `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, and `DB_DATABASE` variables.
3. Generate Prisma Client and synchronize the schema with the database:

   ```sh
   npm run prisma:generate
   npm run db:push
   ```

4. Start the API with `npm start`.

Run the API tests with `npm test`.

Swagger UI is available at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

## Authentication and authorization

Register with `POST /api/auth/register` using `firstName`, `lastName`, `email`, and a password (8-128 characters), or log in with `POST /api/auth/login`. Both return a JWT and public user information. Passwords are stored as scrypt hashes. Tokens expire after one hour.

Password recovery uses `POST /api/auth/forgot-password` with `{ "email": "user@example.com" }`, followed by `POST /api/auth/reset-password` with `{ "email": "user@example.com", "otp": "123456", "newPassword": "new-password" }`. Reset codes are emailed, expire after 10 minutes, and are invalidated after five incorrect attempts. Configure `SMTP_HOST`, `SMTP_FROM`, and optionally `SMTP_PORT` (default `587`), `SMTP_SECURE` (`true` or `false`), `SMTP_USER`, and `SMTP_PASSWORD` before enabling password recovery. After updating the Prisma schema, run `npm run db:push` and `npm run prisma:generate`.

Send the token on protected routes as `Authorization: Bearer <token>`. `GET /api/users/profile` returns the authenticated user's information without a password.

| Role | Access |
| --- | --- |
| `admin` | All product and user routes; can assign roles through the user API |
| `manager` | Access product routes only |
| `customer` | View products and buy products |

Public registration always creates a `customer`; it cannot assign privileged roles. Create the first admin by registering an account and changing its role to `admin` directly in the database. Admins can then assign `manager`, `customer`, or `admin` roles through `PATCH /api/users/:id`.

Import [docs/postman_collection.json](./docs/postman_collection.json) into Postman. The collection saves a successful registration or login token into its `jwt` variable and automatically sends it as a bearer token on protected requests. Update the collection's `baseUrl`, `email`, and `password` variables as needed.

## Product endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products/:id` | Get a product by ID |
| `POST` | `/api/products` | Create a product |
| `POST` | `/api/products/upload-excel` | Import products from an `.xlsx` file (admin or manager; multipart field `file`) |
| `PUT` / `PATCH` | `/api/products/:id` | Update one or more product fields |
| `DELETE` | `/api/products/:id` | Delete a product |
| `POST` | `/api/products/buyProduct/:id` | Record the authenticated user's purchase of a product (send `{}`) |

## User endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get a user by ID |
| `POST` | `/api/users/upload-picture` | Upload the authenticated user's picture (multipart field `picture`) |
| `POST` | `/api/users` | Create a user |
| `PUT` / `PATCH` | `/api/users/:id` | Update one or more user fields |
| `DELETE` | `/api/users/:id` | Delete a user |

A product requires a non-empty `name` and `description`, and a non-negative numeric `price`. The optional `stock`, `slug`, and `categoryId` fields support the category and product schema. For example:

```json
{
  "name": "Laptop",
  "price": 999.99,
  "description": "A high-performance laptop."
}
```

For product imports, upload an `.xlsx` workbook with the columns `name`, `price`, and `description`. Optional columns are `stock`, `slug`, and `categoryId`. The first worksheet is imported; every populated product row is validated before any products are created. Imports are limited to 5,000 products and files up to 10 MB.

Profile pictures may be JPEG, PNG, GIF, or WebP images up to 5 MB. The saved URL is included in the updated user response and files are served from `/uploads/profile-pictures/`.

The category, product, user, and purchase relations are defined in `prisma/schema.prisma`. Each purchase receives its own ID so that a user can buy the same product more than once.
