import type { AgentUsageData } from '../office/types.js'
import type { OfficeState } from '../office/engine/officeState.js'

interface UsagePanelProps {
  agents: number[]
  agentUsage: Record<number, AgentUsageData>
  officeState: OfficeState
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

const TOKEN_COLORS = {
  input: '#5a8cff',
  output: '#5ac88c',
  cacheWrite: '#cca700',
  cacheRead: '#9a6adf',
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 62,
  right: 30,
  width: 310,
  maxHeight: 'calc(100vh - 80px)',
  overflowY: 'auto',
  zIndex: 'var(--pixel-controls-z)' as unknown as number,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  boxShadow: 'var(--pixel-shadow)',
  padding: '8px 0',
}

const emptyStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '22px',
  color: 'var(--pixel-text-dim)',
  textAlign: 'center',
}

function TokenBar({ usage }: { usage: AgentUsageData }) {
  const total = usage.totalTokens
  if (total === 0) return null

  const segments = [
    { value: usage.inputTokens, color: TOKEN_COLORS.input },
    { value: usage.outputTokens, color: TOKEN_COLORS.output },
    { value: usage.cacheCreationTokens, color: TOKEN_COLORS.cacheWrite },
    { value: usage.cacheReadTokens, color: TOKEN_COLORS.cacheRead },
  ]

  return (
    <div style={{
      display: 'flex',
      height: 6,
      borderRadius: 0,
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.06)',
      margin: '4px 12px 0',
    }}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100
        if (pct < 0.5) return null
        return (
          <div
            key={i}
            style={{
              width: pct + '%',
              background: seg.color,
              opacity: 0.8,
            }}
          />
        )
      })}
    </div>
  )
}

function TokenDetail({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 6,
        height: 6,
        background: color,
        flexShrink: 0,
        opacity: 0.8,
      }} />
      <span style={{ color: 'var(--pixel-text-dim)', fontSize: '20px' }}>
        {label}
      </span>
      <span style={{ color: 'var(--pixel-text)', fontSize: '20px', marginLeft: 'auto' }}>
        {formatTokens(value)}
      </span>
    </div>
  )
}

export function UsagePanel({ agents, agentUsage, officeState }: UsagePanelProps) {
  const agentsWithUsage = agents.filter((id) => agentUsage[id])

  if (agentsWithUsage.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>No usage data</div>
      </div>
    )
  }

  // Grand totals
  let totalIn = 0, totalOut = 0, totalCW = 0, totalCR = 0
  for (const id of agentsWithUsage) {
    const u = agentUsage[id]
    totalIn += u.inputTokens
    totalOut += u.outputTokens
    totalCW += u.cacheCreationTokens
    totalCR += u.cacheReadTokens
  }
  const grandTotal = totalIn + totalOut + totalCW + totalCR

  const grandUsage: AgentUsageData = {
    inputTokens: totalIn,
    outputTokens: totalOut,
    cacheCreationTokens: totalCW,
    cacheReadTokens: totalCR,
    totalTokens: grandTotal,
    model: null,
  }

  return (
    <div style={panelStyle}>
      {/* Grand total header */}
      <div style={{ padding: '2px 12px 8px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 2,
        }}>
          <span style={{ fontSize: '22px', color: 'var(--pixel-text)' }}>
            Total
          </span>
          <span style={{ fontSize: '24px', color: 'var(--pixel-accent)' }}>
            {formatTokens(grandTotal)}
          </span>
        </div>
        <TokenBar usage={grandUsage} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', padding: '6px 0 0', fontSize: '19px' }}>
          <TokenDetail label="Input" value={totalIn} color={TOKEN_COLORS.input} />
          <TokenDetail label="Output" value={totalOut} color={TOKEN_COLORS.output} />
          <TokenDetail label="Cache W" value={totalCW} color={TOKEN_COLORS.cacheWrite} />
          <TokenDetail label="Cache R" value={totalCR} color={TOKEN_COLORS.cacheRead} />
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: 'var(--pixel-border)', margin: '2px 0 4px' }} />

      {/* Per-agent rows */}
      {agentsWithUsage.map((id) => {
        const usage = agentUsage[id]
        const ch = officeState.characters.get(id)
        const name = ch?.name || `Agent ${id}`
        const modelShort = usage.model
          ? usage.model.replace('claude-', '').replace(/-\d{8}$/, '')
          : ''

        return (
          <div key={id} style={{ padding: '4px 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 12px',
            }}>
              <span style={{ fontSize: '22px', color: 'var(--pixel-text)' }}>{name}</span>
              <span style={{ fontSize: '19px', color: 'var(--pixel-text-dim)' }}>{modelShort}</span>
            </div>

            <TokenBar usage={usage} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 12px 0',
              fontSize: '20px',
              color: 'var(--pixel-text-dim)',
            }}>
              <span>
                <span style={{ color: TOKEN_COLORS.input, opacity: 0.8 }}>In </span>
                {formatTokens(usage.inputTokens)}
              </span>
              <span>
                <span style={{ color: TOKEN_COLORS.output, opacity: 0.8 }}>Out </span>
                {formatTokens(usage.outputTokens)}
              </span>
              <span style={{ color: 'var(--pixel-accent)', fontSize: '20px' }}>
                {formatTokens(usage.totalTokens)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
