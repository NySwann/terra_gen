import { CompareValuesWithDetailedDifferences } from "./compare";
import type { Path, PathData } from "./types";

export type ReactiveTreeData = unknown;
export type ReactiveNodeData = unknown;

export type ReactiveTreeMeta = unknown;
export type ReactiveNodeMeta = unknown;

const data_equal = (v1: unknown, v2: unknown) => Object.is(v1, v2);

const get_at_string_path = (
    root: unknown,
    string_path: string,
): unknown => {
    if (string_path === "") {
        return root;
    }

    const parts = string_path.split(".");

    const parts_length = parts.length;

    if (parts_length < 2) {
        throw new Error();
    }

    const lastIndex = parts_length - 1;

    let index = 0;
    let node = root;

    while (++index < parts_length) {
        const key = parts[index];

        const current_data = (node as any)[key];

        if (index !== lastIndex) {
            if (current_data === null || current_data === undefined) {
                return current_data;
            }

            node = current_data;
        } else {
            return current_data;
        }
    }

    throw new Error("Unreachable");
}

const set_at_string_path = (
    root: unknown,
    string_path: string,
    new_data: unknown,
): unknown => {
    if (string_path === "") {
        return new_data;
    }

    const parts = string_path.split(".");
    const parts_length = parts.length;

    if (parts_length < 2) {
        throw new Error();
    }

    const lastIndex = parts_length - 1;

    let index = 0;
    let node = root;

    while (++index < parts_length) {
        const key = parts[index];

        if (index !== lastIndex) {
            const current_data = (node as any)[key];

            if (current_data === null || current_data === undefined) {
                if (!isNaN(+parts[index + 1])) {
                    (node as any)[key] = [];
                } else {
                    (node as any)[key] = {};
                }
            }

            node = (node as any)[key];
        } else {
            (node as any)[key] = new_data;

            return root;
        }
    }

    throw new Error("Unreachable");
};


interface ReactiveNodeListenerEvents {
    on_events?: (events: (ReactiveTreeEvent | ReactiveNodeEvent)[]) => void;
}

interface ReactiveNodeListener {
    listen_to_child: boolean;
    last_acknowledged_event: number;
    events: ReactiveNodeListenerEvents;
}

export interface ReactiveNodeInternal {
    tree: ReactiveTreeInternal;
    string_path: string;
    array_path: string[];
    parent: ReactiveNodeInternal | null;
    childs: ReactiveNodeInternal[];
    childs_with_events: ReactiveNodeInternal[];
    listeners: ReactiveNodeListener[];
    events: {
        childs: ReactiveNodeEvent[],
        exact: ReactiveNodeEvent[],
        tree: ReactiveTreeEvent[],
    }
    listen_to_child: boolean;
    last_acknowledged_event: number;
}

interface ReactiveNodeDataChangeEvent {
    type: "node_data_change";
    string_path: string;
    array_path: string[];
    old_data: unknown;
    new_data: unknown;
    ack: number;
}

interface ReactiveNodeMetaChangeEvent {
    type: "node_meta_change";
    string_path: string;
    array_path: string[];
    old_meta: unknown;
    new_meta: unknown;
    ack: number;
}

interface ReactiveTreeMetaChangeEvent {
    type: "tree_meta_change";
    old_meta: unknown;
    new_meta: unknown;
    ack: number;
}

type ReactiveNodeEvent = ReactiveNodeDataChangeEvent | ReactiveNodeMetaChangeEvent;
type ReactiveTreeEvent = ReactiveTreeMetaChangeEvent;

interface ReactiveTreeInternal {
    root: ReactiveNodeInternal
    data: ReactiveTreeData,
    tree_meta: ReactiveTreeMeta,
    node_meta: Record<string, ReactiveNodeMeta>;
    nodes: Record<string, ReactiveNode | undefined>;
    nodes_with_events: Record<string, ReactiveNodeInternal | undefined>;
    last_event: number;
    history: ReactiveNodeEvent[];
    fire_in_progress: boolean;
}

const _find_parent_node = (tree: ReactiveTreeInternal, string_path: string): ReactiveNodeInternal => {
    let parent_node = undefined;
    let x = string_path.length - 1;

    while (x > 0) {
        if (string_path[x] === '.') {
            parent_node = tree.nodes_with_events[string_path.substring(0, x)];

            if (parent_node) {
                break;
            }
        }

        x--;
    }

    parent_node ??= tree.root;

    return parent_node;
}

const _classify_relative = (array_path: string[], other_array_path: string[]) => {
    const len1 = array_path.length;
    const len2 = other_array_path.length;
    const len = len1 < len2 ? len1 : len2;

    for (let x = 0; x < len; x++) {
        if (array_path[x] !== other_array_path[x]) {
            return "unrelated";
        }
    }

    if (len1 > len2) {
        return "parent";
    }

    if (len1 < len2) {
        return "child";
    }

    return "exact";
}

interface RelativeReactiveNodes {
    exact: ReactiveNodeInternal[];
    parents: ReactiveNodeInternal[];
    childs: ReactiveNodeInternal[];
    unrelated: ReactiveNodeInternal[];
}

const _classify_relatives = (array_path: string[], nodes: ReactiveNodeInternal[]): RelativeReactiveNodes => {
    const relatives: RelativeReactiveNodes = {
        parents: [],
        childs: [],
        unrelated: [],
        exact: [],
    };

    for (const node of nodes) {
        const classification = _classify_relative(array_path, node.array_path);

        if (classification === "child") {
            relatives.childs.push(node);
        } else if (classification === "parent") {
            relatives.parents.push(node);
        } else if (classification === "unrelated") {
            relatives.unrelated.push(node);
        } else {
            relatives.exact.push(node);
        }
    }

    return relatives;
}

const _link_node = (node: ReactiveNodeInternal) => {
    const tree = node.tree;

    const parent = _find_parent_node(tree, node.string_path);
    const relatives = _classify_relatives(node.array_path, parent.childs);

    if (relatives.parents.length) {
        throw new Error("tf");
    }

    node.childs.push(...relatives.childs);
    node.childs.forEach(c => c.parent = node);

    parent.childs.splice(0, parent.childs.length);
    parent.childs.push(...relatives.unrelated, node);
    parent.childs.forEach(c => c.parent = parent);

    tree.nodes_with_events[node.string_path] = node;
}

const _unlink_node_from_events = (node: ReactiveNodeInternal) => {
    if (node.string_path === "") {
        throw new Error("");
    }

    if (!node.childs_with_events.length && !node.events.childs.length && !node.events.exact.length) {
        return;
    }

    console.log("unlink node events", node.string_path);

    let parent = node.parent;

    while (parent != null) {
        if (parent.childs_with_events.length || parent.events.childs.length || parent.events.exact.length || parent.string_path === "") {
            if (!parent.childs_with_events.includes(node)) {
                throw new Error();
            }

            parent.childs_with_events.splice(parent.childs_with_events.indexOf(node), 1);
            parent.childs_with_events.push(...node.childs_with_events);

            break;
        }

        parent = parent.parent;
    }
}

const _unlink_node = (node: ReactiveNodeInternal) => {
    const tree = node.tree;

    if (node.string_path === "") {
        throw new Error("");
    }

    console.log("unlink node", node.string_path);

    _unlink_node_from_events(node);

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete tree.nodes_with_events[node.string_path];

    node.parent?.childs.splice(node.parent.childs.indexOf(node), 1);
    node.parent?.childs.push(...node.childs);
    node.parent?.childs.forEach(c => c.parent = node.parent);
}

const _add_listener = (tree: ReactiveTreeInternal, string_path: string, listen_to_child: boolean, events: ReactiveNodeListenerEvents) => {
    let node = tree.nodes_with_events[string_path];

    if (!node) {
        node = {
            tree,
            string_path,
            array_path: string_path.split("."),
            listeners: [],
            listen_to_child: false,
            childs: [],
            childs_with_events: [],
            parent: null,
            last_acknowledged_event: tree.last_event,
            events: {
                childs: [],
                exact: [],
                tree: [],
            }
        }

        _link_node(node);
    }

    const listener: ReactiveNodeListener = {
        listen_to_child,
        last_acknowledged_event: node.last_acknowledged_event,
        events
    }

    node.listeners = [...node.listeners, listener];

    node.listen_to_child = node.listeners.some(l => l.listen_to_child);

    return listener;
}

const _rem_listener = (tree: ReactiveTreeInternal, string_path: string, listener: ReactiveNodeListener) => {
    const node = tree.nodes_with_events[string_path]

    if (!node) {
        throw new Error("ReactiveNode not existing");
    }

    if (!node.listeners.includes(listener)) {
        throw new Error("Listener already removed");
    }

    node.listeners.splice(node.listeners.indexOf(listener), 1);
    node.listen_to_child = node.listeners.some(l => l.listen_to_child);

    if (!node.listeners.length && node.string_path !== "") {
        _unlink_node(node);
    }
}

const _make_tree_internal = (data: ReactiveTreeData, tree_meta: ReactiveTreeMeta, node_meta: Record<string, ReactiveNodeMeta>): ReactiveTreeInternal => {
    const tree: ReactiveTreeInternal = {
        root: null,
        data,
        tree_meta,
        node_meta,
        nodes_with_events: {},
        fire_in_progress: false,
        cursors: [],
        last_event: -1,
    }

    const root: ReactiveNodeInternal = {
        listeners: [],
        string_path: "",
        array_path: [""],
        tree,
        parent: null,
        childs: [],
        childs_with_events: [],
        listen_to_child: false,
        events: {
            childs: [],
            exact: [],
            tree: [],
        },
        last_acknowledged_event: tree.last_event
    }

    tree.root = root;
    tree.nodes_with_events[""] = root;

    return tree;
}

const _fire_events = (tree: ReactiveTreeInternal) => {
    if (tree.fire_in_progress) {
        throw new Error("fuck");
    }

    tree.fire_in_progress = true;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    process_events: while (true) {
        let node_with_events: ReactiveNodeInternal = tree.root;

        while (!node_with_events.events.childs.length && !node_with_events.events.exact.length && !node_with_events.events.tree.length) {
            if (!node_with_events.childs_with_events.length) {
                break process_events;
            }

            node_with_events = node_with_events.childs_with_events[0];
        }

        const global_ack = tree.last_event;
        const cursor = node_with_events;

        // notify node listeners

        const relatives = cursor.events;

        const total_events = [...relatives.exact, ...relatives.childs, ...relatives.tree];
        const max_ack = Math.max(...total_events.map(e => e.ack));

        for (const listener of cursor.listeners) {
            if (listener.last_acknowledged_event < max_ack) {
                const not_ack_events = total_events.filter(e => e.ack > listener.last_acknowledged_event);

                listener.last_acknowledged_event = max_ack;

                if (not_ack_events.length) {
                    listener.events.on_events?.(not_ack_events);

                    if (tree.last_event != global_ack) {
                        continue process_events;
                    }
                }
            }
        }

        // all listener processed, try to update parents ack

        if (!relatives.childs.length) {
            let current: ReactiveNodeInternal | null = cursor;

            while (current != null) {
                const max = Math.max(...current.listeners.map(l => l.last_acknowledged_event));

                if (max <= current.last_acknowledged_event) {
                    break;
                }

                current.last_acknowledged_event = max;
                current = current.parent;
            }
        }

        // split worker

        if (cursor.string_path !== "") {
            _unlink_node_from_events(cursor);
        }

        const childs_events = [...cursor.events.childs];
        const tree_events = [...cursor.events.tree];

        cursor.events.childs.splice(0, cursor.events.childs.length);
        cursor.events.exact.splice(0, cursor.events.exact.length);
        cursor.events.tree.splice(0, cursor.events.tree.length);

        for (const child of cursor.childs_with_events) {
            _insert_tree_event(child, tree_events)
        }

        for (const child_event of childs_events) {
            _insert_node_event(tree, child_event, cursor);
        }
    }

    tree.fire_in_progress = false;
}

const _insert_node_event = (tree: ReactiveTreeInternal, event: ReactiveNodeEvent, max_insertion_point?: ReactiveNodeInternal): void => {
    let current: ReactiveNodeInternal | null = tree.nodes_with_events[event.string_path] ?? _find_parent_node(tree, event.string_path);
    let insertion_point: ReactiveNodeInternal | null = current;

    if (insertion_point === max_insertion_point) {
        return;
    }

    while (current !== null && current !== max_insertion_point) {
        if (current.listen_to_child) {
            insertion_point = current;
        }

        current = current.parent;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (insertion_point !== null) {
        const classification = _classify_relative(insertion_point.array_path, event.array_path);

        if (classification === "exact") {
            insertion_point.events.exact.push(event);
        } else if (classification === "child") {
            insertion_point.events.childs.push(event);
        } else {
            throw new Error("tf");
        }

        if (insertion_point.string_path !== "") {
            let parent = insertion_point.parent;

            while (parent != null) {
                if (parent.childs_with_events.length || parent.events.childs.length || parent.events.exact.length || parent.string_path === "") {
                    if (!parent.childs_with_events.includes(insertion_point)) {
                        const relatives = _classify_relatives(insertion_point.array_path, parent.childs_with_events);

                        if (relatives.parents.length) {
                            console.log(insertion_point.string_path);
                            console.log(relatives.parents.map(p => p.string_path));
                            console.log(relatives.parents.map(p => p.childs_with_events));
                            console.log(relatives.parents.map(p => p.events.exact));
                            console.log(relatives.parents.map(p => p.events.childs));

                            throw new Error("tf");
                        }

                        const childs = relatives.childs;
                        const unrelated = relatives.unrelated;

                        parent.childs_with_events = [...unrelated, insertion_point];
                        insertion_point.childs_with_events = [...childs, ...insertion_point.childs_with_events];
                    }

                    break;
                }

                parent = parent.parent;
            }
        }
    }
}

const _insert_tree_event = (node: ReactiveNodeInternal, events: ReactiveTreeEvent[]): void => {
    node.events.tree.push(...events);
}

const _set_node_data = (tree: ReactiveTreeInternal, string_path: string, new_data: unknown): void => {
    const old_data = get_at_string_path(tree.data, string_path);

    if (data_equal(new_data, old_data)) {
        throw new Error("Same data");
    }

    tree.data = set_at_string_path(tree.data, string_path, new_data);

    tree.last_event++;

    const event: ReactiveNodeDataChangeEvent = { type: "node_data_change", string_path, array_path: string_path.split("."), old_data, new_data, ack: tree.last_event };

    _insert_node_event(tree, event);

    if (!tree.fire_in_progress) {
        _fire_events(tree);
    }
}

const _get_node_data = (tree: ReactiveTreeInternal, string_path: string): unknown => {
    const data = get_at_string_path(tree.data, string_path);

    return data;
}

export interface ReactiveNode<ND extends ReactiveNodeData = ReactiveNodeData, NM extends ReactiveNodeMeta = ReactiveNodeMeta> {
    string_path: string;
    get_data: () => ND;
    set_data: (data: ND) => void;
    get_meta: () => NM;
    set_meta: (data: NM) => void;
    get_node: <P extends Path<ND>>(string_path: P) => ReactiveNode<PathData<ND, P>, NM>;
    add_listener: (listen_to_child: boolean, events: ReactiveNodeListenerEvents) => ReactiveNodeListener;
    rem_listener: (listener: ReactiveNodeListener) => void;
}

export type ReactiveNodeGetOnly<NV extends ReactiveNodeData = ReactiveNodeData, NM extends ReactiveNodeMeta = ReactiveNodeMeta> = Omit<ReactiveNode<NV, NM>, "set_data" | "set_meta" | "get_node"> & {
    get_node: <P extends Path<NV>>(string_path: P) => ReactiveNodeGetOnly<PathData<NV, P>>
};

export type ReactiveNodeSetOnly<NV extends ReactiveNodeData = ReactiveNodeData, NM extends ReactiveNodeMeta = ReactiveNodeMeta> = Omit<ReactiveNode<NV, NM>, "get_data" | "get_meta" | "get_node"> & {
    get_node: <P extends Path<NV>>(string_path: P) => ReactiveNodeSetOnly<PathData<NV, P>>
};

const _get_node_meta = (tree: ReactiveTreeInternal, string_path: string): ReactiveNodeMeta => {
    const data = tree.node_meta[string_path];

    return data;
}

const _get_node_handle = <NV extends ReactiveNodeData, NP extends Path<NV>>(tree: ReactiveTreeInternal, string_path: NP): ReactiveNode<PathData<NV, NP>> => {
    return {
        string_path,
        get_node: <RNP extends Path<NV>>(path: RNP) => _get_node_handle<NV, RNP>(tree, `${string_path}${path}` as unknown as Path<NV>),
        get_data: () => _get_node_data(tree, string_path) as PathData<NV, NP>,
        set_data: (new_data) => { _set_node_data(tree, string_path, new_data); },
        get_meta: () => _get_node_meta(tree, string_path),
        add_listener: (listen_to_child, events) => _add_listener(tree, string_path, listen_to_child, events),
        rem_listener: (listener) => { _rem_listener(tree, string_path, listener); }
    }
}

const _set_node_meta_bulk = (tree: ReactiveTreeInternal, node_meta: Record<string, ReactiveNodeMeta>): void => {
    const differences = CompareValuesWithDetailedDifferences(tree.node_meta, node_meta);

    tree.node_meta = node_meta;

    for (const diff of differences) {
        tree.last_event++;

        const path = diff.path.substring(1);

        const event: ReactiveNodeMetaChangeEvent = { type: "node_meta_change", string_path: path, array_path: path.split("."), old_meta: diff.oldValue, new_meta: diff.newValue, ack: tree.last_event };

        _insert_node_event(tree, event);
    }

    if (!tree.fire_in_progress) {
        _fire_events(tree);
    }
}

const _get_node_meta_bulk = (tree: ReactiveTreeInternal): Record<string, ReactiveNodeMeta> => {
    const data = tree.node_meta;

    return data;
}

const _set_tree_meta = (tree: ReactiveTreeInternal, new_meta: unknown): void => {

    const old_meta = tree.tree_meta;

    if (new_meta === old_meta) {
        throw new Error();
    }

    const event: ReactiveTreeMetaChangeEvent = { type: "tree_meta_change", old_meta, new_meta, ack: tree.last_event };

    _insert_tree_event(tree.root, [event]);

    if (!tree.fire_in_progress) {
        _fire_events(tree);
    }
}

const _get_tree_meta = (tree: ReactiveTreeInternal): unknown => {
    return tree.tree_meta;
}

export interface ReactiveTree<TD extends ReactiveTreeData = ReactiveTreeData, TM extends ReactiveTreeMeta = ReactiveTreeMeta, NM extends ReactiveNodeMeta = ReactiveNodeMeta> {
    get_node: <NP extends Path<TD>>(string_path: NP) => ReactiveNode<PathData<TD, NP>, NM>;
    get_tree_meta: () => TM,
    set_tree_meta: (meta: TM) => void;
    get_node_meta_bulk: () => Record<string, NM>;
    set_node_meta_bulk: (meta: Record<string, NM>) => void;
}

const make_tree = <TD extends ReactiveTreeData = ReactiveTreeData, TM extends ReactiveTreeMeta = ReactiveTreeMeta, NM extends ReactiveNodeMeta = ReactiveNodeMeta>(data: TD, tree_meta: TM, node_meta: Record<Path<TD>, NM>): ReactiveTree<TD> => {
    const tree = _make_tree_internal(data, tree_meta, node_meta);

    return {
        get_node: <NP extends Path<TD>>(path: NP) => _get_node_handle<TD, NP>(tree, path),
        get_tree_meta: () => _get_tree_meta(tree),
        set_tree_meta: (meta) => { _set_tree_meta(tree, meta); },
        get_node_meta_bulk: () => _get_node_meta_bulk(tree),
        set_node_meta_bulk: (meta) => { _set_node_meta_bulk(tree, meta); },
    };
}

export { make_tree };

