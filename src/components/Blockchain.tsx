import React, { PropsWithChildren, FC } from "react";
import styled from "styled-components";

import { getChainMetadata } from "../chains";
import { ellipseAddress } from "../helpers";

interface AccountStyleProps {
  color: string;
}

const SAccount = styled.div<AccountStyleProps>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-radius: 8px;
  padding: 8px;
  margin: 5px 0;
  border: ${({ color }) => `2px solid rgb(${color})`};
  &.active {
    box-shadow: ${({ color }) => `0 0 8px rgb(${color})`};
  }
`;

const SChain = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  & p {
    font-weight: 600;
  }
  & img {
    border-radius: 50%;
    width: 35px;
    height: 35px;
    margin-right: 10px;
  }
`;

interface BlockchainProps {
  chainId: string;
  address?: string;
  onClick?: (chain: string) => void;
  active?: boolean;
}

const Blockchain: FC<PropsWithChildren<BlockchainProps>> = (
  props: PropsWithChildren<BlockchainProps>,
) => {
  const { chainId, address, onClick, active } = props;
  const chainMeta = getChainMetadata(chainId);
  return (
    <React.Fragment>
      <SAccount
        color={chainMeta.color}
        onClick={() => onClick && onClick(props.chainId)}
        className={active ? "active" : ""}
      >
        <SChain>
          <img src={chainMeta.logo} alt={chainMeta.name} />
          <p>{chainMeta.name}</p>
        </SChain>
        {!!address && <p>{ellipseAddress(address)}</p>}
        {props.children}
      </SAccount>
    </React.Fragment>
  );
};
export default Blockchain;
