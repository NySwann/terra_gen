import MainScene from "@/game/scenes/MainScene/MainScene";
import { Terrain } from "../Terrain";

export interface Tool {
    bind: (terrain: Terrain, scene: MainScene) => void;
    unbind: () => void;
}