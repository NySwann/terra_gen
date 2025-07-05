import './App.css'
import "@mantine/core/styles.css";
import { AppShell, Flex, MantineProvider, Text } from '@mantine/core';
import { theme } from '../theme';
import { Navbar } from '../components/shell/Navbar/Navbar';
import { Aside } from '@/components/shell/Aside/Aside';
import z from 'zod';
import { useForm } from '../fraktal/FormController';
import { zodResolver } from '../fraktal/FormController/zodResolver';
import { FormInputText } from '../fraktal/FormController/FormInputText';
import { FormDisplayJson } from '../fraktal/FormController/FormDisplayJson';
import type { GetOnlyNode, Tree, Node } from '../fraktal/lokta/tree';

const address_schema = z.object({
  country: z.string(),
  city: z.string(),
  postal_code: z.string(),
  street: z.string(),
})

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

const t: Tree<User>;

const a = t.get_node(".address.country");

type g = (typeof a)["get_node"];

let b: GetOnlyNode;

let c: Node<User, User, "">;

b = c;

function FormApp() {
  const formHandle = useForm<User>({
    defaultValues: {

    }
  })

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
        <FormInputText node={formHandle._internal.tree.get_node(".username")} />
        <FormDisplayJson node={formHandle._internal.tree.get_node("")} />
      </AppShell.Main>
      <Aside />
      <AppShell.Footer style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text id="display-fps">Zouin</Text>
      </AppShell.Footer>
    </AppShell>
  </MantineProvider>
}

export default FormApp
