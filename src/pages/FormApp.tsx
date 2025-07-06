import './App.css'
import "@mantine/core/styles.css";

import { AppShell, Group, JsonInput, MantineProvider, Stack, Text } from '@mantine/core';
import type { Node } from '../fraktal/lokta/tree'; // Update the path as needed based on your project structure
import { theme } from '../theme';
import { Navbar } from '../components/shell/Navbar/Navbar';
import z from 'zod';
import { useForm } from '../fraktal/FormController';
import { FormInputText } from '../fraktal/FormController/FormInputText';
import { FormDisplayJson } from '../fraktal/FormController/FormDisplayJson';
import { Aside } from '../components/shell/Aside/Aside';
import { address_schema, FormInputAddress } from '../fraktal/FormController/FormInputAddress';
import { useNodeValue } from '../fraktal/FormController/useNodeValue';

const birth_schema = z.object({
  address: address_schema,
  date: z.date(),
});

const denomination_schema = z.object({
  title: z.enum(["Dr.", "none"]),
  gender: z.enum(["male", "female", "unknown"]),
  firstname: z.string(),
  lastname: z.string(),
})

const contact_schema = z.object({
  denomination: denomination_schema,
  email: z.string(),
  phone: z.string()
})

const user_schema = z.object({
  username: z.string(),
  age: z.number(),
  contact: contact_schema,
  birth: birth_schema,
  address: address_schema,
});

type User = z.infer<typeof user_schema>;

function FormContent({ node }: { node: Node<User> }) {
  const globalValue = useNodeValue({ node: node, child: true, transform: (v => structuredClone(v)) });

  const result = address_schema.safeParse(globalValue.address);

  const errors = {};

  if (result.error) {
    const issues = result.error.issues;

    issues.forEach(i => {
      if (i.path.length) {
        const path = ".address." + i.path.join(".");
        errors[path] = i.message;

        console.log(path);
        node.get_node(path).set_error({ message: i.message });
      }
    }
    )
  }

  return <Stack w={1000} h={1000} >
    <FormInputAddress node={node.get_node(".address")} />
    <FormDisplayJson node={node.get_node("")} />
    {result.error && <><JsonInput autosize minRows={4} minLength={200} value={JSON.stringify(errors, null, 2)} /></>}
  </Stack>
}

function Form() {
  const formHandle = useForm<User>({
    defaultValues: {

    }
  });

  return <FormContent node={formHandle._internal.tree.get_node("")} />;
}

function FormApp() {
  return <MantineProvider theme={theme} defaultColorScheme='dark'>
    <AppShell
      header={{ height: "4%" }}
      navbar={{
        width: "20%",
        breakpoint: "md"
      }}
      aside={{
        width: "20%",
        breakpoint: "md"
      }}
      footer={{ height: "4%" }}
      padding="md"
    >
      <AppShell.Header style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text>Trixel</Text>
      </AppShell.Header>
      <Navbar />
      <AppShell.Main style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Form />
      </AppShell.Main>
      <Aside />
      <AppShell.Footer style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text id="display-fps">Zouin</Text>
      </AppShell.Footer>
    </AppShell>
  </MantineProvider>
}

export default FormApp
