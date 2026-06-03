// Tiny global store for header-driven dashboard filters (search + month).
import { useSyncExternalStore } from "react";
import { currentMonthISO } from "./incentive";

type State = { search: string; month: string };
let state: State = { search: "", month: currentMonthISO() };
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

export const appStore = {
  get: () => state,
  setSearch: (search: string) => { state = { ...state, search }; emit(); },
  setMonth: (month: string) => { state = { ...state, month }; emit(); },
  subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); },
};

export function useAppStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(appStore.subscribe, () => selector(state), () => selector(state));
}
