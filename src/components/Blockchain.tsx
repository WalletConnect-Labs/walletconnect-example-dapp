import React, { PropsWithChildren, FC } from "react";
import styled from "styled-components";

import AssetList from "./AssetList";
import Button from "./Button";
import Column from "./Column";
import Loader from "./Loader";

import { getChainMetadata } from "../chains";
import { getAssetsByChainId, AccountAction, AssetData, ellipseAddress } from "../helpers";
import { fonts } from "../styles";

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

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SFullWidthContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const SAction = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
  background-color: ${({ color }) => `rgb(${color})`};
`;

const SBlockchainChildrenContainer = styled(SFullWidthContainer)`
  flex-direction: column;
`;

interface BlockchainProps {
  fetching?: boolean;
  active?: boolean;
  chainId: string;
  address?: string;
  onClick?: (chain: string) => void;
  assets?: AssetData[];
  actions?: AccountAction[];
}

const Blockchain: FC<PropsWithChildren<BlockchainProps>> = (
  props: PropsWithChildren<BlockchainProps>,
) => {
  const { chainId, address, onClick, active, actions, assets, fetching } = props;
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
        <SBlockchainChildrenContainer>
          {fetching ? (
            <Column center>
              <SContainer>
                <Loader />
              </SContainer>
            </Column>
          ) : (
            <>
              {!!assets && assets.length ? (
                <SFullWidthContainer>
                  <h6>Balances</h6>
                  <AssetList
                    chainId={Number(chainId.split(":")[1])}
                    assets={getAssetsByChainId(assets, chainId)}
                  />
                </SFullWidthContainer>
              ) : null}
              {!!actions && actions.length ? (
                <SFullWidthContainer>
                  <h6>Methods</h6>
                  {actions.map((action) => (
                    <SAction left color={chainMeta.color} onClick={() => action.callback(chainId)}>
                      {action.method}
                    </SAction>
                  ))}
                </SFullWidthContainer>
              ) : null}
            </>
          )}
        </SBlockchainChildrenContainer>
      </SAccount>
    </React.Fragment>
  );
};
export default Blockchain;
