import { useEffect, useState } from 'react'
import { ACHIEVEMENT_POPUP_DURATION_MS } from '../constants.js'

export interface AchievementNotification {
  id: string
  name: string
  description: string
}

interface Props {
  achievement: AchievementNotification | null
  onDone: () => void
}

export function AchievementPopup({ achievement, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!achievement) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300) // wait for fade animation
    }, ACHIEVEMENT_POPUP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [achievement, onDone])

  if (!achievement) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 55,
        background: 'var(--pixel-bg)',
        border: '2px solid #CCAA33',
        borderRadius: 0,
        padding: '8px 14px',
        boxShadow: '2px 2px 0px #0a0a14',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: 'opacity 0.3s, transform 0.3s',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '28px' }}>*</span>
      <div>
        <div style={{ fontSize: '22px', color: '#CCAA33', fontWeight: 'bold' }}>
          {achievement.name}
        </div>
        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)' }}>
          {achievement.description}
        </div>
      </div>
    </div>
  )
}
