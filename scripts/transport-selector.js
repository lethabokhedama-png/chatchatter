#!/usr/bin/env node
// chatchatter/scripts/transport-selector.js
//
// Interactive CLI that detects which communication transports are available
// on this machine and guides the user to start chatting using the best one.
// Run with: pnpm run transport:select
//
// Transport priority order (best → fallback):
//   1. Internet (Socket.IO over WebSocket)
//   2. LAN      (Socket.IO over local network)
//   3. Hotspot  (same as LAN but device is the access point)
//   4. Wi-Fi Direct (device-to-device, no router)
//   5. Bluetooth    (short range, no network at all)
//   6. Offline Queue (store locally, send when transport available)

import { createInterface } from 'node:readline'
import { execSync, exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as os from 'node:os'
import * as net from 'node:net'
import * as dns from 'node:dns/promises'

const execAsync = promisify(exec)

// ── Terminal colors ───────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
  bgYellow: '\x1b[43m',
}

const ok = (msg) => `${c.green}✓${c.reset} ${msg}`
const warn = (msg) => `${c.yellow}⚠${c.reset}  ${msg}`
const fail = (msg) => `${c.red}✗${c.reset} ${msg}`
const info = (msg) => `${c.cyan}ℹ${c.reset}  ${msg}`
const bold = (msg) => `${c.bold}${msg}${c.reset}`
const dim = (msg) => `${c.dim}${msg}${c.reset}`

// ── Readline interface ────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (question) => new Promise((resolve) => rl.question(question, resolve))

// ── Detection helpers ─────────────────────────────────────────────────────────

async function checkInternet() {
  try {
    await dns.resolve('google.com')
    // Also try connecting to a known IP to avoid DNS cache returning stale results
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: '8.8.8.8', port: 53, timeout: 2000 })
      socket.on('connect', () => { socket.destroy(); resolve(true) })
      socket.on('error', reject)
      socket.on('timeout', reject)
    })
    return true
  } catch {
    return false
  }
}

async function getLanInterfaces() {
  const interfaces = os.networkInterfaces()
  const lanAddresses = []

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (
        addr.family === 'IPv4' &&
        !addr.internal &&
        (addr.address.startsWith('192.168.') ||
          addr.address.startsWith('10.') ||
          addr.address.startsWith('172.'))
      ) {
        lanAddresses.push({ name, address: addr.address, netmask: addr.netmask })
      }
    }
  }
  return lanAddresses
}

async function checkWifiDirect() {
  // Wi-Fi Direct on Linux creates a p2p- prefixed interface
  // On Android (Termux) this may show as p2p0 or wlan1
  const interfaces = os.networkInterfaces()
  const p2pIfaces = Object.keys(interfaces).filter(
    (name) => name.startsWith('p2p') || name.includes('direct')
  )
  return p2pIfaces.length > 0 ? p2pIfaces : null
}

async function checkBluetooth() {
  try {
    // Try hciconfig (Linux/Termux with bluetooth package)
    const { stdout } = await execAsync('hciconfig 2>/dev/null || bluetoothctl show 2>/dev/null')
    if (stdout.includes('UP RUNNING') || stdout.includes('Powered: yes')) {
      return { available: true, powered: true }
    }
    if (stdout.includes('DOWN') || stdout.includes('Powered: no')) {
      return { available: true, powered: false }
    }
    return { available: false, powered: false }
  } catch {
    return { available: false, powered: false }
  }
}

async function checkHotspot() {
  // Hotspot = device is acting as an AP — look for ap0, wlan0 in AP mode, or tethering interfaces
  const interfaces = os.networkInterfaces()
  const hotspotIfaces = Object.keys(interfaces).filter(
    (name) => name.startsWith('ap') || name.includes('hotspot') || name.includes('tether')
  )
  // Also check if any wlan interface has an address in 192.168.43.x (Android hotspot default)
  const allAddrs = Object.values(interfaces).flat().filter(Boolean)
  const androidHotspot = allAddrs.some((a) => a?.address?.startsWith('192.168.43.'))
  return hotspotIfaces.length > 0 || androidHotspot
}

// ── Transport result object ───────────────────────────────────────────────────

async function detectAllTransports() {
  process.stdout.write(`\n${c.cyan}${c.bold}Scanning available transports...${c.reset}\n\n`)

  const [internet, lanIfaces, wifiDirect, bluetooth, hotspot] = await Promise.all([
    checkInternet(),
    getLanInterfaces(),
    checkWifiDirect(),
    checkBluetooth(),
    checkHotspot(),
  ])

  return {
    internet: { available: internet },
    lan: { available: lanIfaces.length > 0, interfaces: lanIfaces },
    hotspot: { available: hotspot },
    wifiDirect: { available: !!wifiDirect, interfaces: wifiDirect },
    bluetooth: bluetooth,
    offlineQueue: { available: true }, // always available — it's local storage
  }
}

// ── Print detection results ───────────────────────────────────────────────────

function printTransportStatus(transports) {
  const rows = [
    {
      id: 'internet',
      label: 'Internet (WebSocket / Socket.IO)',
      status: transports.internet.available,
      detail: transports.internet.available
        ? 'Full-speed real-time messaging globally'
        : 'No internet connection detected',
    },
    {
      id: 'lan',
      label: 'LAN (Local Area Network)',
      status: transports.lan.available,
      detail: transports.lan.available
        ? transports.lan.interfaces.map((i) => `${i.name}: ${i.address}`).join(', ')
        : 'No LAN interface found — not connected to a router',
    },
    {
      id: 'hotspot',
      label: 'Hotspot (this device is the AP)',
      status: transports.hotspot.available,
      detail: transports.hotspot.available
        ? 'This device is broadcasting a hotspot — others can connect to it'
        : 'No hotspot interface detected',
    },
    {
      id: 'wifiDirect',
      label: 'Wi-Fi Direct (P2P, no router needed)',
      status: transports.wifiDirect.available,
      detail: transports.wifiDirect.available
        ? `P2P interface: ${transports.wifiDirect.interfaces?.join(', ')}`
        : 'No Wi-Fi Direct interface found',
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth',
      status: transports.bluetooth.available && transports.bluetooth.powered,
      detail: !transports.bluetooth.available
        ? 'Bluetooth hardware not found or bluetoothctl not installed'
        : !transports.bluetooth.powered
          ? 'Bluetooth found but powered OFF — run: bluetoothctl power on'
          : 'Bluetooth is ON and ready',
    },
    {
      id: 'offlineQueue',
      label: 'Offline Queue (store & forward)',
      status: true, // always available
      detail: 'Messages saved locally and delivered when any transport becomes available',
    },
  ]

  console.log(`${c.bold}Transport Detection Results:${c.reset}`)
  console.log('─'.repeat(70))

  for (const row of rows) {
    const icon = row.status ? ok('') : fail('')
    const label = row.status
      ? `${c.bold}${row.label}${c.reset}`
      : `${c.dim}${row.label}${c.reset}`
    console.log(`  ${icon} ${label}`)
    console.log(`       ${dim(row.detail)}`)
    console.log()
  }

  console.log('─'.repeat(70))
}

// ── Instructions per transport ────────────────────────────────────────────────

function printInstructions(transportId, transports) {
  console.log()
  console.log(`${c.bold}${c.cyan}Setup Instructions — ${transportId.toUpperCase()}${c.reset}`)
  console.log('─'.repeat(70))

  switch (transportId) {
    case 'internet':
      console.log(ok('You have internet. No extra setup needed.'))
      console.log()
      console.log(info('Both you and the other person need:'))
      console.log('   1. The ChatChatter app installed')
      console.log('   2. Internet access (mobile data or Wi-Fi)')
      console.log('   3. Each other\'s username or invite link')
      console.log()
      console.log(info('To start the server:'))
      console.log(`   ${c.cyan}pnpm run start:dev:server${c.reset}`)
      console.log()
      console.log(info('To start the client:'))
      console.log(`   ${c.cyan}pnpm run start:dev:client${c.reset}`)
      break

    case 'lan':
      console.log(ok('You are on a LAN. Both devices must be on the same Wi-Fi or ethernet.'))
      console.log()
      if (transports.lan.interfaces.length > 0) {
        const iface = transports.lan.interfaces[0]
        console.log(info(`Your LAN IP: ${c.bold}${iface?.address}${c.reset}`))
        console.log()
        console.log(info('The other person must connect to this IP in their app settings.'))
        console.log(info('Make sure your firewall allows port 3000.'))
      }
      console.log()
      console.log(info('To start ChatChatter on LAN:'))
      console.log(`   ${c.cyan}pnpm run start:dev:server${c.reset}`)
      console.log()
      console.log(info('Other person opens the app and connects to:'))
      console.log(`   ${c.bold}http://${transports.lan.interfaces[0]?.address ?? '<YOUR_IP>'}:3000${c.reset}`)
      break

    case 'hotspot':
      console.log(ok('This device is a hotspot. Other devices connect to YOUR Wi-Fi.'))
      console.log()
      console.log(info('Steps:'))
      console.log('   1. Make sure your hotspot is enabled (Settings → Hotspot)')
      console.log('   2. The other person connects their device to YOUR hotspot network')
      console.log('   3. Start the server on this device:')
      console.log(`      ${c.cyan}pnpm run start:dev:server${c.reset}`)
      console.log('   4. The other person opens ChatChatter — it will auto-discover this device')
      console.log()
      console.log(warn('Typical hotspot IP on Android: 192.168.43.1'))
      break

    case 'wifiDirect':
      console.log(warn('Wi-Fi Direct requires no router — devices connect directly.'))
      console.log()
      console.log(info('Steps:'))
      console.log('   1. On both devices, enable Wi-Fi Direct:')
      console.log('      Android → Settings → Wi-Fi → Wi-Fi Direct')
      console.log('   2. One device scans and the other accepts the connection request')
      console.log('   3. Once connected, start the server on the initiating device:')
      console.log(`      ${c.cyan}pnpm run start:dev:server${c.reset}`)
      console.log('   4. Open ChatChatter on the other device — it will discover via mDNS')
      console.log()
      console.log(warn('Range: ~50–100 metres. Speeds close to regular Wi-Fi.'))
      break

    case 'bluetooth':
      if (!transports.bluetooth.available) {
        console.log(fail('Bluetooth hardware not found on this device.'))
        console.log()
        console.log(info('On Termux/Android, install the bluetooth package:'))
        console.log(`   ${c.cyan}pkg install bluetooth${c.reset}`)
        console.log()
        console.log(info('Or use a different transport from the list above.'))
        break
      }
      if (!transports.bluetooth.powered) {
        console.log(warn('Bluetooth is available but currently OFF.'))
        console.log()
        console.log(info('Turn it on:'))
        console.log(`   ${c.cyan}bluetoothctl power on${c.reset}`)
        console.log(`   ${c.cyan}bluetoothctl discoverable on${c.reset}`)
        console.log()
      } else {
        console.log(ok('Bluetooth is ON and powered.'))
      }
      console.log()
      console.log(info('Steps to chat over Bluetooth:'))
      console.log('   1. Both devices enable Bluetooth and make themselves discoverable:')
      console.log(`      ${c.cyan}bluetoothctl discoverable on${c.reset}`)
      console.log('   2. Pair the two devices once (you only do this the first time):')
      console.log(`      ${c.cyan}bluetoothctl scan on${c.reset}  ← find the other device's MAC`)
      console.log(`      ${c.cyan}bluetoothctl pair <MAC_ADDRESS>${c.reset}`)
      console.log(`      ${c.cyan}bluetoothctl trust <MAC_ADDRESS>${c.reset}`)
      console.log('   3. Open ChatChatter — it will detect the paired device automatically')
      console.log()
      console.log(warn('Range: ~10–30 metres. Bluetooth is the slowest transport.'))
      console.log(warn('Use for text messages. Images/files are better over LAN or Wi-Fi Direct.'))
      break

    case 'offlineQueue':
      console.log(ok('Offline Queue is always available — no setup needed.'))
      console.log()
      console.log(info('How it works:'))
      console.log('   Messages you send are saved locally when no transport is available.')
      console.log('   The moment any transport comes online (internet, LAN, Bluetooth),')
      console.log('   all queued messages are delivered automatically in order.')
      console.log()
      console.log(info('Your queue is stored at:'))
      console.log(`   ${c.dim}./server/data/offline-queue.db${c.reset}`)
      console.log()
      console.log(warn('Queue persists across restarts. Messages are never lost.'))
      break

    default:
      console.log(fail(`Unknown transport: ${transportId}`))
  }

  console.log('─'.repeat(70))
  console.log()
}

// ── Main interactive flow ─────────────────────────────────────────────────────

async function main() {
  console.clear()
  console.log()
  console.log(`${c.bgBlue}${c.bold}${c.white}  ChatChatter — Transport Selector  ${c.reset}`)
  console.log(`${c.dim}  Detects your available communication methods and guides setup${c.reset}`)
  console.log()

  const transports = await detectAllTransports()
  printTransportStatus(transports)

  // Build list of available transports for the menu
  const available = [
    transports.internet.available && { id: 'internet', label: 'Internet (recommended — global, fastest)' },
    transports.lan.available && { id: 'lan', label: 'LAN (same Wi-Fi or ethernet network)' },
    transports.hotspot.available && { id: 'hotspot', label: 'Hotspot (you are the access point)' },
    transports.wifiDirect.available && { id: 'wifiDirect', label: 'Wi-Fi Direct (no router, device-to-device)' },
    { id: 'bluetooth', label: 'Bluetooth (short range, no network)' },
    { id: 'offlineQueue', label: 'Offline Queue (store locally, send later)' },
  ].filter(Boolean)

  const unavailable = [
    !transports.internet.available && 'internet',
    !transports.lan.available && 'lan',
    !transports.hotspot.available && 'hotspot',
    !transports.wifiDirect.available && 'wifiDirect',
    !transports.bluetooth.available && 'bluetooth',
  ].filter(Boolean)

  console.log(`${c.bold}Which transport do you want to use for chatting?${c.reset}`)
  console.log(dim('(You can switch transports at any time inside the app)\n'))

  available.forEach((t, i) => {
    const num = `${c.cyan}[${i + 1}]${c.reset}`
    console.log(`  ${num} ${t.label}`)
  })

  if (unavailable.length > 0) {
    console.log()
    console.log(dim(`Not currently available: ${unavailable.join(', ')}`))
    console.log(dim('Select one anyway to get setup instructions.'))
    console.log()

    const allOptions = [
      { id: 'internet', label: 'Internet — get setup instructions' },
      { id: 'lan', label: 'LAN — get setup instructions' },
      { id: 'hotspot', label: 'Hotspot — get setup instructions' },
      { id: 'wifiDirect', label: 'Wi-Fi Direct — get setup instructions' },
      { id: 'bluetooth', label: 'Bluetooth — get setup instructions' },
      { id: 'offlineQueue', label: 'Offline Queue — get setup instructions' },
    ]

    const alreadyShown = available.map((a) => a.id)
    const extra = allOptions.filter((o) => !alreadyShown.includes(o.id))
    extra.forEach((t, i) => {
      const num = `${c.dim}[${available.length + i + 1}]${c.reset}`
      console.log(`  ${num} ${c.dim}${t.label}${c.reset}`)
    })

    // Merge for indexing
    available.push(...extra)
  }

  console.log()
  const answer = await ask(`${c.bold}Enter number (1–${available.length}): ${c.reset}`)
  const index = parseInt(answer.trim(), 10) - 1

  if (isNaN(index) || index < 0 || index >= available.length) {
    console.log()
    console.log(fail('Invalid selection. Run the script again and choose a number from the list.'))
    rl.close()
    process.exit(1)
  }

  const selected = available[index]
  printInstructions(selected.id, transports)

  // Offer to auto-start if internet or LAN was selected and is available
  if (
    (selected.id === 'internet' && transports.internet.available) ||
    (selected.id === 'lan' && transports.lan.available)
  ) {
    const startNow = await ask(`${c.bold}Start the development server now? (y/n): ${c.reset}`)
    if (startNow.trim().toLowerCase() === 'y') {
      console.log()
      console.log(info('Starting server...'))
      rl.close()
      // Hand off to the server start script
      const { spawn } = await import('node:child_process')
      const child = spawn('pnpm', ['run', 'start:dev'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd(),
      })
      child.on('exit', (code) => process.exit(code ?? 0))
      return
    }
  }

  console.log(info('When you\'re ready, run:'))
  console.log(`   ${c.cyan}pnpm run start:dev${c.reset}   ← starts client + server together`)
  console.log(`   ${c.cyan}pnpm run start:dev:server${c.reset}   ← server only`)
  console.log(`   ${c.cyan}pnpm run start:dev:client${c.reset}   ← client only`)
  console.log()

  rl.close()
}

main().catch((err) => {
  console.error(fail(`Transport selector crashed: ${err.message}`))
  process.exit(1)
})