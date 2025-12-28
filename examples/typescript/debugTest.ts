/**
 * 디버깅 테스트 파일
 *
 * 목적: 코드 스니펫이 제대로 렌더링되는지 확인
 */

// 짧은 함수 (5줄)
export function shortFunction(x: number): number {
  return x * 2;
}

// 중간 함수 (15줄)
export function mediumFunction(data: string[]): string[] {
  const filtered = data.filter(item => item.length > 0);
  const mapped = filtered.map(item => item.toUpperCase());
  const sorted = mapped.sort();

  console.log('Processing completed');

  return sorted;
}

// 긴 함수 (30줄) - React 컴포넌트 스타일
export const LongComponent = () => {
  const handleClick = () => {
    console.log('Clicked');
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log('Submitted');
  };

  const processData = (data: any) => {
    return data.map((item: any) => ({
      ...item,
      processed: true
    }));
  };

  return {
    handleClick,
    handleSubmit,
    processData
  };
};

// 아주 긴 함수 (50줄) - 마지막 줄이 잘리는지 테스트
export function veryLongFunction(input: any[]): any {
  const step1 = input.filter(x => x !== null);
  const step2 = step1.map(x => x * 2);
  const step3 = step2.filter(x => x > 10);

  const helper1 = (val: number) => {
    return val + 1;
  };

  const helper2 = (val: number) => {
    return val * 3;
  };

  const helper3 = (val: number) => {
    return val - 5;
  };

  const result1 = step3.map(helper1);
  const result2 = result1.map(helper2);
  const result3 = result2.map(helper3);

  console.log('Step 1:', step1);
  console.log('Step 2:', step2);
  console.log('Step 3:', step3);
  console.log('Result 1:', result1);
  console.log('Result 2:', result2);
  console.log('Result 3:', result3);

  if (result3.length === 0) {
    console.log('Empty result');
    return [];
  }

  if (result3.length > 100) {
    console.log('Too many items');
    return result3.slice(0, 100);
  }

  console.log('Final result:', result3);

  // 이 줄이 화면에 표시되는지 확인! (마지막 줄 테스트)
  return result3;
}
