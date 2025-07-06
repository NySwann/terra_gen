

import { useEffect, useState } from 'react';
import type { ReactiveNodeGetOnly, ReactiveNodeData, ReactiveNodeMeta } from '../lokta/tree';

export function identity<T>(v: T): T {
  return v;
}

interface Props<NV extends ReactiveNodeData, NM extends ReactiveNodeMeta> {
  node: ReactiveNodeGetOnly<NV, NM>,
}

export function useReactiveNodeMeta<NV extends ReactiveNodeData, NM extends ReactiveNodeMeta>({
  node,
}: Props<NV, NM>): NM {
  const [nodeMeta, setNodeMeta] = useState<NM>(node.get_meta());

  useEffect(() => {
    const listener = node.add_listener(false, {
      on_events: (events) => {
        const meta_events = events.filter(e => e.type === "node_meta_change" && e.string_path === node.string_path);

        if (meta_events.length) {
          console.log(meta_events);
          console.log(node.get_meta());

          setNodeMeta(node.get_meta());
        }
      }
    })

    return () => {
      node.rem_listener(listener);
    };
  }, [node]
  );

  return nodeMeta;
};
