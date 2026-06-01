const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const localtunnel = require("localtunnel");
const blessed = require("blessed");
const chalk = require("chalk");

const PORT = 3000;
const io = new Server(PORT, { cors: { origin: "*" } });

// --- UI Setup ---
const screen = blessed.screen({ smartCSR: true, title: 'Linconnect Terminal', fullUnicode: true });
const chatBox = blessed.log({
  top: 0, left: 0, width: '100%', height: '80%',
  label: ' {bold}Linconnect History{/bold} ',
  border: { type: 'line' },
  style: { border: { fg: '#3B82F6' }, label: { fg: 'white' } },
  scrollable: true, alwaysScroll: true, tags: true
});
const statusBar = blessed.box({
  top: '80%', left: 0, width: '100%', height: '8%',
  content: " {bold}Status:{/bold} Initializing Tunnel... ",
  style: { fg: 'white', bg: '#1E293B' }, tags: true
});
const inputField = blessed.textbox({
  bottom: 0, left: 0, width: '100%', height: 3,
  label: ' {bold}Message{/bold} ', border: { type: 'line' },
  style: { border: { fg: '#4338CA' } }, inputOnFocus: true
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

async function startServer() {
  log(chalk.blue.bold(" LINCONNECT V2.1 (WSL FIX) "));
  log(" Creating secure tunnel for your phone...");

  try {
    const tunnel = await localtunnel({ port: PORT });
    
    log(chalk.green("✔ Tunnel Active!"));
    log(" Scan this code on your phone to connect:");

    qrcode.generate(tunnel.url, { small: true }, (code) => {
      chatBox.log(code);
      screen.render();
    });

    statusBar.setContent(" {bold}Status:{/bold} {yellow-fg}Waiting for phone...{/yellow-fg} | {bold}Exit:{/bold} Type '/exit' ");
    screen.render();

    tunnel.on('close', () => {
      log(chalk.red("Tunnel closed. Restarting..."));
    });

  } catch (err) {
    log(chalk.red("Tunnel Error: " + err.message));
  }
}

io.on("connection", (socket) => {
  activeSocket = socket;
  log(chalk.green.bold("\n✔ PHONE CONNECTED!"));
  statusBar.setContent(" {bold}Status:{/bold} {green-fg}Connected{/green-fg} | {bold}Exit:{/bold} Type '/exit' ");
  
  socket.on("message", (msg) => {
    log(chalk.yellow.bold("Android: ") + msg);
  });

  socket.on("disconnect", () => {
    log(chalk.red.bold("✖ PHONE DISCONNECTED"));
    statusBar.setContent(" {bold}Status:{/bold} {red-fg}Offline{/red-fg} ");
    activeSocket = null;
  });
});

inputField.on('submit', (value) => {
  if (value.toLowerCase() === '/exit') process.exit(0);
  if (value.trim() && activeSocket) {
    activeSocket.emit("message", value);
    log(chalk.blue.bold("Linux: ") + value);
  } else if (!activeSocket) {
    log(chalk.red("Error: Scan QR code first!"));
  }
  inputField.clearValue();
  inputField.focus();
  screen.render();
});

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
inputField.focus();
startServer();
