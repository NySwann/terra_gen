import { Paper, Stack } from '@mantine/core';
import type { ReactiveNode } from '../lokta/tree';
import { z } from 'zod';
import type { InputFieldBaseProps } from './InputFieldBase';
import { InputFieldSelect } from './InputFieldSelect';
import { InputFieldText } from './InputFieldText';
import { InputFieldNumber } from './InputFieldNumber';

const Country = ["France", "United States"] as const;
type Country = (typeof Country)[number];

export const address_schema = z.object({
  country: z.enum(Country),
  city: z.string().min(2),
  postal_code: z.number(),
  street: z.string().min(2),
})

export type Address = z.infer<typeof address_schema>;

interface Props extends InputFieldBaseProps {
  node: ReactiveNode<Address, { error: string } | undefined>;
}

function InputFieldAddress({
  node,
  label
}: Props) {
  return <Paper withBorder p="md">
    <Stack>
      <h1>{label ?? node.string_path}</h1>
      <InputFieldSelect node={node.get_node(".country")} options={Country} />
      <InputFieldText node={node.get_node(".city")} />
      <InputFieldNumber node={node.get_node(".postal_code")} />
      <InputFieldText node={node.get_node(".street")} />
    </Stack>
  </Paper>
};

export { InputFieldAddress };

