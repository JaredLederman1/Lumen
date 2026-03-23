export interface Finding {
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  dollarImpact: number
  impactDescription: string
}

export interface ScoreDimension {
  name: string
  score: number   // 0–100
  weight: number  // fraction, must sum to 1
  findings: Finding[]
}

export interface ScoreReport {
  overallScore: number
  dimensions: ScoreDimension[]
  findings: Finding[]
  generatedAt: Date
}
