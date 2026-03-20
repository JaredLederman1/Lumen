'use client'

import { useEffect, useRef } from 'react'

// Irregular zigzag: varied step widths and amplitudes, strong upward trend.
// SVG y: 0 = top, 200 = bottom. Starts bottom-left, ends top-right.
// Steeper overall trend: y drops ~290px over 1440px of x.
// Each zigzag tooth is short horizontally so segments are sharp-angled.
// SVG y: 0=top 200=bottom. Starts bottom-left, ends well above top-right.
const POINTS: [number, number][] = [
  [0,   198],
  [48,  178], [78,  194],
  [125, 162], [155, 176],
  [200, 142], [228, 156],
  [272, 118], [302, 134],
  [345,  96], [372, 112],
  [415,  74], [442,  90],
  [488,  52], [514,  68],
  [558,  30], [582,  46],
  [626,  10], [650,  26],
  [692,  -6], [716,  10],
  [758, -20], [782,   -4],
  [830,  62], [872,  44],   // pullback dip before final surge
  [920,  72], [960,  50],
  [1010, 20], [1060, -10],
  [1120, 55], [1175, 38],   // dip
  [1240, 70], [1285, 48],   // dip deepens slightly
  [1340, -5], [1440, -120], // shoots up
]

const lineD = POINTS.reduce(
  (acc, [x, y], i) => acc + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`),
  ''
)


export default function StockChartBg() {
  const lineRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const line = lineRef.current
    if (!line) return

    const length = line.getTotalLength()

    // Start fully hidden
    line.style.transition = 'none'
    line.style.strokeDasharray = `${length}`
    line.style.strokeDashoffset = `${length}`

    // Force reflow so the initial state is painted before the transition starts
    line.getBoundingClientRect()

    // Animate left-to-right over 5 s, accelerating (ease-in)
    line.style.transition = 'stroke-dashoffset 5s cubic-bezier(0.6, 0, 1, 1)'
    line.style.strokeDashoffset = '0'
  }, [])

  return (
    <div
      style={{
        position:      'absolute',
        top:           '50%',
        left:          0,
        width:         '100%',
        transform:     'translateY(-50%)',
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        width="100%"
        height="200"
        aria-hidden="true"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Stroked line — traces left-to-right on load */}
        <path
          ref={lineRef}
          d={lineD}
          fill="none"
          stroke="#A8B4C0"
          strokeWidth={2.5}
          opacity={0.7}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      </svg>
    </div>
  )
}
