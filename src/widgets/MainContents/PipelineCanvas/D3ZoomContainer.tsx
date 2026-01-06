import type { ReactNode, RefObject } from 'react';
import { useD3Zoom } from './useD3Zoom.ts';

const D3ZoomContainer = ({
  containerRef,
  children,
}: {
  containerRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) => {
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
