import fs from "fs";
import http from "http";

// 1

// fs.writeFile("message.txt", "Hello, Node.js!", (err) => {
//   if (err) throw err;

//   fs.readFile("message.txt", "utf8", (err, data) => {
//     if (err) throw err;
//     console.log(data);
//   });
// });

// 2

// fs.writeFile("message.txt", "Hello, Node.js! ", (err) => {
//   if (err) throw err;

//   fs.appendFile("message.txt", "ეს არის ახალი ხაზი.", (err) => {
//     if (err) throw err;

//     fs.readFile("message.txt", "utf8", (err, data) => {
//       if (err) throw err;
//       console.log(data);

//       fs.unlink("message.txt", (err) => {
//         if (err) throw err;
//       });
//     });
//   });
// });


// 3

// console.log('1. წაკითხვის დაწყება...');

// const data = fs.readFileSync('three.txt', 'utf8');
// console.log('2. ფაილის ზომა:', data.length);

// console.log('3. დასასრული');



// console.log('1. წაკითხვის დაწყება...');

// fs.readFile('three.txt', 'utf8', (err, data) => {
//   if (err) throw err;
//   console.log('2. ფაილის ზომა:', data.length);
// });

// console.log('3. დასასრული');



// 4

// const server = http.createServer((req, res) => {
//     res.writeHead(200, { "Content-Type": "text/plain" });
//     res.end("Hello, World!\n");
// });

// server.listen(3000, "localhost", () => {
//     console.log("Welcome to my Node.js server!");
// })


// 5

// const server = http.createServer((req, res) => {
//     if(req.url === "/") {
//         res.writeHead(200, { "Content-Type": "text/plain" });
//         res.end("Home Page\n");
//     }
//     else if(req.url === "/about") {
//         res.writeHead(200, { "Content-Type": "text/plain" });
//         res.end("About Page\n");
//     }
//     else{
//         res.writeHead(404, { "Content-Type": "text/plain" });
//         res.end("404 Not Found\n");
//     }
// });

// server.listen(3000, "localhost", () => {
//     console.log("Welcome to my Node.js server!");
// })