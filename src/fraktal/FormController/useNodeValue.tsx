

import { useCallback, useEffect, useState } from 'react';
import type { GetOnlyNode, NodeValue } from '../lokta/tree';

interface UseNodeValueProps<NV extends NodeValue> {
  node: GetOnlyNode<NV>,
  child: boolean;
}

export const useNodeValue = <NV extends NodeValue>({
  node,
  child
}: UseNodeValueProps<NV>): NV => {
  const getValue = useCallback(() => node.get_value(), [node]);

  const [value, setValue] = useState<NV>(getValue());

  useEffect(() => {
    setValue(getValue());

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
