import type { ExactType, MergePath, Path, PathByType, PathValue, SubPath, TypeRange, TypeRange_Set, TypeRange_Get, IsNever } from "./types";

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


interface NodeListenerEvents<TD extends TreeValue, NP extends Path<TD> = Path<TD>> {
    on_events?: (events: TreeEvent<TD>[]) => void;
}

interface NodeListener<TD extends TreeValue, NP extends Path<TD> = Path<TD>> {
    listen_to_child: boolean;
    last_acknowledged_event: number;
    events: NodeListenerEvents<TD, NP>;
}

export interface NodeInternal<TD extends TreeValue, NP extends Path<TD> = Path<TD>> {
    tree: TreeInternal<TD>;
    string_path: NP;
    array_path: string[];
    parent: NodeInternal<TD> | null;
    childs: NodeInternal<TD>[];
    childs_with_events: NodeInternal<TD>[];
    listeners: NodeListener<TD, NP>[];
    events: {
        childs: TreeEvent<TD>[],
        exact: TreeEvent<TD>[],
    }
    listen_to_child: boolean;
    last_acknowledged_event: number;
}

interface TreeEvent<TD extends TreeValue> {
    string_path: Path<TD>;
    array_path: string[];
    old_value: unknown;
    new_value: unknown;
    ack: number;
}

interface TreeInternal<TD extends TreeValue> {
    root: NodeInternal<TD, "">
    value: TD,
    nodes: Record<string, NodeInternal<TD>>;
    last_event: number;
    history: TreeEvent<TD>[];
    fire_in_progress: boolean;
}

const _find_parent_node = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP): NodeInternal<TD> => {
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

    if (!parent_node) {
        parent_node = tree.root;
    }

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

interface RelativeNodes<TD extends TreeValue> {
    exact: NodeInternal<TD>[];
    parents: NodeInternal<TD>[];
    childs: NodeInternal<TD>[];
    unrelated: NodeInternal<TD>[];
}

const _classify_relatives = <TD extends TreeValue>(array_path: string[], nodes: NodeInternal<TD>[]): RelativeNodes<TD> => {
    const relatives: RelativeNodes<TD> = {
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
        } else if (classification === "exact") {
            relatives.exact.push(node);
        } else {
            throw new Error("fuck");
        }
    }

    return relatives;
}

const _link_node = <TD extends TreeValue>(tree: TreeInternal<TD>, node: NodeInternal<TD>) => {
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

const _unlink_node_from_events = <TD extends TreeValue>(tree: TreeInternal<TD>, node: NodeInternal<TD>) => {
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

const _unlink_node = <TD extends TreeValue>(tree: TreeInternal<TD>, node: NodeInternal<TD>) => {
    if (node.string_path === "") {
        throw new Error("");
    }

    console.log("unlink node", node.string_path);

    _unlink_node_from_events(tree, node);

    delete tree.nodes[node.string_path];

    node.parent?.childs.splice(node.parent.childs.indexOf(node), 1);
    node.parent?.childs.push(...node.childs);
    node.parent?.childs.forEach(c => c.parent = node.parent);
}

const _add_listener = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP, listen_to_child: boolean, events: NodeListenerEvents<TD, NP>) => {
    let node = tree.nodes[string_path] as NodeInternal<TD, NP>

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

        _link_node(tree, node);
    }

    const listener: NodeListener<TD, NP> = {
        listen_to_child,
        last_acknowledged_event: node.last_acknowledged_event,
        events
    }

    node.listeners = [...node.listeners, listener];

    node.listen_to_child = node.listeners.some(l => l.listen_to_child);

    return listener;
}

const _rem_listener = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP, listener: NodeListener<TD, NP>) => {
    const node = tree.nodes[string_path] as NodeInternal<TD, NP>

    if (!node) {
        throw new Error("Node not existing");
    }

    if (!node.listeners.includes(listener)) {
        throw new Error("Listener already removed");
    }

    node.listeners.splice(node.listeners.indexOf(listener), 1);
    node.listen_to_child = node.listeners.some(l => l.listen_to_child);

    if (!node.listeners.length && node.string_path !== "") {
        _unlink_node(tree, node);
    }
}

const _make_tree_internal = <TD extends TreeValue>(value: TD): TreeInternal<TD> => {
    const tree: TreeInternal<TD> = {
        root: null,
        value,
        nodes: {},
        fire_in_progress: false,
        cursors: [],
        last_event: -1,
    }

    const root: NodeInternal<TD, ""> = {
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

const _fire_events = <TD extends TreeValue>(tree: TreeInternal<TD>) => {
    if (tree.fire_in_progress) {
        throw new Error("fuck");
    }

    tree.fire_in_progress = true;

    process_events: while (true) {
        let node_with_events: NodeInternal<TD> = tree.root;

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
            let current: NodeInternal<TD> | null = cursor;

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
            _unlink_node_from_events(tree, cursor);
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

const _insert_event = <TD extends TreeValue>(tree: TreeInternal<TD>, event: TreeEvent<TD>, max_insertion_point?: NodeInternal<TD>): void => {
    let current: NodeInternal<TD> | null = tree.nodes[event.string_path] ?? _find_parent_node(tree, event.string_path);
    let insertion_point: NodeInternal<TD> | null = current;

    if (insertion_point === max_insertion_point) {
        throw new Error();
    }

    while (current !== null && current !== max_insertion_point) {
        if (current.listen_to_child) {
            insertion_point = current;
        }

        current = current.parent;
    }

    if (insertion_point != null) {
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

const _set_node_value = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP, new_value: PathValue<TD, NP>): void => {
    const old_value = get_at_string_path(tree.value, string_path);

    if (value_equal(new_value, old_value)) {
        throw new Error("Same value");
    }

    tree.value = set_at_string_path(tree.value, string_path, new_value) as TD;

    tree.last_event++;

    const event: TreeEvent<TD> = { string_path, array_path: string_path.split("."), old_value, new_value, ack: tree.last_event };

    _insert_event(tree, event);
}

const _get_node_value = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP): PathValue<TD, NP> => {
    const value = get_at_string_path(tree.value, string_path);

    return value;
}

type f = SubPath<TreeValue, Path<TreeValue, ExactType<NodeValue>>>;

export interface Node<NV extends NodeValue = NodeValue, TD extends TreeValue = TreeValue, NP extends Path<TD, ExactType<NV>> = Path<TD, ExactType<NV>>> {
    // _internal: {
    //     tree: TreeInternal<TD>;
    // }
    string_path: NP;
    get_value: () => NV;
    set_value: (value: NV) => void;
    get_node: <RNP extends SubPath<TD, NP>>(string_path: RNP) => Node<PathValue<TD, MergePath<TD, NP, RNP>>, TD, MergePath<TD, NP, RNP>>;
    // add_listener: (listen_to_child: boolean, events: NodeListenerEvents<TD, NP>) => NodeListener<TD, NP>;
    // rem_listener: (listener: NodeListener<TD, NP>) => void;
}

export type GetOnlyNode<NV extends NodeValue = NodeValue, TD extends TreeValue = TreeValue, NP extends Path<TD, ExactType<NV>> = Path<TD, ExactType<NV>>> = Omit<Node<NV, TD, NP>, "set_value" | "get_node"> & {
    get_node: <RNP extends SubPath<TD, NP>>(string_path: RNP) => GetOnlyNode<PathValue<TD, MergePath<TD, NP, RNP>>, TD, MergePath<TD, NP, RNP>>;
};

export type SetOnlyNode<NV extends NodeValue = NodeValue, TD extends TreeValue = TreeValue, NP extends Path<TD, ExactType<NV>> = Path<TD, ExactType<NV>>> = Omit<Node<NV, TD, NP>, "get_value" | "get_node"> & {
    get_node: <RNP extends SubPath<TD, NP>>(string_path: RNP) => SetOnlyNode<PathValue<TD, MergePath<TD, NP, RNP>>, TD, MergePath<TD, NP, RNP>>;
};

const _get_node_handle = <TD extends TreeValue, NP extends Path<TD>>(tree: TreeInternal<TD>, string_path: NP): Node<PathValue<TD, NP>, TD, NP> => {
    return {
        _internal: {
            tree
        },
        string_path,
        get_value: () => _get_node_value(tree, string_path),
        set_value: (new_value) => { _set_node_value(tree, string_path, new_value); },
        get_node: (path) => _get_node_handle(tree, `${string_path}${path}` as MergePath<TD, NP, typeof path>),
        add_listener: (listen_to_child, events) => _add_listener(tree, string_path, listen_to_child, events),
        rem_listener: (listener) => { _rem_listener(tree, string_path, listener); }
    }
}

export interface Tree<TD extends TreeValue = TreeValue> {
    _internal: {
        tree: TreeInternal<TD>;
    }
    get_value: <NP extends Path<TD>>(string_path: NP) => PathValue<TD, NP>;
    set_value: <NP extends Path<TD>>(string_path: NP, value: PathValue<TD, NP>) => void;
    get_node: <NP extends Path<TD>>(string_path: NP) => Node<PathValue<TD, NP>, TD, NP>;
}

const make_tree = <TD extends TreeValue>(value: TD): Tree<TD> => {
    const tree = _make_tree_internal(value);

    return {
        _internal: {
            tree
        },
        get_value: (path) => _get_node_value(tree, path),
        set_value: (path, value) => { _set_node_value(tree, path, value); },
        get_node: (path) => _get_node_handle(tree, path)
    };
}

export { make_tree };

