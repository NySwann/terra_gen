type StoreListener = { onChange: () => void };

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

            listeners.forEach(l => l.onChange());
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

const createStoreHandle = <T,>(initialValue: T): Store<T> => {
    const _internal = createStoreInternal<T>(initialValue);

    return {
        getValue: _internal.getValue,
        setValue: _internal.setValue,
        _internal
    }
}

export interface Store<T> {
    getValue: () => T,
    setValue: (newValue: T) => void,
    _internal: StoreInternal<T>
}

export const createStore = <T,>(initialValue: T): Store<T> =>
{
    return createStoreHandle(initialValue);
}
