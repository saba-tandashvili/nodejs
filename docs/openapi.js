const productSchema = {
  type: "object",
  required: ["name", "price", "description"],
  properties: {
    id: { type: "string", example: "1", readOnly: true },
    name: { type: "string", minLength: 1, example: "Laptop" },
    price: { type: "number", minimum: 0, maximum: 9999999999.99, example: 999.99 },
    description: { type: "string", minLength: 1, example: "A high-performance laptop." },
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
    description: "CRUD API for products stored in PostgreSQL.",
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [{ name: "Products" }],
  paths: {
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
        summary: "Create a product",
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
        summary: "Update product fields",
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
        summary: "Partially update a product",
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
        summary: "Delete a product",
        responses: {
          204: { description: "Product deleted" },
          400: invalidRequestResponse,
          404: notFoundResponse,
          500: { description: "Database error" },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: productSchema,
      ProductInput: {
        type: "object",
        required: ["name", "price", "description"],
        additionalProperties: false,
        properties: {
          name: productSchema.properties.name,
          price: productSchema.properties.price,
          description: productSchema.properties.description,
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
        },
      },
    },
  },
};

export default swaggerDocument;
