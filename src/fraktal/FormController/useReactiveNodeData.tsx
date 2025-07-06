

import { useCallback, useEffect, useState } from 'react';
import type { ReactiveNodeGetOnly, ReactiveNodeData } from '../lokta/tree';

export function identity<T>(v: T): T {
  return v;
}

interface Props<NV extends ReactiveNodeData, Out> {
  node: ReactiveNodeGetOnly<NV>,
  child: boolean;
  transform: (v: NV) => Out;
}

export function useReactiveNodeData<NV extends ReactiveNodeData, Out>({
  node,
  child,
  transform
}: Props<NV, Out>): Out {
  const getNodeData = useCallback(() => transform(node.get_data()), [node, transform]);

  const [nodeData, setNodeData] = useState<Out>(getNodeData());

  useEffect(() => {
    const listener = node.add_listener(child, {
      on_events: (events) => {
        const value_events = events.filter(e => e.type === "node_data_change");

        if (value_events.length) {
          if (child) {
            setNodeData(getNodeData());

            return;
          }

          for (const e of value_events) {
            if (e.string_path === node.string_path) {
              setNodeData(getNodeData());
            }
          }
        }
      }
    })

    return () => {
      node.rem_listener(listener);
    };
  }, [child, getNodeData, node]
  );

  return nodeData;
};
