import { createStore } from "./store";

export type Panel = "edit";
export const panelStore = createStore<Panel>("edit");