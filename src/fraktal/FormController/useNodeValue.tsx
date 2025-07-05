

import { useCallback, useEffect, useState } from 'react';
import type { GetOnlyNode, NodeValue } from '../lokta/tree';

export function identity<T>(v: T): T {
  return v;
}

interface Props<NV extends NodeValue, Out> {
  node: GetOnlyNode<NV>,
  child: boolean;
  transform: (v: NV) => Out;
}

export function useNodeValue<NV extends NodeValue, Out>({
  node,
  child,
  transform
}: Props<NV, Out>): Out {
  const getValue = useCallback(() => transform(node.get_value()), [node, transform]);

  const [value, setValue] = useState<Out>(getValue());

  useEffect(() => {
    const listener = node.add_listener(child, {
      on_events: (events) => {
        if (child) {
          setValue(getValue());

          return;
        }

        for (const e of events) {
          if (e.string_path === node.string_path) {
            setValue(getValue());
          }
        }
      }
    })

    return () => { node.rem_listener(listener); };
  }, [child, getValue, node]
  );

  return value;
};
