import { Paper, Stack } from '@mantine/core';
import type { Node } from '../lokta/tree';
import { z } from 'zod';
import { FormInputText } from './FormInputText';
import { FormInputNumber } from './FormInputNumber';
import { FormInputSelect } from './FormInputSelect';
import type { FormInputBaseProps } from './FormInputBase';

const Country = ["France", "United States"] as const;
type Country = (typeof Country)[number];

export const address_schema = z.object({
  country: z.enum(Country),
  city: z.string().min(2),
  postal_code: z.number(),
  street: z.string().min(2),
})

export type Address = z.infer<typeof address_schema>;

interface Props extends FormInputBaseProps {
  node: Node<Address>;
}

function FormInputAddress({
  node,
  label
}: Props) {
  return <Paper withBorder p="md">
    <Stack>
      <h1>{label ?? node.string_path}</h1>
      <FormInputSelect node={node.get_node(".country")} options={Country} />
      <FormInputText node={node.get_node(".city")} />
      <FormInputNumber node={node.get_node(".postal_code")} />
      <FormInputText node={node.get_node(".street")} />
    </Stack>
  </Paper>
};

export { FormInputAddress };

