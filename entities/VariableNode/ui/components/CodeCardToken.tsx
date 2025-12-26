import React from 'react';
import { getTokenStyle } from '../../lib/styleUtils';

interface CodeCardTokenProps {
  text: string;
  tokenId: string;
  nodeId: string;
  isActive: boolean;
  onTokenClick: (token: string, sourceNodeId: string, event: React.MouseEvent) => void;
}

const CodeCardToken: React.FC<CodeCardTokenProps> = ({ text, tokenId, nodeId, isActive, onTokenClick }) => {
  return (
    <span
      data-token={tokenId}
      className={`
        inline-block px-0.5 rounded cursor-pointer transition-all duration-200 border
        ${getTokenStyle(isActive)}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onTokenClick(tokenId, nodeId, e);
      }}
    >
      {text}
    </span>
  );
};

export default CodeCardToken;
