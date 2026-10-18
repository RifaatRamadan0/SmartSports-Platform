import { useCallback, useSyncExternalStore } from 'react'
import { MODES, ACTIVE_MODE_KEY } from '../constants/mode'

// Reads/writes the dual-role active mode from localStorage and keeps every
// subscriber (e.g. the navbar) in sync. Falls back to Player mode when unset.
//
// We use useSyncExternalStore so a mode change in one place re-renders all
// consumers in the same tab (via a custom event) and across tabs (via 'storage').

function readMode() {
  const stored = localStorage.getItem(ACTIVE_MODE_KEY)
  return stored === MODES.OWNER ? MODES.OWNER : MODES.PLAYER
}

export function getActiveMode() {
  return readMode()
}

export function setActiveModeValue(mode) {
  const next = mode === MODES.OWNER ? MODES.OWNER : MODES.PLAYER
  localStorage.setItem(ACTIVE_MODE_KEY, next)
  // Notify same-tab subscribers; the native 'storage' event only fires in other tabs.
  window.dispatchEvent(new Event('ss-mode-change'))
}

function subscribe(callback) {
  window.addEventListener('ss-mode-change', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('ss-mode-change', callback)
    window.removeEventListener('storage', callback)
  }
}

export function useActiveMode() {
  const mode = useSyncExternalStore(subscribe, readMode, () => MODES.PLAYER)
  const setMode = useCallback((next) => setActiveModeValue(next), [])
  return [mode, setMode]
}
