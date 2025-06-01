import { Game } from "./Game";

export class Renderer {
  public game: Game | null = null;

  attach(canvas: HTMLCanvasElement) {
    this.game = new Game(canvas);
  }

  detach() {
    this.game?.dispose();
  }
}
