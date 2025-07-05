

import { useCallback, useEffect, useState } from 'react';
import type { GetOnlyNode, NodeValue } from '../lokta/tree';

interface UseNodeValueProps<NV extends NodeValue> {
  nodeHandle: GetOnlyNode<NV>,
  child: boolean;
}

export const useNodeValue = <NV extends NodeValue>({
  nodeHandle,
  child
}: UseNodeValueProps<NV>): NV => {
  const getValue = useCallback(() => nodeHandle.get_value(), [nodeHandle]);

  const [value, setValue] = useState<NV>(getValue());

  useEffect(() => {
    setValue(getValue());

    const listener = nodeHandle.add_listener(child, {
      on_events: (events) => {
        if (child) {
          setValue(getValue());

          return;
        }

        for (const e of events) {
          if (e.string_path === nodeHandle.string_path) {
            setValue(getValue());
          }
        }
      }
    })

    return () => { nodeHandle.rem_listener(listener); };
  }, [child, getValue, nodeHandle]
  );

  return value;
};
