const productSchema = {
  type: "object",
  required: ["name", "price", "description"],
  properties: {
    id: { type: "string", example: "1", readOnly: true },
    name: { type: "string", minLength: 1, example: "Laptop" },
    price: { type: "number", minimum: 0, maximum: 9999999999.99, example: 999.99 },
    description: { type: "string", minLength: 1, example: "A high-performance laptop." },
    stock: { type: "integer", minimum: 0, example: 20 },
    slug: { type: "string", nullable: true, example: "laptop" },
    categoryId: { type: "string", nullable: true, example: "1" },
  },
};

const userSchema = {
  type: "object",
  required: ["firstName", "lastName", "email"],
  properties: {
    id: { type: "string", example: "1", readOnly: true },
    firstName: { type: "string", minLength: 1, example: "Ada" },
    lastName: { type: "string", minLength: 1, example: "Lovelace" },
    email: { type: "string", format: "email", example: "ada@example.com" },
    role: { type: "string", enum: ["admin", "manager", "customer"], example: "customer" },
  },
};

const notFoundResponse = {
  description: "Product not found",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { error: { type: "string", example: "Product not found" } },
      },
    },
  },
};

const invalidRequestResponse = {
  description: "Invalid product id or request body",
};

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Products API",
    version: "1.0.0",
    description: "JWT-protected products and users API with role-based access.",
  },
  servers: [{ url: "http://localhost:3000" }],
  security: [{ bearerAuth: [] }],
  tags: [{ name: "Authentication" }, { name: "Products" }, { name: "Users" }],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a customer account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "email", "password"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Customer registered; response includes a JWT" },
          400: { description: "Invalid registration data" },
          409: { description: "Email already exists" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful; response includes a JWT" },
          401: { description: "Invalid email or password" },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        responses: {
          200: {
            description: "Products ordered by id",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Product" } },
              },
            },
          },
          500: { description: "Database error" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create a product (admin or manager)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ProductInput" } },
          },
        },
        responses: {
          201: {
            description: "Product created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: invalidRequestResponse,
          500: { description: "Database error" },
        },
      },
    },
    "/api/products/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
      ],
      get: {
        tags: ["Products"],
        summary: "Get a product",
        responses: {
          200: {
            description: "Product",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: invalidRequestResponse,
          404: notFoundResponse,
          500: { description: "Database error" },
        },
      },
      put: {
        tags: ["Products"],
        summary: "Update product fields (admin or manager)",
        description: "Updates one or more provided fields. Omitted fields remain unchanged.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ProductUpdate" } },
          },
        },
        responses: {
          200: {
            description: "Product updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: invalidRequestResponse,
          404: notFoundResponse,
          500: { description: "Database error" },
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Partially update a product (admin or manager)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ProductUpdate" } },
          },
        },
        responses: {
          200: {
            description: "Product updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: invalidRequestResponse,
          404: notFoundResponse,
          500: { description: "Database error" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete a product (admin or manager)",
        responses: {
          204: { description: "Product deleted" },
          400: invalidRequestResponse,
          404: notFoundResponse,
          500: { description: "Database error" },
        },
      },
    },
    "/api/products/buyProduct/{id}": {
      post: {
        tags: ["Products"],
        summary: "Record a product purchase (authenticated user)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[1-9][0-9]*$" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {},
              },
            },
          },
        },
        responses: {
          201: {
            description: "Purchase recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    productId: { type: "string" },
                  },
                },
              },
            },
          },
          400: invalidRequestResponse,
          404: { description: "Product or user not found" },
          500: { description: "Database error" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users (admin only)",
        responses: {
          200: {
            description: "Users ordered by id",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/User" } },
              },
            },
          },
          500: { description: "Database error" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create a user (admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UserInput" } },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: { description: "Invalid user data" },
          409: { description: "Email already exists" },
          500: { description: "Database error" },
        },
      },
    },
    "/api/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Get the authenticated user's profile",
        responses: {
          200: { description: "Profile without password" },
          401: { description: "Missing or invalid token" },
        },
      },
    },
    "/api/users/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
      ],
      get: {
        tags: ["Users"],
        summary: "Get a user (admin only)",
        responses: {
          200: {
            description: "User",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: { description: "Invalid user id" },
          404: { description: "User not found" },
          500: { description: "Database error" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update user fields (admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UserUpdate" } },
          },
        },
        responses: {
          200: {
            description: "User updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: { description: "Invalid user id or data" },
          404: { description: "User not found" },
          409: { description: "Email already exists" },
          500: { description: "Database error" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Partially update a user (admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UserUpdate" } },
          },
        },
        responses: {
          200: {
            description: "User updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: { description: "Invalid user id or data" },
          404: { description: "User not found" },
          409: { description: "Email already exists" },
          500: { description: "Database error" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user (admin only)",
        responses: {
          204: { description: "User deleted" },
          400: { description: "Invalid user id" },
          404: { description: "User not found" },
          500: { description: "Database error" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Product: productSchema,
      User: userSchema,
      UserInput: {
        type: "object",
        required: ["firstName", "lastName", "email", "password"],
        additionalProperties: false,
        properties: {
          firstName: userSchema.properties.firstName,
          lastName: userSchema.properties.lastName,
          email: userSchema.properties.email,
          password: { type: "string", minLength: 8, maxLength: 128 },
          role: userSchema.properties.role,
        },
      },
      UserUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          firstName: userSchema.properties.firstName,
          lastName: userSchema.properties.lastName,
          email: userSchema.properties.email,
          password: { type: "string", minLength: 8, maxLength: 128 },
          role: userSchema.properties.role,
        },
      },
      ProductInput: {
        type: "object",
        required: ["name", "price", "description"],
        additionalProperties: false,
        properties: {
          name: productSchema.properties.name,
          price: productSchema.properties.price,
          description: productSchema.properties.description,
          stock: productSchema.properties.stock,
          slug: productSchema.properties.slug,
          categoryId: productSchema.properties.categoryId,
        },
      },
      ProductUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: productSchema.properties.name,
          price: productSchema.properties.price,
          description: productSchema.properties.description,
          stock: productSchema.properties.stock,
          slug: productSchema.properties.slug,
          categoryId: productSchema.properties.categoryId,
        },
      },
    },
  },
};

export default swaggerDocument;
