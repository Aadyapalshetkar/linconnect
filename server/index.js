const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const ip = require("local-ip-address");

const io = new Server(3000, { cors: { origin: "*" } });
const myIp = ip();
const connectionString = `http://${myIp}:3000`;

console.log("Linconnect Server Started");
console.log("Scan the QR code below on your Android app to connect:");

qrcode.generate(connectionString, { small: true });

io.on("connection", (socket) => {
  console.log("Android device connected!");
  
  socket.on("message", (msg) => {
    console.log("Android:", msg);
    // Broadcast message to other clients or just log it for now
  });

  socket.on("disconnect", () => {
    console.log("Device disconnected.");
  });
});
