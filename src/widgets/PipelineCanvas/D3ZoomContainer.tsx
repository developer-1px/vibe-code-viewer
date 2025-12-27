import React, { useRef, ReactNode, RefObject } from 'react';
import { useD3Zoom } from './useD3Zoom';

interface D3ZoomContainerProps {
  containerRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}

const D3ZoomContainer: React.FC<D3ZoomContainerProps> = ({ containerRef, children }) => {
  const { transform } = useD3Zoom(containerRef);

  return (
    <div
      className="origin-top-left absolute top-0 left-0 w-full h-full"
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
      }}
    >
      {children}
    </div>
  );
};

export default D3ZoomContainer;
