import { useEffect, useRef} from 'react'
import './App.css'
import { mkSimplexNoise } from '../game/voxel/perlin';

interface EdgePos {x: number, y: number}
interface Block { v: number, bottomRightEdge: EdgePos | null, bottomLeftEdge: EdgePos | null, topRightEdge: EdgePos | null, topLeftEdge: EdgePos | null}

const dotSize = 2;

class Map {
  context: CanvasRenderingContext2D;

  width: number;
  height: number;
  data: Block[][];

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
    this.width = 50;
    this.height = 50;
    this.data = [];

    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.width; x++)
    {
      const row: Block[] = [];

      for (let y = 0; y < this.height; y++)
      {

        const insideCircle = Math.sqrt((x - 15.0) * (x - 15.0) + (y - 15.0) * (y - 15.0)) < 10;

        const v = noise.noise2D(x / 8, y / 8) + noise.noise2D(x / 16, y / 16) + noise.noise2D(x / 32, y / 32) + noise.noise2D(x / 64, y / 64) >= 0.5 ? 1.0 : 0.0;
         
        row.push({v: v, topLeftEdge: null, topRightEdge: null, bottomLeftEdge: null, bottomRightEdge: null}); 
      }

      this.data.push(row);
    }
  }

  draw() {
    const ctx = this.context;

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let x = 0; x < this.width; x++)
    {
      for (let y = 0; y < this.height; y++)
      {
        ctx.fillStyle = this.data[x][y].v > 0 ? "red" : "blue";
        ctx.beginPath();
        ctx.arc((x)*(ctx.canvas.width / this.width), (y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    for (let x = 0; x < this.width - 1; x++)
    {
      for (let y = 0; y < this.height - 1; y++)
      {
        const topLeft = this.data[x][y];
        const bottomLeft = this.data[x][y + 1];
        const topRight = this.data[x + 1][y];
        const bottomRight = this.data[x + 1][y + 1];

        if (topLeft.v !== bottomLeft.v || topLeft.v !== topRight.v || topLeft.v !== bottomRight.v) 
        {
          if (Math.abs((topLeft.v + bottomLeft.v + topRight.v + bottomRight.v) - 2.0) > 0.1)
          {
              // uneven

                let posx = 0.0;
                let posy = 0.0;

              if ((topLeft.v == 1.0 && bottomLeft.v == 0.0 && topRight.v == 0.0 && bottomRight.v == 0.0) || (topLeft.v == 0.0 && bottomLeft.v == 1.0 && topRight.v == 1.0 && bottomRight.v == 1.0) )
              {
                ctx.fillStyle = "green";
                posx = 0.25;
                posy = 0.25;
              }
              else if ((topLeft.v == 0.0 && bottomLeft.v == 1.0 && topRight.v == 0.0 && bottomRight.v == 0.0) || (topLeft.v == 1.0 && bottomLeft.v == 0.0 && topRight.v == 1.0 && bottomRight.v == 1.0))
              {
                ctx.fillStyle = "green";
                posx = 0.25;
                posy = 0.75;
              }
              else if ((topLeft.v == 0.0 && bottomLeft.v == 0.0 && topRight.v == 1.0 && bottomRight.v == 0.0) || (topLeft.v == 1.0 && bottomLeft.v == 1.0 && topRight.v == 0.0 && bottomRight.v == 1.0))
              {
                ctx.fillStyle = "green";
                posx = 0.75;
                posy = 0.25;
              }
              else if ((topLeft.v == 0.0 && bottomLeft.v == 0.0 && topRight.v == 0.0 && bottomRight.v == 1.0) || (topLeft.v == 1.0 && bottomLeft.v == 1.0 && topRight.v == 1.0 && bottomRight.v == 0.0))
              {
                ctx.fillStyle = "green";
                posx = 0.75;
                posy = 0.75;
              }

              const edge = {x: posx, y: posy};

              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              topLeft.bottomRightEdge = {x: edge.x, y: edge.y};
              topRight.bottomLeftEdge = {x: edge.x - 1.0, y: edge.y};
              bottomLeft.topRightEdge = {x: edge.x, y: edge.y - 1.0};
              bottomRight.topLeftEdge = {x: edge.x - 1.0, y: edge.y - 1.0};
          }
          else if (topLeft.v !== bottomLeft.v && topLeft.v !== topRight.v)
          {
            // split

            {
              {
              const edge = {x: 0.25, y: 0.25};

              // ctx.fillStyle = "green";
              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              topLeft.bottomRightEdge = {x: edge.x, y: edge.y};
              }
              {
              const edge = {x: 0.75, y: 0.25};

              // ctx.fillStyle = "green";
              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              topRight.bottomLeftEdge = {x: edge.x - 1.0, y: edge.y};
              }
                            {
              const edge = {x: 0.25, y: 0.75};

              // ctx.fillStyle = "green";
              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              bottomLeft.topRightEdge = {x: edge.x, y: edge.y - 1.0};
              }
                            {
              const edge = {x: 0.75, y: 0.75};

              // ctx.fillStyle = "green";
              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              bottomRight.topLeftEdge = {x: edge.x - 1.0, y: edge.y - 1.0};
              }
            }
          }
          else
          {
              const edge = {x: 0.5, y: 0.5};

              // ctx.fillStyle = "green";
              // ctx.beginPath();
              // ctx.arc((x +edge.x)*(ctx.canvas.width / this.width), (y + edge.y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
              // ctx.fill();

              topLeft.bottomRightEdge = {x: edge.x, y: edge.y};
              topRight.bottomLeftEdge = {x: -edge.x, y: edge.y};
              bottomLeft.topRightEdge = {x: edge.x, y: -edge.y};
              bottomRight.topLeftEdge = {x: -edge.x, y: -edge.y};
          }
        }
      }
    }

    for (let x = 1; x < this.width - 1; x++)
    {
      for (let y = 1; y < this.height - 1; y++)
      {
        const center = this.data[x][y];

        const left = this.data[x - 1][y];
        const right = this.data[x + 1][y];

        const top = this.data[x][y-1];
        const bottom = this.data[x][y+1];

        const topLeftEdge = center.topLeftEdge;
        const bottomLeftEdge = center.bottomLeftEdge;

        const topRightEdge = center.topRightEdge;
        const bottomRightEdge = center.bottomRightEdge;
        
        // const bottomLeft = edgeData[x][y - 1];
        // const bottomRight = edgeData[x][y];

        if (center.v > 0)
        {
          if (topLeftEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (bottomLeftEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (topLeftEdge && bottomLeftEdge && left.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }
          if (topRightEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (bottomRightEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }

          if (topRightEdge && bottomRightEdge && right.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }

          if (topRightEdge && topLeftEdge && top.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }

          if (bottomLeftEdge && bottomRightEdge && bottom.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }
        }
      }
    }
  }
}

function App2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const map = new Map(canvasRef.current!);

    map.draw();
  }, [])
  
  return <canvas ref={canvasRef} width={1000} height={1000}/>
}

export default App2D
