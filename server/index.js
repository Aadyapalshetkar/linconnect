const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const blessed = require("blessed");
const chalk = require("chalk");
const { spawn } = require("child_process");

const PORT = 3000;
const io = new Server(PORT, { 
  cors: { origin: "*" },
  transports: ["websocket"] 
});

// --- UI Setup ---
const screen = blessed.screen({
  smartCSR: true,
  title: 'Linconnect Pro',
  fullUnicode: true
});

// Sidebar/Header for QR and Status
const sidePanel = blessed.box({
  top: 0,
  right: 0,
  width: '40%',
  height: '92%',
  label: ' {bold}Connection{/bold} ',
  border: { type: 'line' },
  style: {
    border: { fg: '#3B82F6' },
    label: { fg: 'white' }
  },
  tags: true
});

// Main Chat Box
const chatBox = blessed.log({
  top: 0,
  left: 0,
  width: '60%',
  height: '92%',
  label: ' {bold}Messages{/bold} ',
  border: { type: 'line' },
  style: {
    border: { fg: '#4338CA' },
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

// Input field at bottom
const inputField = blessed.textbox({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  label: ' {bold}Type Message{/bold} ',
  border: { type: 'line' },
  style: {
    border: { fg: '#3B82F6' }
  },
  inputOnFocus: true
});

screen.append(chatBox);
screen.append(sidePanel);
screen.append(inputField);

function log(msg) {
  chatBox.log(msg);
  screen.render();
}

function updateStatus(status, color = 'white') {
  sidePanel.setContent(`\n {bold}Status:{/bold} {${color}-fg}${status}{/${color}-fg}\n\n {bold}Instructions:{/bold}\n 1. Scan the QR code\n 2. Stay on same screen\n\n {bold}Commands:{/bold}\n /exit - Quit app\n ESC   - Quit app`);
  screen.render();
}

let activeSocket = null;

function startTunnel() {
  log(chalk.blue.bold("Initializing Linconnect..."));
  updateStatus("Opening Tunnel...", "yellow");

  const ssh = spawn("ssh", ["-R", "80:localhost:3000", "nokey@localhost.run"]);

  ssh.stdout.on("data", (data) => {
    const output = data.toString();
    const urlMatch = output.match(/https:\/\/[a-z0-9-.]+/);
    
    if (urlMatch) {
      const tunnelUrl = urlMatch[0];
      sidePanel.children.forEach(c => sidePanel.remove(c)); // Clear old QR
      
      const qrBox = blessed.box({
        top: 12,
        left: 'center',
        width: 'shrink',
        height: 'shrink',
        content: 'Loading QR...',
        tags: true
      });
      sidePanel.append(qrBox);

      qrcode.generate(tunnelUrl, { small: true }, (code) => {
        qrBox.setContent(code);
        screen.render();
      });

      updateStatus("Ready to Connect", "green");
      log(chalk.green("✔ Server Live at: ") + tunnelUrl);
    }
  });

  ssh.stderr.on("data", (data) => {
    if (!data.toString().includes("Warning")) {
       // Silent background logs
    }
  });
}

io.on("connection", (socket) => {
  activeSocket = socket;
  log(chalk.cyan.bold("\n[System] Android Device Linked!"));
  updateStatus("Connected", "green");
  
  socket.on("message", (msg) => {
    log(chalk.yellow.bold("Android: ") + msg);
  });

  socket.on("disconnect", () => {
    log(chalk.red.bold("[System] Device Disconnected."));
    updateStatus("Offline", "red");
    activeSocket = null;
  });
});

inputField.on('submit', (value) => {
  if (value.toLowerCase() === '/exit') process.exit(0);
  
  if (value.trim()) {
    if (activeSocket) {
      activeSocket.emit("message", value);
      log(chalk.blue.bold("Linux: ") + value);
    } else {
      log(chalk.red("Error: No phone connected!"));
    }
  }
  
  inputField.clearValue();
  inputField.focus();
  screen.render();
});

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
inputField.focus();
startTunnel();
