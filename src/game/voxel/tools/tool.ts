
import type MainScene from "../../scenes/MainScene/MainScene";
import { Terrain } from "../Terrain";

export interface Tool {
    control: React.ReactNode;
    bind: (terrain: Terrain, scene: MainScene) => void;
    unbind: () => void;
}