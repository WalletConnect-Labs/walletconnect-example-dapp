import * as React from "react";
import styled from "styled-components";
import * as encUtils from "enc-utils";
import QRCodeModal from "@walletconnect/qrcode-modal";
import WalletConnectClient, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";

import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import Banner from "./components/Banner";
import AccountAssets from "./components/AccountAssets";

import { DEFAULT_CHAIN_ID, DEFAULT_RELAY_PROVIDER } from "./constants";
import { apiGetAccountAssets, AssetData, hashPersonalMessage, verifySignature } from "./helpers";

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
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

const STestButtonContainer = styled.div`
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
  max-width: 175px;
  margin: 12px;
`;

interface AppState {
  client: WalletConnectClient | undefined;
  session: SessionTypes.Settled | undefined;
  fetching: boolean;
  connected: boolean;
  chainId: string;
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  address: string;
  result: any | undefined;
  assets: AssetData[];
}

const INITIAL_STATE: AppState = {
  client: undefined,
  session: undefined,
  fetching: false,
  connected: false,
  chainId: DEFAULT_CHAIN_ID,
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "",
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
    await this.subscribeToEvents();
  };

  public subscribeToEvents = async () => {
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

    this.state.client.on(CLIENT_EVENTS.session.created, () => {
      console.log("EVENT", "session_created");
      this.setState({ connected: true });
    });

    this.state.client.on(CLIENT_EVENTS.session.deleted, () => {
      console.log("EVENT", "session_deleted");
      this.resetApp();
    });
  };

  public connect = async () => {
    if (typeof this.state.client !== "undefined") {
      const session = await this.state.client.connect({
        metadata: {
          name: "Example Dapp",
          description: "Example Dapp",
          url: "https://walletconnect.org/",
          icons: ["https://walletconnect.org/walletconnect-logo.png"],
        },
        permissions: {
          blockchain: {
            chains: [this.state.chainId],
          },
          jsonrpc: {
            methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
          },
        },
      });
      QRCodeModal.close();
      this.setState({ session });
      this.onSessionUpdate(session.state.accounts, this.state.chainId);
    }
  };

  public disconnect = async () => {
    if (typeof this.state.client !== "undefined") {
      // fix: send a reason
      this.state.client.disconnect({ reason: "", topic: this.state.session?.topic || "" });
    }
    this.resetApp();
  };

  public resetApp = async () => {
    this.setState({ ...INITIAL_STATE });
    this.init();
  };

  public onSessionUpdate = async (accounts: string[], chainId: string) => {
    const address = accounts[0];
    this.setState({ chainId, accounts, address });
    await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      this.setState({ fetching: false, assets });
    } catch (error) {
      console.error(error);
      this.setState({ fetching: false });
    }
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testSendTransaction = async () => {
    console.log("Send Transaction");
  };

  public testSignPersonalMessage = async () => {
    // const { client, session } = this.state;
    if (typeof this.state.client !== "undefined" && typeof this.state.session !== "undefined") {
      try {
        // test message
        const message = "My email is john@doe.com - 1537836206101";

        // encode message (hex)
        const hexMsg = encUtils.utf8ToHex(message, true);

        // get ethereum address
        const address = this.state.address.split("@")[0];

        // personal_sign params
        const params = [address, hexMsg];

        // open modal
        this.toggleModal();

        // toggle pending request indicator
        this.setState({ pendingRequest: true });

        // send message

        const result = await this.state.client.request({
          topic: this.state.session.topic,
          chainId: "eip155:1",
          request: {
            method: "personal_sign",
            params,
          },
        });

        //  get ethereum chainId
        const chainId = Number(this.state.chainId.split(":")[1]);

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
    }
  };

  public testSignTypedData = async () => {
    console.log("Sign typed data");
  };

  public render = () => {
    const {
      assets,
      accounts,
      connected,
      chainId,
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
            chainId={chainId}
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
                  <SConnectButton left onClick={this.connect} fetching={fetching}>
                    {"Connect to WalletConnect"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Actions</h3>
                <Column center>
                  <STestButtonContainer>
                    <STestButton left onClick={this.testSendTransaction}>
                      {"eth_sendTransaction"}
                    </STestButton>

                    <STestButton left onClick={this.testSignPersonalMessage}>
                      {"personal_sign"}
                    </STestButton>

                    <STestButton left onClick={this.testSignTypedData}>
                      {"eth_signTypedData"}
                    </STestButton>
                  </STestButtonContainer>
                </Column>
                <h3>Balances</h3>
                {!fetching ? (
                  <AccountAssets chainId={chainId} assets={assets} />
                ) : (
                  <Column center>
                    <SContainer>
                      <Loader />
                    </SContainer>
                  </Column>
                )}
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
                {Object.keys(result).map(key => (
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
