import { gameStore } from "../stores/game";
import { Game } from "./Game";

export class Renderer {
  public game: Game | null = null;

  attach(canvas: HTMLCanvasElement) {
    console.log("attached");

    this.game = new Game(canvas);

    gameStore.setValue(this.game);

    console.log(gameStore.getValue());
  }

  detach() {
    console.log("detached");
    
    gameStore.setValue(null);

    this.game?.dispose();
  }
}
