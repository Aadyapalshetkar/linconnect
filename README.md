# Linconnect V2

Linconnect is a login-less, QR-pairing chat application.

## How to Run (Linux)
To start the pairing server and show the QR code:
```bash
linconnect
```

## How to Run (Android)
1. Download and install the APK.
2. Scan the QR code from your Linux terminal.
3. Start chatting!

## Build Instructions (Client)
To generate your own APK:
```bash
cd client
npx eas-cli build --platform android --profile preview
```
