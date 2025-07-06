import { AppShell, MantineProvider, Stack, Text } from '@mantine/core';
import { useEffect } from 'react';
import z from 'zod';
import { Aside } from '../components/shell/Aside/Aside';
import { Navbar } from '../components/shell/Navbar/Navbar';
import { type FormHandle, useForm } from '../fraktal/FormController';
import { address_schema, InputFieldAddress } from '../fraktal/FormController/InputFieldAddress';
import { useReactiveNodeData } from '../fraktal/FormController/useReactiveNodeData';
import type { ReactiveNode } from '../fraktal/lokta/tree';
import { theme } from '../theme';
import './App.css'
import "@mantine/core/styles.css";
import { DisplayFieldJson } from '../fraktal/FormController/DisplayFieldJson';


type Field<T> = ReactiveNode<T, { error: string } | undefined>;

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
  // username: z.string(),
  // age: z.number(),
  // contact: contact_schema,
  // birth: birth_schema,
  address: address_schema,
});

type User = z.infer<typeof user_schema>;

const EMPTY_ERRORS = {};

function zodResolver<T>(schema: z.Schema<T>) {
  return function (values: T): Record<string, string> {
    const result = schema.safeParse(values);

    const errors = {};

    if (result.error) {
      const issues = result.error.issues;

      issues.forEach(i => {
        if (i.path.length) {
          const path = "." + i.path.join(".");

          errors[path] = { error: i.message };
        }
      });

      console.log(errors);

      if (Object.keys(errors).length) {
        return errors;
      }
    }

    return EMPTY_ERRORS;
  }
}

function FormContent({ form, node }: { form: FormHandle<User>, node: Field<User> }) {
  const globalValue = useReactiveNodeData({ node, child: true, transform: (v => structuredClone(v)) });

  useEffect(() => {
    form.save(() => {
      console.log("valid")
    },
      () => {
        console.log("invalid");
      });
  }, [form, form._internal.tree, globalValue]);

  return <Stack w={1000} h={1000} >
    <InputFieldAddress node={node.get_node(".address")} />
    <DisplayFieldJson node={node.get_node("")} />
  </Stack>
}

function Form() {
  const formHandle = useForm<User>({
    defaultValues: {
    },
    validationResolver: zodResolver(user_schema)
  });

  return <FormContent form={formHandle} node={formHandle._internal.tree.get_node("")} />;
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
