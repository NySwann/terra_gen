
import { Renderer } from "../game/Renderer";
import { createStore } from "./store";

export const rendererStore = createStore<Renderer>(new Renderer());