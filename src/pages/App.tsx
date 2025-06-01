import { useCallback, useRef} from 'react'
import './App.css'
import "@mantine/core/styles.css";
import { AppShell, Flex, MantineProvider, Text } from '@mantine/core';
import { theme } from '../theme';
import { Navbar } from '../components/shell/Navbar/Navbar';
import { Aside } from '@/components/shell/Aside/Aside';
import { useStoreValue } from '@/hooks/useStore';
import { rendererStore } from '@/stores/renderer';

function App() {
  const renderer = useStoreValue(rendererStore);
  const rendererRef = useRef<{div: HTMLDivElement, canvas: HTMLCanvasElement} | null>(null);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      console.log("acquired");

      const canvasElement = document.createElement('canvas')
      canvasElement.width = 1000;
      canvasElement.height = 1000;
      //canvasElement.id = '#renderCanvas'
      node.appendChild(canvasElement);

      renderer.attach(canvasElement);

      rendererRef.current = {canvas: canvasElement, div: node};
    }
    else if (rendererRef.current) {
      console.log("destroyed");

      renderer.detach();

      rendererRef.current.div.removeChild(rendererRef.current.canvas);
      rendererRef.current.canvas.remove();

      rendererRef.current = null;
    }
  }, [renderer]);

  return <MantineProvider theme={theme} defaultColorScheme='dark'>
    <AppShell
      header={{ height: "4%" }}
      navbar={{
        width: "20%",
        breakpoint: "md"
      }}
      aside={{
        width: "20%",
        breakpoint: "md"
      }}
      footer={{ height: "4%" }}
      padding="md"
    >
      <AppShell.Header style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Text>Trixel</Text>
      </AppShell.Header>
      <Navbar/>
      <AppShell.Main style={{display: "flex", alignItems: "center", justifyContent: "center"}}><Flex ref={refCallback}/></AppShell.Main>
      <Aside/>
      <AppShell.Footer style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Text id="display-fps">Zouin</Text>
      </AppShell.Footer>
    </AppShell>
    </MantineProvider>
}

export default App
