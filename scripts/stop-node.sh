#!/usr/bin/env bash
#
# Stop the ParaliBazaar dev server and release the memory it holds.
#
# `next dev` keeps a Node process resident long after you stop caring about it:
# the server, the file watcher and a background compiler together are commonly
# 1-2 GB. On a laptop that is enough to start swapping, and swapping is what
# makes the machine feel like it is crashing.
#
# This only ever kills Node processes whose command line references THIS
# project directory. Other Node work you have running is left alone.
#
# Usage:
#   npm run stop              stop this project's node processes
#   bash scripts/stop-node.sh --all    stop every node process (ask first)
#   bash scripts/stop-node.sh --dry-run  list what would be stopped

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
KILL_ALL=0

for arg in "$@"; do
  case "$arg" in
    --all) KILL_ALL=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown option: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

# Windows needs PowerShell to read another process's command line; there is no
# POSIX equivalent that works in Git Bash. Everything else falls through to a
# plain pkill so the script still runs on macOS and Linux.
if [[ "${OSTYPE:-}" == msys* || "${OS:-}" == "Windows_NT" ]]; then
  ps_cmd="powershell -NoProfile -Command"
fi

list_windows() {
  # $1 = extra PowerShell filter expression
  powershell -NoProfile -Command "
    Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" |
      Where-Object { $1 } |
      ForEach-Object { \"\$(\$_.ProcessId)|\$(\$_.CommandLine)\" }
  " 2>/dev/null
}

list_posix() {
  pgrep -fl node 2>/dev/null | awk -F: '{print $1 "|" substr($0, index($0,$2))}'
}

if [[ "$KILL_ALL" -eq 1 ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would stop EVERY node.exe process:"
    [[ -n "${ps_cmd:-}" ]] && list_windows '$true' | cut -c1-160
    [[ -z "${ps_cmd:-}" ]] && list_posix | cut -c1-160
    exit 0
  fi
  if [[ -n "${ps_cmd:-}" ]]; then
    # Confirm before a machine-wide kill; there is no undo for this one.
    read -r -p "Stop ALL node.exe processes? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || { echo "aborted"; exit 1; }
    powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue" 2>/dev/null
  else
    pkill -f node 2>/dev/null
  fi
  echo "Stopped all node processes."
  exit 0
fi

echo "Looking for node processes belonging to: $PROJECT_DIR"

if [[ -n "${ps_cmd:-}" ]]; then
  # A Windows command line spells the path with backslashes (`C:\Users\...`)
  # while Git Bash hands us a POSIX one (`/c/Users/...`). Matching either
  # spelling verbatim silently finds nothing, so normalise both sides and also
  # fall back to the bare directory name, which is what actually identifies the
  # project and survives a drive-letter or separator difference.
  WIN_DIR="$(cygpath -w "$PROJECT_DIR" 2>/dev/null || echo "$PROJECT_DIR")"
  BASE_NAME="$(basename "$PROJECT_DIR")"
  NEEDLES=("$WIN_DIR" "$PROJECT_DIR" "$BASE_NAME")
  FILTER='$false'
  for needle in "${NEEDLES[@]}"; do
    esc="${needle//\'/\'\'}"
    FILTER="$FILTER -or (\$_.CommandLine -like '*${esc}*')"
  done
  rows="$(list_windows "$FILTER")"
else
  rows="$(list_posix | grep -F "$PROJECT_DIR" || true)"
fi

if [[ -z "$rows" ]]; then
  echo "Nothing running for this project — already clear."
  exit 0
fi

count=0
while IFS='|' read -r pid cmd; do
  [[ -z "$pid" ]] && continue
  count=$((count + 1))
  printf '  %s  %s\n' "$pid" "$(echo "$cmd" | cut -c1-110)"
done <<< "$rows"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo
  echo "($count process(es) would be stopped; re-run without --dry-run)"
  exit 0
fi

if [[ -n "${ps_cmd:-}" ]]; then
  while IFS='|' read -r pid _cmd; do
    [[ -z "$pid" ]] && continue
    powershell -NoProfile -Command "Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue" 2>/dev/null
  done <<< "$rows"
else
  while IFS='|' read -r pid _cmd; do
    [[ -z "$pid" ]] && continue
    kill -TERM "$pid" 2>/dev/null
  done <<< "$rows"
  sleep 2
  while IFS='|' read -r pid _cmd; do
    [[ -z "$pid" ]] && continue
    kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
  done <<< "$rows"
fi

echo
echo "Stopped $count process(es). Memory should drop within a few seconds."

# Free the page cache Windows is holding for the killed processes. This is the
# part that actually returns the RAM; killing alone often leaves it mapped.
if [[ -n "${ps_cmd:-}" ]]; then
  powershell -NoProfile -Command "
    \$sig = '[DllImport(\"psapi.dll\")] public static extern uint EmptyWorkingSet(IntPtr hProcess);'
    \$t = Add-Type -MemberDefinition \$sig -Name 'Mem' -Namespace 'W' -PassThru
    Get-Process node -ErrorAction SilentlyContinue |
      ForEach-Object { \$t::EmptyWorkingSet(\$_.Handle) } | Out-Null
  " >/dev/null 2>&1 && echo "Trimmed node working sets."
fi
