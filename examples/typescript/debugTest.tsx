/**
 * TSX 디버깅 테스트 파일
 *
 * 목적: React 컴포넌트 코드 스니펫이 제대로 렌더링되는지 확인
 */

import React from 'react';

// 짧은 React 컴포넌트 (10줄)
export const ShortComponent: React.FC = () => {
  return (
    <div>
      <h1>Short Component</h1>
      <p>This is a short component</p>
    </div>
  );
};

// 중간 React 컴포넌트 (25줄)
export const MediumComponent: React.FC = () => {
  const handleClick = () => {
    console.log('Clicked');
  };

  return (
    <div className="container">
      <header>
        <h1>Medium Component</h1>
      </header>
      <main>
        <button onClick={handleClick}>
          Click Me
        </button>
      </main>
      <footer>
        <p>Footer content</p>
      </footer>
    </div>
  );
};

// 긴 React 컴포넌트 (50줄) - FileItem과 유사한 구조
export const LongComponent: React.FC<{ title: string; isActive: boolean }> = ({
  title,
  isActive
}) => {
  const handleClick = () => {
    console.log('Clicked:', title);
  };

  const handleDoubleClick = () => {
    console.log('Double clicked:', title);
  };

  return (
    <div
      className={`
        container
        ${isActive ? 'active' : 'inactive'}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <header className="header">
        <h1>{title}</h1>
        {isActive && <span className="badge">Active</span>}
      </header>

      <main className="content">
        <section>
          <p>Section 1</p>
          <p>Content here</p>
        </section>

        <section>
          <p>Section 2</p>
          <p>More content</p>
        </section>
      </main>

      <footer className="footer">
        <button onClick={handleClick}>Action 1</button>
        <button onClick={handleDoubleClick}>Action 2</button>
      </footer>
    </div>
  );
};

// 이 줄이 화면에 표시되는지 확인! (마지막 줄 테스트)
export default LongComponent;
