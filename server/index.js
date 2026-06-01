const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const ip = require("local-ip-address");
const blessed = require("blessed");
const chalk = require("chalk");

// --- Socket Setup ---
const io = new Server(3000, { cors: { origin: "*" } });
const myIp = ip();
const connectionString = `http://${myIp}:3000`;

// --- UI Setup (Blessed) ---
const screen = blessed.screen({
  smartCSR: true,
  title: 'Linconnect Terminal',
  fullUnicode: true // Better support for symbols/emojis
});

// Container for the chat
const chatBox = blessed.log({
  top: 0,
  left: 0,
  width: '100%',
  height: '80%',
  label: ' {bold}Linconnect History{/bold} ',
  border: { type: 'line' },
  style: {
    border: { fg: '#3B82F6' },
    label: { fg: 'white' }
  },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    track: { bg: '#2D3748' },
    style: { inverse: true }
  },
  tags: true
});

// Container for instructions/status
const statusBar = blessed.box({
  top: '80%',
  left: 0,
  width: '100%',
  height: '8%',
  content: ` {bold}Status:{/bold} Waiting for connection... | {bold}Exit:{/bold} Type '/exit' or press ESC `,
  style: {
    fg: 'white',
    bg: '#1E293B'
  },
  tags: true
});

// Input field
const inputField = blessed.textbox({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  label: ' {bold}Message{/bold} ',
  border: { type: 'line' },
  style: {
    border: { fg: '#4338CA' }
  },
  inputOnFocus: true
});

screen.append(chatBox);
screen.append(statusBar);
screen.append(inputField);

function log(msg) {
  chatBox.log(msg);
  screen.render();
}

// --- Logic ---
let activeSocket = null;

// Display QR Code
chatBox.log(chalk.blue.bold(" LINCONNECT SERVER READY "));
chatBox.log(" Scan this code on your phone app to connect:");

qrcode.generate(connectionString, { small: true }, (code) => {
  chatBox.log(code);
  screen.render();
});

io.on("connection", (socket) => {
  activeSocket = socket;
  chatBox.log(""); // Add space
  log(chalk.green.bold("✔ ANDROID CONNECTED"));
  statusBar.setContent(" {bold}Status:{/bold} {green-fg}Connected{/green-fg} | {bold}Exit:{/bold} Type '/exit' or press ESC ");
  
  socket.on("message", (msg) => {
    log(chalk.yellow.bold("Android: ") + msg);
  });

  socket.on("disconnect", () => {
    log(chalk.red.bold("✖ DISCONNECTED"));
    statusBar.setContent(" {bold}Status:{/bold} {red-fg}Offline{/red-fg} | {bold}Exit:{/bold} Type '/exit' or press ESC ");
    activeSocket = null;
  });
});

inputField.on('submit', (value) => {
  if (value.toLowerCase() === '/exit') {
    process.exit(0);
  }
  
  if (value.trim() && activeSocket) {
    activeSocket.emit("message", value);
    log(chalk.blue.bold("Linux: ") + value);
  } else if (!activeSocket) {
    log(chalk.red("Error: Connect phone first!"));
  }
  
  inputField.clearValue();
  inputField.focus();
  screen.render();
});

// Exit triggers
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

// Initial Focus
inputField.focus();
screen.render();
