import type { Path, PathValue } from "./types";

export type TreeValue = unknown;
export type NodeValue = unknown;

const value_equal = (v1: unknown, v2: unknown) => Object.is(v1, v2);

const get_at_string_path = <R, P extends Path<R>>(
    root: R,
    string_path: P,
): PathValue<R, P> | undefined => {
    if (string_path === "") {
        return root as PathValue<R, P>;
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

        const current_value = (node as any)[key];

        if (index !== lastIndex) {
            if (current_value === null || current_value === undefined) {
                return current_value;
            }

            node = current_value;
        } else {
            return current_value;
        }
    }

    throw new Error("Unreachable");
}

const set_at_string_path = <R, P extends Path<R>>(
    root: R,
    string_path: P,
    new_value: PathValue<R, P>,
) => {
    if (string_path === "") {
        return new_value;
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
            const current_value = (node as any)[key];

            if (current_value === null || current_value === undefined) {
                if (!isNaN(+parts[index + 1])) {
                    (node as any)[key] = [];
                } else {
                    (node as any)[key] = {};
                }
            }

            node = (node as any)[key];
        } else {
            (node as any)[key] = new_value;

            return root as PathValue<R, P>;
        }
    }

    throw new Error("Unreachable");
};


interface NodeListenerEvents {
    on_events?: (events: NodeEvent[]) => void;
}

interface NodeListener {
    listen_to_child: boolean;
    last_acknowledged_event: number;
    events: NodeListenerEvents;
}

export interface NodeInternal {
    tree: TreeInternal;
    string_path: string;
    array_path: string[];
    parent: NodeInternal | null;
    childs: NodeInternal[];
    childs_with_events: NodeInternal[];
    listeners: NodeListener[];
    events: {
        childs: NodeEvent[],
        exact: NodeEvent[],
    }
    listen_to_child: boolean;
    last_acknowledged_event: number;
}

interface NodeEvent {
    string_path: string;
    array_path: string[];
    old_value: unknown;
    new_value: unknown;
    ack: number;
}

interface TreeInternal {
    root: NodeInternal
    value: unknown,
    nodes: Record<string, NodeInternal | undefined>;
    last_event: number;
    history: NodeEvent[];
    fire_in_progress: boolean;
}

const _find_parent_node = (tree: TreeInternal, string_path: string): NodeInternal => {
    let parent_node = undefined;
    let x = string_path.length - 1;

    while (x > 0) {
        if (string_path[x] === '.') {
            parent_node = tree.nodes[string_path.substring(0, x)];

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

interface RelativeNodes {
    exact: NodeInternal[];
    parents: NodeInternal[];
    childs: NodeInternal[];
    unrelated: NodeInternal[];
}

const _classify_relatives = (array_path: string[], nodes: NodeInternal[]): RelativeNodes => {
    const relatives: RelativeNodes = {
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

const _link_node = (node: NodeInternal) => {
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

    tree.nodes[node.string_path] = node;
}

const _unlink_node_from_events = (node: NodeInternal) => {
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

const _unlink_node = (node: NodeInternal) => {
    const tree = node.tree;

    if (node.string_path === "") {
        throw new Error("");
    }

    console.log("unlink node", node.string_path);

    _unlink_node_from_events(node);

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete tree.nodes[node.string_path];

    node.parent?.childs.splice(node.parent.childs.indexOf(node), 1);
    node.parent?.childs.push(...node.childs);
    node.parent?.childs.forEach(c => c.parent = node.parent);
}

const _add_listener = (tree: TreeInternal, string_path: string, listen_to_child: boolean, events: NodeListenerEvents) => {
    let node = tree.nodes[string_path];

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
                exact: []
            }
        }

        _link_node(node);
    }

    const listener: NodeListener = {
        listen_to_child,
        last_acknowledged_event: node.last_acknowledged_event,
        events
    }

    node.listeners = [...node.listeners, listener];

    node.listen_to_child = node.listeners.some(l => l.listen_to_child);

    return listener;
}

const _rem_listener = (tree: TreeInternal, string_path: string, listener: NodeListener) => {
    const node = tree.nodes[string_path]

    if (!node) {
        throw new Error("Node not existing");
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

const _make_tree_internal = (value: unknown): TreeInternal => {
    const tree: TreeInternal = {
        root: null,
        value,
        nodes: {},
        fire_in_progress: false,
        cursors: [],
        last_event: -1,
    }

    const root: NodeInternal = {
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
        },
        last_acknowledged_event: tree.last_event
    }

    tree.root = root;
    tree.nodes[""] = root;

    return tree;
}

const _fire_events = (tree: TreeInternal) => {
    if (tree.fire_in_progress) {
        throw new Error("fuck");
    }

    tree.fire_in_progress = true;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    process_events: while (true) {
        let node_with_events: NodeInternal = tree.root;

        while (!node_with_events.events.childs.length && !node_with_events.events.exact.length) {
            if (!node_with_events.childs_with_events.length) {
                break process_events;
            }

            node_with_events = node_with_events.childs_with_events[0];
        }

        const global_ack = tree.last_event;
        const cursor = node_with_events;

        // notify node listeners

        const relatives = cursor.events;

        const total_events = [...relatives.exact, ...relatives.childs];
        const max_ack = Math.max(...total_events.map(e => e.ack));

        for (const listener of cursor.listeners) {
            if (listener.last_acknowledged_event < max_ack) {
                const not_ack_events = [...relatives.exact, ...relatives.childs].filter(e => e.ack > listener.last_acknowledged_event);

                listener.last_acknowledged_event = max_ack;

                if (not_ack_events.length) {
                    listener.events?.on_events?.(not_ack_events);

                    if (tree.last_event != global_ack) {
                        continue process_events;
                    }
                }
            }
        }

        // all listener processed, try to update parents ack

        if (!relatives.childs.length) {
            let current: NodeInternal | null = cursor;

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

        cursor.events.childs.splice(0, cursor.events.childs.length);
        cursor.events.exact.splice(0, cursor.events.exact.length);

        for (const child_event of childs_events) {
            _insert_event(tree, child_event, cursor);
        }
    }

    tree.fire_in_progress = false;
}

const _insert_event = (tree: TreeInternal, event: NodeEvent, max_insertion_point?: NodeInternal): void => {
    let current: NodeInternal | null = tree.nodes[event.string_path] ?? _find_parent_node(tree, event.string_path);
    let insertion_point: NodeInternal | null = current;

    if (insertion_point === max_insertion_point) {
        throw new Error();
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

    if (!tree.fire_in_progress) {
        _fire_events(tree);
    }
}

const _set_node_value = (tree: TreeInternal, string_path: string, new_value: unknown): void => {
    const old_value = get_at_string_path(tree.value, string_path);

    if (value_equal(new_value, old_value)) {
        throw new Error("Same value");
    }

    tree.value = set_at_string_path(tree.value, string_path, new_value);

    tree.last_event++;

    const event: NodeEvent = { string_path, array_path: string_path.split("."), old_value, new_value, ack: tree.last_event };

    _insert_event(tree, event);
}

const _get_node_value = (tree: TreeInternal, string_path: string): unknown => {
    const value = get_at_string_path(tree.value, string_path);

    return value;
}

export interface Node<NV extends NodeValue = NodeValue> {
    _internal: {
        tree: TreeInternal;
    }
    string_path: string;
    get_value: () => NV;
    set_value: (value: NV) => void;
    get_node: <P extends Path<NV>>(string_path: P) => Node<PathValue<NV, P>>;
    add_listener: (listen_to_child: boolean, events: NodeListenerEvents) => NodeListener;
    rem_listener: (listener: NodeListener) => void;
}

export type GetOnlyNode<NV extends NodeValue = NodeValue> = Omit<Node<NV>, "set_value" | "get_node"> & {
    get_node: <P extends Path<NV>>(string_path: P) => GetOnlyNode<PathValue<NV, P>>
};

export type SetOnlyNode<NV extends NodeValue = NodeValue> = Omit<Node<NV>, "get_value" | "get_node"> & {
    get_node: <P extends Path<NV>>(string_path: P) => SetOnlyNode<PathValue<NV, P>>
};

const _get_node_handle = <NV extends NodeValue, NP extends Path<NV>>(tree: TreeInternal, string_path: NP): Node<PathValue<NV, NP>> => {
    return {
        _internal: {
            tree
        },
        string_path,
        get_value: () => _get_node_value(tree, string_path) as PathValue<NV, NP>,
        set_value: (new_value) => { _set_node_value(tree, string_path, new_value); },
        get_node: <RNP extends Path<NV>>(path: RNP) => _get_node_handle<NV, RNP>(tree, `${string_path}${path}` as unknown as Path<NV>),
        add_listener: (listen_to_child, events) => _add_listener(tree, string_path, listen_to_child, events),
        rem_listener: (listener) => { _rem_listener(tree, string_path, listener); }
    }
}

export interface Tree<TD extends TreeValue = TreeValue> {
    _internal: {
        tree: TreeInternal;
    }
    get_node: <NP extends Path<TD>>(string_path: NP) => Node<PathValue<TD, NP>>;
}

const make_tree = <TD extends TreeValue>(value: TD): Tree<TD> => {
    const tree = _make_tree_internal(value);

    return {
        _internal: {
            tree
        },
        get_node: <NP extends Path<TD>>(path: NP) => _get_node_handle<TD, NP>(tree, path)
    };
}

export { make_tree };

