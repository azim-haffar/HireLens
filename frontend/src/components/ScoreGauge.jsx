import { useState, useEffect } from 'react'

export default function ScoreGauge({ score, label, size = 'md' }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [score])

  const isGreen  = score >= 70
  const isYellow = score >= 45 && score < 70

  const textColor   = isGreen ? 'text-green-400'  : isYellow ? 'text-yellow-400'  : 'text-red-400'
  const strokeColor = isGreen ? '#4ade80'          : isYellow ? '#facc15'          : '#f87171'
  const glowColor   = isGreen ? 'rgba(74,222,128,' : isYellow ? 'rgba(250,204,21,' : 'rgba(248,113,113,'

  const radius       = size === 'lg' ? 54 : 36
  const strokeWidth  = size === 'lg' ? 8  : 6
  const circumference = 2 * Math.PI * radius
  const targetOffset  = circumference - (score / 100) * circumference
  const svgSize       = (radius + strokeWidth) * 2

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize} height={svgSize}
          className="-rotate-90 score-glow"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor}0.5))` }}
        >
          {/* Track */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" strokeWidth={strokeWidth}
            stroke="rgba(255,255,255,0.07)"
          />
          {/* Animated fill */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" strokeWidth={strokeWidth}
            stroke={strokeColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? targetOffset : circumference}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${textColor} ${size === 'lg' ? 'text-2xl' : 'text-base'}`}>
          {score}
        </span>
      </div>
      {label && <span className="text-xs text-gray-400 text-center">{label}</span>}
    </div>
  )
}
