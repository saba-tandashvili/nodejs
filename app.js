import express from "express";
import fs from "fs";
import data from "./data/products.json";

const app = express();
app.use(express.json());

// 1.
app.post("/buy/:id", (req, res) => {
  const productId = parseInt(req.params.id);

  const products = JSON.parse(data);
  const productIndex = products.findIndex(product => product.id === productId);

  products[productIndex] = {
    ...products[productIndex],
    stock: products[productIndex].stock - 1
  };

  fs.writeFileSync("./data/products.json", JSON.stringify(products));

  res.json({
    message: "You bought the product.",
    data: products[productIndex]
  });
});

// 2. 
app.delete("/products/delete-all", (req, res) => {
  fs.writeFileSync("./data/products.json", JSON.stringify([]));

  res.json({
    message: "All products deleted successfully."
  });
});

// 3. 
app.get("/products/count", (req, res) => {
  const products = JSON.parse(data);

  res.json({
    count: products.length
  });
});

// 4, 5, 7. POST /products (ვალიდაცია, დუბლიკატი, createdAt, stock)
app.post("/products", (req, res) => {
  const { name, price, stock } = req.body;

  // 4. 
  if (!name || price === undefined) {
    return res.send("name and price are required!");
  }

  const products = JSON.parse(data);

  // 5.  
  const existingProduct = products.find(product => product.name === name);
  if (existingProduct) {
    return res.send("Product already exists!");
  }

  // 9 (ბონუსი). სარეზერვო ასლის შენახვა განახლებამდე
  fs.writeFileSync("./data/products_backup.json", JSON.stringify(products));

  // 1 & 7. ახალი პროდუქტის შექმნა
  const newProduct = {
    id: Date.now(),
    name: name,
    price: price,
    stock: stock ?? 10,
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);

  fs.writeFileSync("./data/products.json", JSON.stringify(products));

  res.json({
    message: "Product added successfully.",
    data: newProduct
  });
});

// 6. 
app.get("/products/most-expensive", (req, res) => {
  const products = JSON.parse(data);

  const mostExpensive = products.reduce((prev, current) => {
    return prev.price > current.price ? prev : current;
  });

  res.json({
    data: mostExpensive
  });
});

// 8. 
app.get("/products/latest", (req, res) => {
  const products = JSON.parse(data);
  const latestProduct = products[products.length - 1];

  res.json({
    data: latestProduct
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});