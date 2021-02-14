import * as encUtils from "enc-utils";
import * as React from "react";
import styled from "styled-components";

import WalletConnectClient, { CLIENT_EVENTS } from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { getSessionMetadata } from "@walletconnect/utils";

import AccountAssets from "./components/AccountAssets";
import Banner from "./components/Banner";
import Blockchain from "./components/Blockchain";
import Button from "./components/Button";
import Column from "./components/Column";
import Header from "./components/Header";
import Loader from "./components/Loader";
import Modal from "./components/Modal";
import Wrapper from "./components/Wrapper";
import { DEFAULT_APP_METADATA, DEFAULT_CHAINS, DEFAULT_RELAY_PROVIDER } from "./constants";
import { ETHEREUM_SIGNING_METHODS } from "./constants/ethereum";
import {
  apiGetAccountAssets,
  AssetData,
  getChainData,
  hashPersonalMessage,
  verifySignature,
} from "./helpers";
import { fonts } from "./styles";

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper as any)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column as any)`
  height: 600px;
`;

const SButtonContainer = styled(Column as any)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

// @ts-ignore
const SBalances = styled(SLanding as any)`
  height: 100%;
  padding-bottom: 30px;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer as any)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

const SFullWidthContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const STestButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SBlockchainContainer = styled(SFullWidthContainer)`
  justify-content: space-between;
  & > div {
    margin: 12px 0;
    flex: 1 0 100%;
    @media (min-width: 648px) {
      flex: 0 1 48%;
    }
  }
`;

const SBlockchainChildrenContainer = styled(SFullWidthContainer)`
  flex-direction: column;
`;

interface AppState {
  client: WalletConnectClient | undefined;
  session: SessionTypes.Settled | undefined;
  fetching: boolean;
  connected: boolean;
  chains: string[];
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  result: any | undefined;
  assets: AssetData[];
}

const INITIAL_STATE: AppState = {
  client: undefined,
  session: undefined,
  fetching: false,
  connected: false,
  chains: [],
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  result: undefined,
  assets: [],
};

class App extends React.Component<any, any> {
  public state: AppState = {
    ...INITIAL_STATE,
  };
  public componentDidMount() {
    this.init();
  }

  public init = async () => {
    const client = await WalletConnectClient.init({
      relayProvider: DEFAULT_RELAY_PROVIDER,
    });

    this.setState({ client });
    this.subscribeToEvents();
    await this.checkConnectedSessions();
  };

  public subscribeToEvents = () => {
    if (typeof this.state.client === "undefined") {
      return;
    }

    this.state.client.on(
      CLIENT_EVENTS.pairing.proposal,
      async (proposal: PairingTypes.Proposal) => {
        const { uri } = proposal.signal.params;
        this.setState({ uri });
        QRCodeModal.open(uri, () => {
          console.log("Modal callback");
        });
      },
    );

    this.state.client.on(CLIENT_EVENTS.session.deleted, (session: SessionTypes.Settled) => {
      if (session.topic !== this.state.session?.topic) return;
      console.log("EVENT", "session_deleted");
      this.resetApp();
    });
  };

  public checkConnectedSessions = async () => {
    if (typeof this.state.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof this.state.session !== "undefined") return;
    if (this.state.client.session.topics.length) {
      const session = await this.state.client.session.get(this.state.client.session.topics[0]);
      const chains = session.state.accounts.map((account) => account.split("@")[1]);
      this.setState({ accounts: session.state.accounts, chains });
      this.onSessionConnected(session);
    }
  };

  public connect = async () => {
    if (typeof this.state.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    const session = await this.state.client.connect({
      metadata: getSessionMetadata() || DEFAULT_APP_METADATA,
      permissions: {
        blockchain: {
          chains: this.state.chains,
        },
        jsonrpc: {
          methods: ETHEREUM_SIGNING_METHODS,
        },
      },
    });
    QRCodeModal.close();
    this.onSessionConnected(session);
  };

  public disconnect = async () => {
    if (typeof this.state.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof this.state.session === "undefined") {
      throw new Error("Session is not connected");
    }
    await this.state.client.disconnect({
      topic: this.state.session.topic,
      reason: "User disconnected session",
    });
  };

  public resetApp = async () => {
    const { client } = this.state;
    this.setState({ ...INITIAL_STATE, client });
  };

  public onSessionConnected = async (session: SessionTypes.Settled) => {
    this.setState({ session, connected: true });
    this.onSessionUpdate(session.state.accounts, session.permissions.blockchain.chains);
  };

  public onSessionUpdate = async (accounts: string[], chains: string[]) => {
    this.setState({ chains, accounts });
    await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    this.setState({ fetching: true });
    try {
      // get addresses and assets
      const assetsPromises = this.state.accounts.map((account) => {
        const [address, chain] = account.split("@");
        return apiGetAccountAssets(address, chain);
      });

      // while we get goerli to work on the api
      const assets = (await Promise.allSettled(assetsPromises)).reduce(
        (assets, result) => (result.status === "fulfilled" ? assets.concat(result.value) : assets),
        [] as AssetData[],
      );
      this.setState({ fetching: false, assets });
    } catch (error) {
      console.error(error);
      this.setState({ fetching: false });
    }
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testSendTransaction = async () => {
    throw new Error("eth_sendTransaction is not implemented yet");
  };

  public testSignPersonalMessage = async (chain: string) => {
    if (typeof this.state.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof this.state.session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      // test message
      const message = `My email is john@doe.com - ${Date.now()}`;

      // encode message (hex)
      const hexMsg = encUtils.utf8ToHex(message, true);

      // get ethereum address
      const address = this.state.accounts.find((account) => account.endsWith(chain))?.split("@")[0];
      if (address === undefined) throw new Error("Address is not valid");

      // personal_sign params
      const params = [hexMsg, address];

      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await this.state.client.request({
        topic: this.state.session.topic,
        chainId: chain,
        request: {
          method: "personal_sign",
          params,
        },
      });

      //  get chainId
      const chainId = Number(chain.split(":")[1]);

      // verify signature
      const hash = hashPersonalMessage(message);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        valid,
        result,
      };

      // display result
      this.setState({ pendingRequest: false, result: formattedResult || null });
    } catch (error) {
      console.error(error);
      this.setState({ pendingRequest: false, result: null });
    }
  };

  public testSignTypedData = async () => {
    throw new Error("eth_signTypedData is not implemented yet");
  };

  public handleChainSelectionClick = (chainId: string) => {
    const { chains } = this.state;
    if (chains.includes(chainId)) {
      this.setState({ chains: chains.filter((chain) => chain !== chainId) });
    } else {
      this.setState({ chains: [...chains, chainId] });
    }
  };

  public render = () => {
    const {
      assets,
      accounts,
      connected,
      chains,
      fetching,
      showModal,
      pendingRequest,
      result,
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            disconnect={this.disconnect}
            connected={connected}
            chainIds={chains}
            accounts={accounts}
          />
          <SContent>
            {!accounts.length && !assets.length ? (
              <SLanding center>
                <h3>
                  {`Try out WalletConnect`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <h6>Select chains:</h6>
                  {DEFAULT_CHAINS.map((chain) => (
                    <Blockchain
                      key={chain}
                      chainId={chain}
                      onClick={this.handleChainSelectionClick}
                      active={chains.includes(chain)}
                    />
                  ))}
                  <SConnectButton
                    left
                    onClick={this.connect}
                    fetching={fetching}
                    disabled={!chains.length}
                  >
                    {"Connect to WalletConnect"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Connected networks</h3>
                <SBlockchainContainer>
                  {this.state.chains.map((chain) => (
                    <Blockchain
                      key={chain}
                      address={accounts.find((account) => account.endsWith(chain))?.split("@")[0]}
                      chainId={chain}
                      active={chains.includes(chain)}
                      children={
                        <SBlockchainChildrenContainer>
                          <SFullWidthContainer>
                            <STestButton left onClick={this.testSendTransaction}>
                              {"eth_sendTransaction"}
                            </STestButton>

                            <STestButton left onClick={() => this.testSignPersonalMessage(chain)}>
                              {"personal_sign"}
                            </STestButton>

                            <STestButton left onClick={this.testSignTypedData}>
                              {"eth_signTypedData"}
                            </STestButton>
                          </SFullWidthContainer>
                          {!fetching ? (
                            // temporary, will not work for all networks
                            <AccountAssets
                              chainId={Number(chain.split(":")[1])}
                              assets={assets.filter(
                                (asset) =>
                                  asset.symbol.toLowerCase() ===
                                  getChainData(Number(chain.split(":")[1])).short_name,
                              )}
                            />
                          ) : (
                            <Column center>
                              <SContainer>
                                <Loader />
                              </SContainer>
                            </Column>
                          )}
                        </SBlockchainChildrenContainer>
                      }
                    />
                  ))}
                </SBlockchainContainer>
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map((key) => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
      </SLayout>
    );
  };
}

export default App;
