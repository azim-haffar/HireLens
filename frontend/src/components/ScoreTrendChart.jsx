import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { score, role } = payload[0].payload
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="font-bold text-brand-600 dark:text-brand-400 text-sm">{score}%</p>
      {role && <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 max-w-[180px] truncate">{role}</p>}
    </div>
  )
}

export default function ScoreTrendChart({ analyses }) {
  const { t } = useTranslation()

  if (!analyses || analyses.length < 2) return null

  const data = analyses
    .slice()
    .reverse()
    .slice(-12)
    .map(a => ({
      date: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: a.overall_score || 0,
      role: [a.job_title, a.job_company].filter(x => x && x !== 'null').join(' @ '),
    }))

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{t('dashboard.scoreTrend')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.scoreTrendDesc')}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5566f8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#5566f8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#5566f8', strokeWidth: 1, strokeDasharray: '4 2' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#5566f8"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={{ fill: '#5566f8', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#5566f8', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
