/* Animated SVG arc gauge for risk score visualization */
export default function RiskGauge({ score = 0, level = 'Low', color = '#22c55e' }) {
  // Arc math: r=70, circumference = 2π×70 ≈ 440, we use 75% (330) for the arc
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75
  const offset = arcLength - (score / 100) * arcLength

  const levelColors = {
    Low:      '#22c55e',
    Medium:   '#eab308',
    High:     '#f97316',
    Critical: '#ef4444',
  }
  const arcColor = levelColors[level] || color

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-[135deg]">
          {/* Track */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${arcColor}88)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-slate-900" style={{ color: arcColor }}>
            {score}
          </span>
          <span className="text-xs text-slate-500 font-medium">Risk Score</span>
        </div>
      </div>
      {/* Level badge */}
      <div
        className="px-5 py-1.5 rounded-full text-sm font-bold border"
        style={{
          backgroundColor: `${arcColor}15`,
          color: arcColor,
          borderColor: `${arcColor}40`,
          boxShadow: `0 2px 10px ${arcColor}20`,
        }}
      >
        {level} Risk
      </div>
    </div>
  )
}
