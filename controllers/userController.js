import fs from "fs";

const data = fs.readFileSync("./data/users.json", "utf-8");

const getUsers = (req, res) => {
  res.json(JSON.parse(data));
};

const createUser = (req, res) => {
  const users = JSON.parse(data);
  const newUser = { ...req.body, id: Date.now() };
  users.push(newUser);
  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
  res.status(201).json(newUser);
};

const editUser = (req, res) => {
  const users = JSON.parse(data);
  const userIndex = users.findIndex(
    (user) => user.id === parseInt(req.params.id)
  );
  if (userIndex === -1) return res.status(404).json({ message: "User not found" });

  const updatedUser = { ...users[userIndex], ...req.body };
  users[userIndex] = updatedUser;
  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
  res.json(updatedUser);
};

const deleteUser = (req, res) => {
  const users = JSON.parse(data);
  const userIndex = users.findIndex(
    (user) => user.id === parseInt(req.params.id)
  );
  if (userIndex === -1) return res.status(404).json({ message: "User not found" });

  users.splice(userIndex, 1);
  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
  res.status(204).send();
};

export { getUsers, createUser, editUser, deleteUser };