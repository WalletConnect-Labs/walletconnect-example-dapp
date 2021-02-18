import * as React from "react";
import styled from "styled-components";

import Icon from "./Icon";
import ERC20Icon from "./ERC20Icon";

import eth from "../assets/eth.svg";
import xdai from "../assets/xdai.png";
import matic from "../assets/matic.png";
import { fromWad } from "../helpers";

const SAssetRow = styled.div`
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
`;
const SAssetRowLeft = styled.div`
  display: flex;
`;
const SAssetName = styled.div`
  display: flex;
  margin-left: 10px;
`;
const SAssetRowRight = styled.div`
  display: flex;
`;
const SAssetBalance = styled.div`
  display: flex;
`;

function getAssetIcon(asset: any) {
  switch (asset.symbol.toLowerCase()) {
    case "eth":
      return eth;
    case "xdai":
      return xdai;
    case "matic":
      return matic;
    default:
      return undefined;
  }
}

const AssetRow = (props: any) => {
  const { asset } = props;
  const icon = getAssetIcon(asset);
  return (
    <SAssetRow {...props}>
      <SAssetRowLeft>
        {icon ? (
          <Icon src={icon} />
        ) : (
          <ERC20Icon contractAddress={asset.contractAddress.toLowerCase()} />
        )}
        <SAssetName>{asset.name}</SAssetName>
      </SAssetRowLeft>
      <SAssetRowRight>
        <SAssetBalance>{`${fromWad(asset.balance)} ${asset.symbol}`}</SAssetBalance>
      </SAssetRowRight>
    </SAssetRow>
  );
};

export default AssetRow;
