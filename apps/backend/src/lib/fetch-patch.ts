import * as https from "node:https";
import * as k8s from "@kubernetes/client-node";
import { Agent as UndiciAgent } from "undici";

let clientCert: string | undefined;
let clientKey: string | undefined;
let caCert: string | undefined;

try {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const user = kc.getCurrentUser();
  const cluster = kc.getCurrentCluster();

  if (user?.certData) {
    clientCert = Buffer.from(user.certData, "base64").toString();
  }
  if (user?.keyData) {
    clientKey = Buffer.from(user.keyData, "base64").toString();
  }
  if (cluster?.caData) {
    caCert = Buffer.from(cluster.caData, "base64").toString();
  }

  if (clientCert && clientKey) {
    const OriginalAgent = https.Agent;
    type UndiciOptions = ConstructorParameters<typeof UndiciAgent>[0];
    const httpsModule = https as typeof https & { Agent: typeof https.Agent };

    httpsModule.Agent = class PatchedAgent extends OriginalAgent {
      constructor(options?: https.AgentOptions) {
        super(options);

        const undiciOptions: UndiciOptions = {
          connect: {
            cert: clientCert,
            key: clientKey,
            ca: caCert,
            rejectUnauthorized: process.env.KUBERNETES_SKIP_TLS_VERIFY !== "true",
          },
        };

        const patched = this as unknown as { _undiciAgent?: UndiciAgent };
        patched._undiciAgent = new UndiciAgent(undiciOptions);
      }
    };

    console.log("Patched https.Agent to use undici with client certificates");
  }
} catch (err) {
  console.warn("Failed to patch https.Agent for Kubernetes:", err);
}
