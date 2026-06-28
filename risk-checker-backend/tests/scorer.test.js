const { calculateRiskScore } = require('../engine/scorer');

describe('Scorer Engine', () => {
  it('should allow commits with no issues', () => {
    const result = calculateRiskScore([], { linesChanged: 10 });
    
    expect(result.score).toBe(0);
    expect(result.level).toBe('Low');
    expect(result.commit_allowed).toBe(true);
  });

  it('should block commits with critical issues', () => {
    // 3 Critical issues = 3 * 25 = 75 score (High/Critical)
    const issues = [
      { severity: 'Critical' },
      { severity: 'Critical' },
      { severity: 'Critical' }
    ];
    
    const result = calculateRiskScore(issues, { linesChanged: 10 });
    
    expect(result.score).toBe(75);
    expect(result.commit_allowed).toBe(false);
  });

  it('should apply penalty for very large commits', () => {
    const result = calculateRiskScore([], { linesChanged: 1500 });
    
    // 10 point penalty for >1000 lines
    expect(result.score).toBe(10);
  });
});
