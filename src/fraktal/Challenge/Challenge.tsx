

import { Button } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface StoreListener { onChange: () => void }

interface StoreInternal<T> {
    getValue: () => T,
    setValue: (newValue: T) => void,
    addListener: (listener: StoreListener) => StoreListener;
    remListener: (listener: StoreListener) => void;
}

const createStoreInternal = <T,>(initialValue: T): StoreInternal<T> => {
    const listeners: StoreListener[] = [];

    let value = initialValue;

    return {
        getValue: () => value,
        setValue: (newValue) => {
            value = newValue;

            listeners.forEach(l => { l.onChange(); });
        },
        addListener: (listener) => {
            listeners.push(listener);

            return listener;
        },
        remListener: (listener) => {
            listeners.splice(listeners.indexOf(listener), 1);
        },
    }
}

interface Store<T> {
    getValue: () => T,
    setValue: (newValue: T) => void,
    _internal: StoreInternal<T>
}

const createStoreHandle = <T,>(initialValue: T): Store<T> => {
    const _internal = createStoreInternal<T>(initialValue);

    return {
        getValue: _internal.getValue,
        setValue: _internal.setValue,
        _internal
    }
}

export const useStore = <T,>(initialValue: T): Store<T> => {
    const handle = useRef(createStoreHandle(initialValue));

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

let a = 0;
let i = 0;

const g = (a) => {

}

export const useDebugRender = (name: string) => {
    const ref = useRef({ renderCount: 0, depth: 0, unmouted: false });

    ref.current.depth = i;
    a++;
    i++;

    const onBeforeRender = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}🎨 ${name}: Before Render`, 'color: #5c7cfa');
    }, [name]);

    const onLayoutEffect = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}🎨 ${name}: Layout Effect`, 'color: #5c7cfa');
    }, [name]);

    const onLayoutEffect2 = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}🎨 ${name}: Layout Effect2`, 'color: #5c7cfa');
    }, [name]);

    const onAfterRender = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}🎨 ${name}: After Render`, 'color: #5c7cfa');
    }, [name]);

    const onAfterRender2 = useCallback(() => {
        if (!ref.current.unmouted) {
            console.debug(`%c ${" ".repeat(ref.current.depth)}🎨 ${name}: After Render2`, 'color: #5c7cfa');
        }
    }, [name]);

    const onMount = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}⚒️ ${name}: Mounted`, 'color: #51cf66');
    }, [name]);

    const onMount2 = useCallback(() => {
        console.debug(`%c ${" ".repeat(ref.current.depth)}⚒️ ${name}: Mounted2`, 'color: #51cf66');
    }, [name]);


    const onUnmount = useCallback(() => {
        ref.current.unmouted = true;

        console.debug(`%c ${" ".repeat(ref.current.depth)}☠️ ${name}: Unmounted`, 'color: #fa5252');
    }, [name]);

    if (ref.current.renderCount === 0) {
        onMount();
    }

    onBeforeRender();

    useEffect(() => {
        // onMount2();

        return onUnmount;
    }, [onMount2, onUnmount]);

    useEffect(() => {
        onAfterRender();
        i--;

        return onAfterRender2;
    }, [a, onAfterRender, onAfterRender2]);

    // useLayoutEffect(() => {
    //     onLayoutEffect();

    //     return onLayoutEffect2;
    // }, [a, onLayoutEffect, onLayoutEffect2]);

    ref.current.renderCount += 1;
}

interface Props { store: Store<number> }

const Incrementer = ({ store }: Props) => {
    const increment = useCallback(() => {
        store.setValue(store.getValue() + 1)
    }, [store]);

    useDebugRender("Incrementer");

    return <Button onClick={increment}>Inc</Button>
}

const Displayer = ({ store }: Props) => {
    const value = useStoreValue(store);

    useDebugRender("Displayer");

    return <>Val: {value}</>
}

const Child1 = ({ store }: Props) => {
    useDebugRender("Child1");

    return <Incrementer store={store} />
}

const Child2 = ({ store }: Props) => {
    useDebugRender("Child2");

    return <Displayer store={store} />
}

const Parent = () => {
    const store = useStore(0);

    useDebugRender("Parent");

    return <><Child1 store={store} /><Child2 store={store} /></>
}

const ChildRec2 = ({ store }: Props) => {
    useDebugRender("ChildRec2");

    const value = useStoreValue(store);

    return <>Val: {value}</>
}

const ChildRec1 = ({ store }: Props) => {
    useDebugRender("ChildRec1");

    const value = useStoreValue(store);

    return <>Val: {value}{value % 2 == 0 ? <ChildRec2 store={store} /> : <></>}</>
}

const Parent2 = () => {
    const store = useStore(0);

    useDebugRender("Parent");

    return <><Incrementer store={store} /><ChildRec1 store={store} /></>
}


export const Challenge = () => {
    return <Parent2 />;
}