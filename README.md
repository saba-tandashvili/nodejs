# Products API

Express API for managing products and users in PostgreSQL with Prisma ORM.

## Setup

1. Install dependencies with `npm install`.
2. Create a PostgreSQL database and set its connection string in a local `.env` file:

   ```env
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/ecommerce?schema=public"
   PORT=3000
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

## Product endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products/:id` | Get a product by ID |
| `POST` | `/api/products` | Create a product |
| `PUT` / `PATCH` | `/api/products/:id` | Update one or more product fields |
| `DELETE` | `/api/products/:id` | Delete a product |
| `POST` | `/api/products/buyProduct/:id` | Record a user's purchase of a product |

## User endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get a user by ID |
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

Create a user with `firstName`, `lastName`, and a unique `email`. To record a purchase, send `POST /api/products/buyProduct/:id` with the buyer's ID:

```json
{
  "userId": "1"
}
```

The category, product, user, and purchase relations are defined in `prisma/schema.prisma`. Each purchase receives its own ID so that a user can buy the same product more than once.
