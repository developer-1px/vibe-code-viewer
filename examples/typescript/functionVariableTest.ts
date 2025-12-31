/**
 * 테스트: Function Variable vs Regular Variable 색상 구분
 */

// Regular constant (should be amber)
const MULTIPLIER = 2;

// Function variable (should be purple)
const handler = () => {
  console.log('Handler called');
};

// Another function variable (should be purple)
const processor = function(data: any) {
  return data * MULTIPLIER;
};

// Regular object (should be amber)
const CONFIG = {
  apiUrl: 'http://api.example.com',
  timeout: 5000
};

// Test function that uses both types
export function testFunction() {
  // MULTIPLIER should be amber (regular variable)
  const result = 10 * MULTIPLIER;

  // handler should be purple (function variable)
  handler();

  // processor should be purple (function variable)
  const processed = processor(result);

  // CONFIG should be amber (regular variable)
  console.log(CONFIG.apiUrl);

  return processed;
}
