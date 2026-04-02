import { createRootRoute } from "@tanstack/react-router";
import { GrpProvider } from "../context/grp-context";
import { Layout } from "../components/layout";

export const Route = createRootRoute({
  component: () => (
    <GrpProvider>
      <Layout />
    </GrpProvider>
  ),
});
