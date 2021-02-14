import { config } from "caip-api";

export const DEFAULT_CHAINS = Object.keys(config.eip155).map((x) => `eip155:${x}`);

export const DEFAULT_RELAY_PROVIDER = "wss://staging.walletconnect.org";

export const DEFAULT_APP_METADATA = {
  name: "Example Dapp",
  description: "Example Dapp for WalletConnect",
  url: "https://walletconnect.org/",
  icons: ["https://walletconnect.org/walletconnect-logo.png"],
};
