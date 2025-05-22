import { useEffect, useRef} from 'react'
import './App.css'
import { Renderer } from './components/Renderer';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    new Renderer(canvasRef.current!);
  }, [])
  
  return <canvas ref={canvasRef} width={1000} height={1000}/>
}

export default App
