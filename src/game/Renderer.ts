import { Game } from "./Game";

export class Renderer {
  public game: Game | null = null;

  attach(canvas: HTMLCanvasElement) {
    console.log("attached");

    this.game = new Game(canvas);
  }

  detach() {
    console.log("detached");
    
    this.game?.dispose();
  }
}
