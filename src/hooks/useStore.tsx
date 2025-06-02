
import { useRef, useState, useEffect } from "react";
import { createStore, type Store } from "../stores/store";

export const useStore = <T,>(initialValue: T): Store<T> =>
{
    const handle = useRef(createStore(initialValue));

    return handle.current;
}

export const useStoreValue = <T,>(store: Store<T>): T => {
    const [value, setValue] = useState(store.getValue());

    useEffect(() => {
        const listener = store._internal.addListener({
            onChange: () => {
                setValue(store.getValue())
            }
        });

        return () => {
            store._internal.remListener(listener);
        }
    }, [store]);

    return value;
}