# ChatChatter

A peer-to-peer offline-first chat application built with React Native and Expo.
Users communicate directly with each other without relying on a central server for messaging.

---

## What makes ChatChatter different

Most chat apps require an internet connection and route all messages through a central server.
ChatChatter works offline by using Bluetooth and WiFi Direct to form a mesh network between
devices. Messages hop from device to device until they reach their destination, even without
internet access.

---

## Core features

### Invite system
Users cannot chat with strangers. Before two people can message each other, one must invite
the other through one of four methods:

- Invite link — share a unique deep link via any platform (WhatsApp, SMS, email, etc.)
- QR code — display a QR code for the other person to scan
- Username search — search by username if both devices are on the same local network
- Phone or email sync — match contacts from your phone book or email to find people already on ChatChatter

### Offline mesh networking
When no internet is available, ChatChatter uses:

- Bluetooth Low Energy (BLE) for device discovery and short-range messaging
- WiFi Direct (P2P) for higher bandwidth connections between nearby devices
- Message queuing — messages are stored locally and delivered when the recipient comes within range
- Multi-hop routing — messages can travel through intermediate devices to reach distant peers

### End-to-end encryption
Every message is encrypted using the recipient's public key before it leaves the sender's device.
No server ever sees message content. Keys are generated locally and never uploaded.

### Offline-first architecture
- All messages are stored in a local SQLite database
- The app works fully without internet
- When internet is available, it syncs pending messages and presence data through an optional relay server
- Conflict resolution handles messages arriving out of order

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 56 |
| Navigation | Expo Router (file-based) |
| State management | Redux Toolkit |
| Local database | SQLite via expo-sqlite |
| Bluetooth | react-native-ble-plx |
| WiFi Direct | react-native-wifi-p2p |
| Encryption | libsodium (tweetnacl) |
| QR codes | react-native-qrcode-svg + expo-camera |
| Notifications | expo-notifications |
| Backend | Node.js + Express (relay/signaling only) |

---

## Folder structure

chatchatter/
├── src/
│   ├── app/                  # Expo Router screens
│   │   └── (tabs)/           # Bottom tab screens
│   ├── components/           # Reusable UI components
│   ├── screens/              # Full page screens
│   ├── services/
│   │   ├── crypto/           # Key generation, encryption, decryption
│   │   ├── mesh/             # Bluetooth and WiFi Direct transports
│   │   ├── sync/             # Message queue and sync manager
│   │   ├── invite/           # Link, QR, and contact invite methods
│   │   └── push/             # Notification service
│   ├── store/                # Redux slices
│   ├── db/                   # SQLite schema and queries
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Helpers and formatters
│   └── types/                # TypeScript type definitions
└── server/                   # Optional relay server
├── routes/
├── models/
└── middleware/

---

## How offline messaging works

1. User A sends a message to User B
2. The message is encrypted with User B's public key and saved to local SQLite
3. ChatChatter checks if User B is reachable via Bluetooth or WiFi Direct
4. If reachable, the message is sent directly over the mesh
5. If not reachable, the message sits in the outbox queue
6. When User B comes within range, the queue flushes automatically
7. If both users are online, the optional relay server handles delivery instantly

---

## How the invite system works

1. User A generates an invite (link, QR, or contact match)
2. The invite contains User A's public key and a unique token
3. User B accepts the invite, which exchanges public keys between both devices
4. Both users are now in each other's contact list and can chat
5. No server is needed for this exchange if both devices are on the same local network

---

## Getting started

```bash
git clone <repo-url>
cd chatchatter
npm install
npx expo start
```

Scan the QR code with Expo Go (or a development build) to run on your device.

---

## Roadmap

- [x] Project scaffold and folder structure
- [ ] UI: onboarding and profile setup
- [ ] UI: contacts and chat screens
- [ ] Invite system: link and QR code
- [ ] Invite system: contact sync
- [ ] Local SQLite database setup
- [ ] End-to-end encryption
- [ ] Bluetooth transport
- [ ] WiFi Direct transport
- [ ] Mesh message routing
- [ ] Offline message queue
- [ ] Optional relay server
- [ ] Push notifications
- [ ] Android APK build

---

## License
MIT