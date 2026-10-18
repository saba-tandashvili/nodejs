import fs from "fs"
1
const readProducts = () => JSON.parse(fs.readFileSync("./data/products.json", "utf8"))

const getProducts = (req, res) => {
  res.json(readProducts())
}

const createProducts = (req, res) => {
  const products = readProducts();
  const newProduct = {
    ...req.body,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  }

  if(!newProduct.name || !newProduct.price ) {
    res.status(406).json({ message: "name and price are required" })
  }

  products.push(newProduct)
  fs.copyFileSync("./data/products.json", `./data/products_backup_${newProduct.id}.json`)
  fs.writeFileSync("./data/products.json", JSON.stringify(products))
  res.status(201).json(newProduct)
}

const editProduct = (req, res) => {
  const products = readProducts();
  const productIndex = products.findIndex(
    (product) => product.id === parseInt(req.params.id)
  )
  const newProduct = { ...products[productIndex], ...req.body }
  products[productIndex] = newProduct;
  fs.writeFileSync("./data/products.json", JSON.stringify(products));
  res.json(newProduct);
}

const deleteProduct = (req, res) => {
  const products = readProducts();
  const newProducts = products.filter(
    (product) => product.id !== parseInt(req.params.id)
  )
  fs.writeFileSync("./data/products.json", JSON.stringify(newProducts));
  res.status(200).send("Product deleted")
}

const buyProduct = (req, res) => {
  const productId = parseInt(req.params.id)

  const products = readProducts();
  const productIndex = products.findIndex(
    (product) => product.id === productId
  )

  if (products[productIndex].stock === -1) {
    return res.status(404).json({ message: "Product not found" })
  }

  fs.writeFileSync("./data/products.json", JSON.stringify(products));

  res.json({
    message: "You buy that product",
    data: products[productIndex],
  })
}

export {getProducts, createProducts, editProduct, deleteProduct, buyProduct}