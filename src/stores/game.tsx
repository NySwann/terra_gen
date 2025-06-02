
import type { Game } from "../game/Game";
import { createStore } from "./store";

export const gameStore = createStore<Game | null>(null);