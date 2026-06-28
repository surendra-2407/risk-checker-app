const { scanCode } = require('../engine/scanner');

describe('Scanner Engine', () => {
  it('should detect hardcoded API keys', () => {
    const code = "const API_KEY = 'sk-1234567890abcdef1234567890abcdef';";
    const issues = scanCode(code, 'test.js');
    
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.severity === 'Critical')).toBe(true);
  });

  it('should detect eval usage', () => {
    const code = "eval('console.log(\"hello\")');";
    const issues = scanCode(code, 'test.js');
    
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.severity === 'High' || i.severity === 'Critical')).toBe(true);
  });

  it('should pass clean code without critical issues', () => {
    const code = "const greeting = 'hello world';";
    const issues = scanCode(code, 'test.js');
    
    expect(issues.length).toBe(0);
  });
});
