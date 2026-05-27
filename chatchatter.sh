#!/bin/bash

CC_ROOT="/data/data/com.termux/files/home/chatchatter"
CC_REPO="https://github.com/lethabokhedama-png/chatchatter.git"
CC_VERSION="1.0.0"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
RESET='\033[0m'

_banner() {
  echo -e "${PURPLE}"
  echo "  ██████╗██╗  ██╗ █████╗ ████████╗ ██████╗██╗  ██╗ █████╗ ████████╗████████╗███████╗██████╗ "
  echo " ██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║██╔══██╗╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗"
  echo " ██║     ███████║███████║   ██║   ██║     ███████║███████║   ██║      ██║   █████╗  ██████╔╝"
  echo " ██║     ██╔══██║██╔══██║   ██║   ██║     ██╔══██║██╔══██║   ██║      ██║   ██╔══╝  ██╔══██╗"
  echo " ╚██████╗██║  ██║██║  ██║   ██║   ╚██████╗██║  ██║██║  ██║   ██║      ██║   ███████╗██║  ██║"
  echo "  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝"
  echo -e "${CYAN}  v${CC_VERSION} — GODMODE CLI${RESET}"
  echo ""
}

_ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
_err()  { echo -e "${RED}✘ $1${RESET}"; }
_info() { echo -e "${CYAN}→ $1${RESET}"; }
_warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
_head() { echo -e "\n${WHITE}━━━ $1 ━━━${RESET}"; }

_cd() {
  cd "$CC_ROOT" || { _err "Cannot find project at $CC_ROOT"; exit 1; }
}

_help() {
  _banner
  echo -e "${WHITE}USAGE:${RESET}  cc <command> [options]"
  echo ""
  _head "DEV"
  echo -e "  ${GREEN}start${RESET}              Start Expo dev server"
  echo -e "  ${GREEN}web${RESET}                Start on web"
  echo -e "  ${GREEN}android${RESET}            Start on Android"
  echo -e "  ${GREEN}tunnel${RESET}             Start with tunnel (use on mobile data)"
  echo -e "  ${GREEN}stop${RESET}               Kill all Expo/Metro processes"
  echo -e "  ${GREEN}restart${RESET}            Stop then start"
  echo -e "  ${GREEN}clear${RESET}              Clear Metro cache and restart"
  echo ""
  _head "BUILD"
  echo -e "  ${GREEN}build:apk${RESET}          Build Android APK via EAS"
  echo -e "  ${GREEN}build:preview${RESET}      Build preview APK"
  echo -e "  ${GREEN}build:local${RESET}        Build APK locally"
  echo -e "  ${GREEN}prebuild${RESET}           Run expo prebuild (eject)"
  echo ""
  _head "PACKAGES"
  echo -e "  ${GREEN}install${RESET}            npm install"
  echo -e "  ${GREEN}add <pkg>${RESET}          Add a package (expo-safe)"
  echo -e "  ${GREEN}remove <pkg>${RESET}       Remove a package"
  echo -e "  ${GREEN}upgrade${RESET}            Upgrade all Expo packages to SDK compat"
  echo -e "  ${GREEN}audit${RESET}              npm audit fix"
  echo -e "  ${GREEN}deps${RESET}               List all dependencies"
  echo ""
  _head "GIT"
  echo -e "  ${GREEN}git:status${RESET}         git status"
  echo -e "  ${GREEN}git:push${RESET}           Add all, commit with message, push"
  echo -e "  ${GREEN}git:pull${RESET}           git pull"
  echo -e "  ${GREEN}git:log${RESET}            Pretty git log"
  echo -e "  ${GREEN}git:diff${RESET}           git diff"
  echo -e "  ${GREEN}git:branch${RESET}         List branches"
  echo -e "  ${GREEN}git:new <name>${RESET}     Create and switch to new branch"
  echo -e "  ${GREEN}git:switch <name>${RESET}  Switch branch"
  echo -e "  ${GREEN}git:merge <name>${RESET}   Merge branch into current"
  echo -e "  ${GREEN}git:tag <name>${RESET}     Create annotated tag and push"
  echo -e "  ${GREEN}git:tags${RESET}           List all tags"
  echo -e "  ${GREEN}git:undo${RESET}           Undo last commit (keep changes)"
  echo -e "  ${GREEN}git:reset${RESET}          Hard reset to last commit"
  echo -e "  ${GREEN}git:stash${RESET}          Stash changes"
  echo -e "  ${GREEN}git:pop${RESET}            Pop stash"
  echo ""
  _head "FILES"
  echo -e "  ${GREEN}new:screen <name>${RESET}  Create a new screen file"
  echo -e "  ${GREEN}new:component <n>${RESET}  Create a new component file"
  echo -e "  ${GREEN}new:service <n>${RESET}    Create a new service file"
  echo -e "  ${GREEN}new:hook <name>${RESET}    Create a new hook file"
  echo -e "  ${GREEN}new:slice <name>${RESET}   Create a new Redux slice"
  echo -e "  ${GREEN}tree${RESET}               Show project file tree"
  echo -e "  ${GREEN}open <file>${RESET}        Open file in nano"
  echo ""
  _head "DEBUG"
  echo -e "  ${GREEN}logs${RESET}               Stream Metro logs"
  echo -e "  ${GREEN}logs:errors${RESET}        Stream only errors"
  echo -e "  ${GREEN}debug${RESET}              Open React Native debugger"
  echo -e "  ${GREEN}doctor${RESET}             Run expo doctor"
  echo -e "  ${GREEN}check${RESET}              Check Node, npm, Expo versions"
  echo -e "  ${GREEN}ports${RESET}              Show what's running on dev ports"
  echo -e "  ${GREEN}kill:port <p>${RESET}      Kill process on port"
  echo ""
  _head "DATABASE"
  echo -e "  ${GREEN}db:reset${RESET}           Delete local SQLite db files"
  echo -e "  ${GREEN}db:list${RESET}            List db files"
  echo ""
  _head "PROJECT"
  echo -e "  ${GREEN}info${RESET}               Show project info"
  echo -e "  ${GREEN}clean${RESET}              Remove node_modules and reinstall"
  echo -e "  ${GREEN}backup${RESET}             Zip project (excluding node_modules)"
  echo -e "  ${GREEN}env:show${RESET}           Print .env contents"
  echo -e "  ${GREEN}env:set K V${RESET}        Set a key in .env"
  echo -e "  ${GREEN}version${RESET}            Show CLI version"
  echo -e "  ${GREEN}update-cli${RESET}         Pull latest chatchatter.sh from repo"
  echo ""
}

case "$1" in

  start)
    _cd; _info "Starting Expo..."; npx expo start ;;

  web)
    _cd; _info "Starting web..."; npx expo start --web ;;

  android)
    _cd; _info "Starting Android..."; npx expo start --android ;;

  tunnel)
    _cd; _info "Starting with tunnel..."; npx expo start --tunnel ;;

  stop)
    _info "Killing Expo and Metro..."
    pkill -f "expo start" 2>/dev/null
    pkill -f "metro" 2>/dev/null
    _ok "Stopped." ;;

  restart)
    $0 stop; sleep 1; $0 start ;;

  clear)
    _cd
    _info "Clearing Metro cache..."
    npx expo start --clear ;;

  build:apk)
    _cd; _info "Building APK via EAS..."
    npx eas build --platform android --profile production ;;

  build:preview)
    _cd; _info "Building preview APK..."
    npx eas build --platform android --profile preview ;;

  build:local)
    _cd; _info "Building locally..."
    npx expo run:android ;;

  prebuild)
    _cd; _info "Running prebuild..."
    npx expo prebuild ;;

  install)
    _cd; _info "Installing packages..."; npm install ;;

  add)
    shift; _cd
    if [ -z "$1" ]; then _err "Usage: cc add <package>"; exit 1; fi
    _info "Adding $*..."
    npx expo install "$@" ;;

  remove)
    shift; _cd
    if [ -z "$1" ]; then _err "Usage: cc remove <package>"; exit 1; fi
    _info "Removing $*..."
    npm uninstall "$@" ;;

  upgrade)
    _cd; _info "Upgrading Expo packages..."
    npx expo install --fix ;;

  audit)
    _cd; npm audit fix ;;

  deps)
    _cd; cat package.json | grep -A 999 '"dependencies"' | grep -B 999 '"devDependencies"' ;;

  git:status)
    _cd; git status ;;

  git:push)
    _cd
    shift
    MSG="${*:-"chore: update $(date '+%Y-%m-%d %H:%M')"}"
    _info "Committing: $MSG"
    git add -A
    git commit -m "$MSG"
    git push origin HEAD
    _ok "Pushed." ;;

  git:pull)
    _cd; git pull ;;

  git:log)
    _cd; git log --oneline --graph --decorate --color | head -40 ;;

  git:diff)
    _cd; git diff ;;

  git:branch)
    _cd; git branch -a ;;

  git:new)
    _cd
    if [ -z "$2" ]; then _err "Usage: cc git:new <branch-name>"; exit 1; fi
    git checkout -b "$2"
    _ok "Created and switched to $2" ;;

  git:switch)
    _cd
    if [ -z "$2" ]; then _err "Usage: cc git:switch <branch-name>"; exit 1; fi
    git checkout "$2" ;;

  git:merge)
    _cd
    if [ -z "$2" ]; then _err "Usage: cc git:merge <branch-name>"; exit 1; fi
    git merge "$2" ;;

  git:tag)
    _cd
    if [ -z "$2" ]; then _err "Usage: cc git:tag <tagname>"; exit 1; fi
    TAG="$2"
    MSG="${3:-"Release $TAG"}"
    git tag -a "$TAG" -m "$MSG"
    git push origin "$TAG"
    _ok "Tagged and pushed: $TAG" ;;

  git:tags)
    _cd; git tag -l --sort=-version:refname | head -20 ;;

  git:undo)
    _cd; git reset --soft HEAD~1; _ok "Undid last commit. Changes kept." ;;

  git:reset)
    _cd
    _warn "This will discard ALL uncommitted changes. Sure? (y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ]; then
      git reset --hard HEAD
      _ok "Hard reset done."
    else
      _info "Cancelled."
    fi ;;

  git:stash)
    _cd; git stash; _ok "Stashed." ;;

  git:pop)
    _cd; git stash pop; _ok "Popped stash." ;;

  new:screen)
    if [ -z "$2" ]; then _err "Usage: cc new:screen <ScreenName>"; exit 1; fi
    FILE="$CC_ROOT/src/screens/${2}.tsx"
    cat > "$FILE" << EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${2}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${2}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  text: { color: '#fff', fontSize: 18 },
});
EOF
    _ok "Created screen: $FILE" ;;

  new:component)
    if [ -z "$2" ]; then _err "Usage: cc new:component <ComponentName>"; exit 1; fi
    FILE="$CC_ROOT/src/components/${2}.tsx"
    cat > "$FILE" << EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {}

export default function ${2}({}: Props) {
  return (
    <View style={styles.container}>
      <Text>${2}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
EOF
    _ok "Created component: $FILE" ;;

  new:service)
    if [ -z "$2" ]; then _err "Usage: cc new:service <serviceName>"; exit 1; fi
    FILE="$CC_ROOT/src/services/${2}.ts"
    cat > "$FILE" << EOF
export const ${2} = {
  init: async () => {
    console.log('${2} initialized');
  },
};
EOF
    _ok "Created service: $FILE" ;;

  new:hook)
    if [ -z "$2" ]; then _err "Usage: cc new:hook <hookName>"; exit 1; fi
    NAME="$2"
    FILE="$CC_ROOT/src/hooks/${NAME}.ts"
    cat > "$FILE" << EOF
import { useState, useEffect } from 'react';

export function ${NAME}() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // init
  }, []);

  return { state };
}
EOF
    _ok "Created hook: $FILE" ;;

  new:slice)
    if [ -z "$2" ]; then _err "Usage: cc new:slice <sliceName>"; exit 1; fi
    NAME="$2"
    FILE="$CC_ROOT/src/store/${NAME}Slice.ts"
    cat > "$FILE" << EOF
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ${NAME^}State {
  items: any[];
}

const initialState: ${NAME^}State = {
  items: [],
};

const ${NAME}Slice = createSlice({
  name: '${NAME}',
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<any[]>) {
      state.items = action.payload;
    },
    addItem(state, action: PayloadAction<any>) {
      state.items.push(action.payload);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
  },
});

export const { setItems, addItem, removeItem } = ${NAME}Slice.actions;
export default ${NAME}Slice.reducer;
EOF
    _ok "Created slice: $FILE" ;;

  tree)
    _cd
    if command -v tree &>/dev/null; then
      tree -I 'node_modules|.git|assets' --dirsfirst
    else
      find . -not -path '*/node_modules/*' -not -path '*/.git/*' | sort | sed 's|[^/]*/|  |g'
    fi ;;

  open)
    if [ -z "$2" ]; then _err "Usage: cc open <file>"; exit 1; fi
    nano "$CC_ROOT/$2" ;;

  logs)
    _cd; npx expo start 2>&1 | tee /tmp/cc-logs.txt ;;

  logs:errors)
    _cd; npx expo start 2>&1 | grep -i "error\|warn\|failed" ;;

  debug)
    _info "Opening debugger at http://localhost:8081/debugger-ui"
    termux-open-url "http://localhost:8081/debugger-ui" 2>/dev/null || _warn "Open http://localhost:8081/debugger-ui in your browser" ;;

  doctor)
    _cd; npx expo doctor ;;

  check)
    _head "Environment"
    echo -e "Node:  $(node --version)"
    echo -e "npm:   $(npm --version)"
    echo -e "Expo:  $(npx expo --version)"
    echo -e "Git:   $(git --version)"
    echo -e "OS:    $(uname -a)" ;;

  ports)
    _head "Active ports"
    ss -tlnp | grep -E "8081|19000|19001|3000|5000" 2>/dev/null || netstat -tlnp 2>/dev/null | grep -E "8081|19000|19001|3000|5000" ;;

  kill:port)
    if [ -z "$2" ]; then _err "Usage: cc kill:port <port>"; exit 1; fi
    PID=$(lsof -ti:"$2" 2>/dev/null)
    if [ -n "$PID" ]; then
      kill -9 "$PID"
      _ok "Killed process on port $2"
    else
      _warn "Nothing running on port $2"
    fi ;;

  db:reset)
    _warn "Delete all local SQLite files? (y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ]; then
      find "$CC_ROOT" -name "*.db" -not -path "*/node_modules/*" -delete
      _ok "Database files deleted."
    fi ;;

  db:list)
    find "$CC_ROOT" -name "*.db" -not -path "*/node_modules/*" ;;

  info)
    _cd
    _head "ChatChatter Project Info"
    echo -e "Root:    $CC_ROOT"
    echo -e "Repo:    $CC_REPO"
    echo -e "Branch:  $(git branch --show-current)"
    echo -e "Commit:  $(git log -1 --format='%h %s')"
    echo -e "Tags:    $(git tag -l | tail -1)"
    echo -e "Expo:    $(cat app.json | grep '"version"' | head -1 | tr -d ' "version:,')"
    echo -e "Node:    $(node --version)" ;;

  clean)
    _cd
    _warn "This removes node_modules and reinstalls. Continue? (y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ]; then
      rm -rf node_modules
      npm install
      _ok "Clean install done."
    fi ;;

  backup)
    _info "Backing up project..."
    STAMP=$(date +%Y%m%d_%H%M%S)
    tar --exclude='./node_modules' --exclude='./.git' -czf "/tmp/chatchatter_backup_$STAMP.tar.gz" -C "$CC_ROOT" .
    _ok "Backup saved to /tmp/chatchatter_backup_$STAMP.tar.gz" ;;

  env:show)
    _cd; cat .env ;;

  env:set)
    if [ -z "$2" ] || [ -z "$3" ]; then _err "Usage: cc env:set KEY VALUE"; exit 1; fi
    _cd
    KEY="$2"; VAL="$3"
    if grep -q "^$KEY=" .env 2>/dev/null; then
      sed -i "s|^$KEY=.*|$KEY=$VAL|" .env
    else
      echo "$KEY=$VAL" >> .env
    fi
    _ok "Set $KEY=$VAL in .env" ;;

  version)
    echo -e "${CYAN}chatchatter CLI v${CC_VERSION}${RESET}" ;;

  update-cli)
    _info "Pulling latest chatchatter.sh..."
    curl -fsSL "https://raw.githubusercontent.com/lethabokhedama-png/chatchatter/main/chatchatter.sh" -o "$CC_ROOT/chatchatter.sh"
    chmod +x "$CC_ROOT/chatchatter.sh"
    _ok "CLI updated." ;;

  ""|help|--help|-h)
    _help ;;

  *)
    _err "Unknown command: $1"
    echo -e "Run ${CYAN}cc help${RESET} to see all commands."
    exit 1 ;;

esac
