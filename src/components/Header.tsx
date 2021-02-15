import * as React from "react";
import styled from "styled-components";
import { getSupportedChains } from "caip-api";

import Blockie from "./Blockie";

import { ellipseAddress } from "../helpers";
import { fonts, responsive, transitions } from "../styles";

const SHeader = styled.div`
  margin-top: -1px;
  margin-bottom: 1px;
  width: 100%;
  height: 100px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  @media screen and (${responsive.sm.max}) {
    font-size: ${fonts.size.small};
  }
`;

const SActiveAccount = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  font-weight: 500;
`;

const SActiveChain = styled(SActiveAccount as any)`
  flex-direction: column;
  text-align: left;
  align-items: flex-start;
  & p {
    font-size: 0.8em;
    margin: 0;
    padding: 0;
  }
  & p:nth-child(n + 2) {
    font-weight: bold;
  }
`;

interface HeaderStyle {
  connected: boolean;
}

const SAddress = styled.p<HeaderStyle>`
  transition: ${transitions.base};
  font-weight: bold;
  margin: ${({ connected }) => (connected ? "-2px auto 0.7em" : "0")};
`;

const SBlockie = styled(Blockie)`
  margin-right: 10px;
`;

const SDisconnect = styled.div<HeaderStyle>`
  transition: ${transitions.button};
  font-size: 12px;
  font-family: monospace;
  position: absolute;
  right: 0;
  top: 20px;
  opacity: 0.7;
  cursor: pointer;

  opacity: ${({ connected }) => (connected ? 1 : 0)};
  visibility: ${({ connected }) => (connected ? "visible" : "hidden")};
  pointer-events: ${({ connected }) => (connected ? "auto" : "none")};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.5;
  }
`;

interface HeaderProps {
  disconnect: () => void;
  connected: boolean;
  accounts: string[];
  chainIds: string[];
}

const Header = (props: HeaderProps) => {
  const { disconnect, connected, accounts, chainIds } = props;
  const supportedChains = getSupportedChains();
  const chainNames = chainIds ? chainIds.map((chainId) => supportedChains[chainId].name) : null;
  const address = accounts.length ? accounts[0].split("@")[0] : undefined;
  return (
    <SHeader {...props}>
      {chainNames && chainNames.length > 0 && (
        <SActiveChain>
          <p>{`Connected to`}</p>
          {chainNames?.map((chainName) => (
            <p key={chainName}>{chainName}</p>
          ))}
        </SActiveChain>
      )}
      {address && (
        <SActiveAccount>
          <SBlockie address={address} />
          <SAddress connected={connected}>{ellipseAddress(address)}</SAddress>
          <SDisconnect connected={connected} onClick={disconnect}>
            {"Disconnect"}
          </SDisconnect>
        </SActiveAccount>
      )}
    </SHeader>
  );
};

export default Header;
