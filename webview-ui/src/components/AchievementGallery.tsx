interface AchievementItem {
  id: string
  name: string
  description: string
  target: number
  unlocked: boolean
  current: number
}

interface Props {
  achievements: AchievementItem[]
  onClose: () => void
}

export function AchievementGallery({ achievements, onClose }: Props) {
  const unlocked = achievements.filter(a => a.unlocked).length

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 59,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 60,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '8px',
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 300,
          maxWidth: 400,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: 8,
          }}
        >
          <div>
            <span style={{ fontSize: '24px', color: '#CCAA33' }}>
              Achievements ({unlocked}/{achievements.length})
            </span>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              Global across all projects
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            X
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
          {achievements.map((a) => (
            <div
              key={a.id}
              style={{
                padding: '6px 8px',
                border: '1px solid',
                borderColor: a.unlocked ? '#CCAA33' : 'rgba(255,255,255,0.1)',
                borderRadius: 0,
                opacity: a.unlocked ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', color: a.unlocked ? '#CCAA33' : 'rgba(255,255,255,0.6)' }}>
                  {a.unlocked ? '* ' : ''}{a.name}
                </span>
                <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>
                  {a.current}/{a.target}
                </span>
              </div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {a.description}
              </div>
              {!a.unlocked && (
                <div style={{ marginTop: 4, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (a.current / a.target) * 100)}%`,
                      background: '#CCAA33',
                      borderRadius: 0,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
