import { Loader } from "@mantine/core";
import { useStoreValue } from "../../hooks/useStore";
import { gameStore } from "../../stores/game";

export function EditPanel() {
    const game = useStoreValue(gameStore);

    console.log(game);

    if (!game) {
        return <Loader />;
    }

    return game.scene.tool.control;
}