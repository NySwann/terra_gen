import { Stack, Slider, Text } from "@mantine/core";
import { useStoreValue } from "../../../hooks/useStore";
import type { Store } from "../../../stores/store";

interface EraserToolControlProps {
    optionsStore: Store<EraserToolOptions>;
}

export function EraserToolControl({ optionsStore }: EraserToolControlProps) {
    const options = useStoreValue(optionsStore);

    return <Stack>
        <Text>Sphere Size</Text>
        <Slider value={options.size} onChange={(size) => { optionsStore.setValue({ size: Number(size) }) }} min={0.1} max={10} />
    </Stack>
}

export interface EraserToolOptions {
    size: number;
}