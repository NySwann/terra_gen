import { useCallback, useEffect, useRef} from 'react'
import './App.css'
import { Renderer } from './components/Renderer';

function App() {
  const rendererRef = useRef<{div: HTMLDivElement, canvas: HTMLCanvasElement, renderer: Renderer} | null>(null);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      console.log("acquired");

      const canvasElement = document.createElement('canvas')
      canvasElement.width = 1000;
      canvasElement.height = 1000;
      //canvasElement.id = '#renderCanvas'
      node.appendChild(canvasElement);

      const renderer = new Renderer(canvasElement);

      rendererRef.current = {canvas: canvasElement, div: node, renderer: renderer};
    }
    else if (rendererRef.current) {
      console.log("destroyed");

      rendererRef.current.renderer.dispose();

      rendererRef.current.div.removeChild(rendererRef.current.canvas);
      rendererRef.current.canvas.remove();

      rendererRef.current = null;
    }
  }, []);
  
  return <div ref={refCallback} />
}

export default App
