import { describe, expect, test } from 'vitest';
import { make_tree, type TreeValue, type Tree } from './tree';
import type { GetType, Path, SetType } from './types';

interface User {
    name: string;
}

interface Rating {
    value: number;
    content: string;
    user: User;
}

interface Article {
    name: string;
    price: number;
    meta: unknown;
    meta2: any;
    ratings: Rating[];
}

interface FormValue1 {
    articles: Article[];
}

type all_path_that_accept_setting_a_string = Path<FormValue1, SetType<string>>;


type all_path_that_accept_setting_a_string2 = Path<string, SetType<string>>;







type all_path_that_accept_getting_a_string = Path<FormValue1, GetType<string>>;

type all_path_that_accept_getting_a_string2 = Path<string, GetType<string>>;

describe('test_tree', () => {
    test('value updating', () => {
        const original_value = {
            articles: [{
                name: "Pikachu Plush",
                price: 10,
                ratings: [{
                    content: "Beautiful",
                    value: 5,
                    user: {
                        name: "Swann"
                    }
                },
                {
                    content: "Ugly",
                    value: 0,
                    user: {
                        name: "Gwen"
                    }
                }]
            },
            {
                name: "Raichu Plush",
                price: 10,
                ratings: [{
                    content: "Pikachu Better",
                    value: 4,
                    user: {
                        name: "Oscar"
                    }
                },
                {
                    content: "Insane",
                    value: 5,
                    user: {
                        name: "Alex"
                    }
                }]
            }]
        }

        const tree = make_tree<FormValue1>(original_value);

        const node = tree.get_node(".articles.1");

        node.get_node(".name")

        let events: {
            type: "child" | "own", listener_string_path: string, target_string_path: string, old_value: unknown, new_value: unknown
        }[] = [];

        const make_events_listener = <TD extends TreeValue, NP extends Path<TD>>(tree: Tree<TD>, path: NP, listen_to_child: boolean) => {
            const node = tree.get_node(path);

            const known_value: Record<string, any> = {};

            return node.add_listener(listen_to_child, {
                on_events(new_events) {
                    for (const e of new_events) {
                        const type = e.string_path === path ? "own" : "child";

                        const old_value = e.string_path in known_value ? known_value[e.string_path] : e.old_value;
                        const new_value = tree.get_node(e.string_path).get_value();

                        if (new_value !== e.new_value) {
                            throw new Error("tf");
                        }

                        events.push({
                            type,
                            listener_string_path: path,
                            target_string_path: e.string_path,
                            old_value,
                            new_value
                        })
                    }
                },
            })
        }

        const l2 = make_events_listener(tree, ".articles.0", true);
        const l1 = make_events_listener(tree, ".articles", true);
        const l3 = make_events_listener(tree, ".articles.1", true);
        const l4 = make_events_listener(tree, ".articles.0.name", true);
        const l5 = make_events_listener(tree, "", true);

        expect(tree._internal.tree.nodes[".articles.0.name"].parent).toBe(tree._internal.tree.nodes[".articles.0"]);
        expect(tree._internal.tree.nodes[".articles.0"].parent).toBe(tree._internal.tree.nodes[".articles"]);
        expect(tree._internal.tree.nodes[".articles.1"].parent).toBe(tree._internal.tree.nodes[".articles"]);
        expect(tree._internal.tree.nodes[".articles"].parent).toBe(tree._internal.tree.nodes[""]);

        expect(tree._internal.tree.nodes[""].childs.map(c => c.string_path)).toEqual([".articles"]);
        expect(tree._internal.tree.nodes[".articles.0"].childs.map(c => c.string_path)).toEqual([".articles.0.name"]);

        expect(tree._internal.tree.nodes[".articles"].childs.map(c => c.string_path)).toEqual([".articles.0", ".articles.1"]);

        expect(tree.get_value("")).toBe(original_value);
        expect(tree.get_value(".articles")).toBe(original_value.articles);
        expect(tree.get_value(".articles.0")).toBe(original_value.articles[0]);
        expect(tree.get_value(".articles.0.name")).toBe(original_value.articles[0].name);

        tree.set_value(".articles.0.name", 'Pika Plush');

        expect(tree.get_value(".articles.0")).toBe(original_value.articles[0]);
        expect(tree.get_value(".articles.0.name")).toBe("Pika Plush");


        const a = tree.get_node(".articles");
        const a0 = a.get_node(".0");
        const nn = a0.get_node(".name")

        const v2 = nn.get_value();

        expect(v2).toBe("Pika Plush");

        const x = tree.get_node(".articles").get_node(".0").get_value();

        expect(x).toEqual({
            name: "Pika Plush",
            price: 10,
            ratings: [{
                content: "Beautiful",
                value: 5,
                user: {
                    name: "Swann"
                }
            },
            {
                content: "Ugly",
                value: 0,
                user: {
                    name: "Gwen"
                }
            }]
        });

        expect(events.length).toBe(4);

        expect(events[0]).toEqual({
            type: "child",
            listener_string_path: "",
            target_string_path: ".articles.0.name",
            old_value: "Pikachu Plush",
            new_value: "Pika Plush"
        });

        expect(events[1]).toEqual({
            type: "child",
            listener_string_path: ".articles",
            target_string_path: ".articles.0.name",
            old_value: "Pikachu Plush",
            new_value: "Pika Plush"
        });

        expect(events[2]).toEqual({
            type: "child",
            listener_string_path: ".articles.0",
            target_string_path: ".articles.0.name",
            old_value: "Pikachu Plush",
            new_value: "Pika Plush"
        });

        expect(events[3]).toEqual({
            type: "own",
            listener_string_path: ".articles.0.name",
            target_string_path: ".articles.0.name",
            old_value: "Pikachu Plush",
            new_value: "Pika Plush"
        });

        events = [];

        tree.get_node(".articles.0").rem_listener(l2);

        tree.set_value(".articles.0.name", 'Pika');

        expect(events.length).toBe(3);

        expect(events[0]).toEqual({
            type: "child",
            listener_string_path: "",
            target_string_path: ".articles.0.name",
            old_value: "Pika Plush",
            new_value: "Pika"
        });

        expect(events[1]).toEqual({
            type: "child",
            listener_string_path: ".articles",
            target_string_path: ".articles.0.name",
            old_value: "Pika Plush",
            new_value: "Pika"
        });

        expect(events[2]).toEqual({
            type: "own",
            listener_string_path: ".articles.0.name",
            target_string_path: ".articles.0.name",
            old_value: "Pika Plush",
            new_value: "Pika"
        });

        events = [];

        const l21 = make_events_listener(tree, ".articles.0", false);

        tree.set_value(".articles.0.name", 'Pi')

        expect(events.length).toBe(3);

        expect(events[0]).toEqual({
            type: "child",
            listener_string_path: "",
            target_string_path: ".articles.0.name",
            old_value: "Pika",
            new_value: "Pi"
        });

        expect(events[1]).toEqual({
            type: "child",
            listener_string_path: ".articles",
            target_string_path: ".articles.0.name",
            old_value: "Pika",
            new_value: "Pi"
        });

        expect(events[2]).toEqual({
            type: "own",
            listener_string_path: ".articles.0.name",
            target_string_path: ".articles.0.name",
            old_value: "Pika",
            new_value: "Pi"
        });

        events = [];

        tree.set_value(".articles.0", {
            name: "Bulbasaur Plush",
            price: 12,
            ratings: [{
                content: "Cringe",
                value: 4,
                user: {
                    name: "Oscar"
                }
            },]
        })

        expect(events.length).toBe(3);

        expect(events[0]).toEqual({
            type: "child",
            listener_string_path: "",
            target_string_path: ".articles.0",
            old_value: {
                name: "Pi",
                price: 10,
                ratings: [{
                    content: "Beautiful",
                    value: 5,
                    user: {
                        name: "Swann"
                    }
                },
                {
                    content: "Ugly",
                    value: 0,
                    user: {
                        name: "Gwen"
                    }
                }]
            },
            new_value: {
                name: "Bulbasaur Plush",
                price: 12,
                ratings: [{
                    content: "Cringe",
                    value: 4,
                    user: {
                        name: "Oscar"
                    }
                },]
            }
        });

        expect(events[1]).toEqual({
            type: "child",
            listener_string_path: ".articles",
            target_string_path: ".articles.0",
            old_value: {
                name: "Pi",
                price: 10,
                ratings: [{
                    content: "Beautiful",
                    value: 5,
                    user: {
                        name: "Swann"
                    }
                },
                {
                    content: "Ugly",
                    value: 0,
                    user: {
                        name: "Gwen"
                    }
                }]
            },
            new_value: {
                name: "Bulbasaur Plush",
                price: 12,
                ratings: [{
                    content: "Cringe",
                    value: 4,
                    user: {
                        name: "Oscar"
                    }
                },]
            }
        });

        expect(events[2]).toEqual({
            type: "own",
            listener_string_path: ".articles.0",
            target_string_path: ".articles.0",
            old_value: {
                name: "Pi",
                price: 10,
                ratings: [{
                    content: "Beautiful",
                    value: 5,
                    user: {
                        name: "Swann"
                    }
                },
                {
                    content: "Ugly",
                    value: 0,
                    user: {
                        name: "Gwen"
                    }
                }]
            },
            new_value: {
                name: "Bulbasaur Plush",
                price: 12,
                ratings: [{
                    content: "Cringe",
                    value: 4,
                    user: {
                        name: "Oscar"
                    }
                },]
            }
        });
    });
});