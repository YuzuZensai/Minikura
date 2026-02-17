import { K8sNodeComponent } from "./k8s-node";
import { ProxyNode } from "./proxy-node";
import { ServerNode } from "./server-node";

export const nodeTypes = {
  server: ServerNode,
  proxy: ProxyNode,
  "k8s-node": K8sNodeComponent,
};
