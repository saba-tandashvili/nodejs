# Products API

Express API for managing products stored in PostgreSQL.

## Setup

1. Install dependencies with `npm install`.
2. Create a PostgreSQL database and set these values in a local `.env` file:

   ```env
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=ecommerce
   PORT=3000
   ```

3. Create the products table by running `db/schema.sql` against that database.
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

A product has a non-empty `name`, a non-negative numeric `price`, and a non-empty `description`. For example:

```json
{
  "name": "Laptop",
  "price": 999.99,
  "description": "A high-performance laptop."
}
```
