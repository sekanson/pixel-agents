import { useState, useEffect, useCallback } from 'react'
import { vscode } from '../vscodeApi.js'
import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js'
import type { PetConfig, PetTypeValue } from '../office/types.js'
import { PetType } from '../office/types.js'
import { MAX_PETS, PET_NAME_MAX_LENGTH } from '../constants.js'

const PET_HUE_MAX = 360

const TEAM_NAMES = ['techs', 'bonhomme', 'sizzler'] as const

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  isDebugMode: boolean
  onToggleDebugMode: () => void
  onOpenAchievements: () => void
  petsEnabled: boolean
  onTogglePets: () => void
  petData: PetConfig[]
  onUpdatePetData: (data: PetConfig[]) => void
}

const menuItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 10px',
  fontSize: '24px',
  color: 'rgba(255, 255, 255, 0.8)',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 0,
  color: '#fff',
  fontSize: '20px',
  padding: '2px 6px',
  outline: 'none',
  fontFamily: '"FS Pixel Sans Unicode", monospace',
}

export function SettingsModal({ isOpen, onClose, isDebugMode, onToggleDebugMode, onOpenAchievements, petsEnabled, onTogglePets, petData, onUpdatePetData }: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled)
  const [petsExpanded, setPetsExpanded] = useState(false)
  const [availableLevels, setAvailableLevels] = useState<number[]>([])
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)

  // Request available levels when modal opens
  useEffect(() => {
    if (!isOpen) return
    vscode.postMessage({ type: 'getAvailableLevels' })
  }, [isOpen])

  // Listen for availableLevels and layoutLoaded responses
  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = event.data
    if (msg.type === 'availableLevels') {
      setAvailableLevels(msg.levels ?? [])
    } else if (msg.type === 'layoutLoaded' && loadingLevel !== null) {
      setLoadingLevel(null)
    }
  }, [loadingLevel])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (!isOpen) return null

  const handleAddPet = (type: PetTypeValue) => {
    if (petData.length >= MAX_PETS) return
    const newPet: PetConfig = {
      id: crypto.randomUUID(),
      name: type === 'dog' ? 'Dog' : 'Cat',
      type,
      hue: 0,
    }
    onUpdatePetData([...petData, newPet])
  }

  const handlePetTypeChange = (petId: string, type: PetTypeValue) => {
    onUpdatePetData(petData.map((p) => (p.id === petId ? { ...p, type } : p)))
  }

  const handleRemovePet = (petId: string) => {
    onUpdatePetData(petData.filter((p) => p.id !== petId))
  }

  const handlePetNameChange = (petId: string, name: string) => {
    const trimmed = name.slice(0, PET_NAME_MAX_LENGTH)
    onUpdatePetData(petData.map((p) => (p.id === petId ? { ...p, name: trimmed } : p)))
  }

  const handlePetHueChange = (petId: string, hue: number) => {
    onUpdatePetData(petData.map((p) => (p.id === petId ? { ...p, hue } : p)))
  }

  const handleLoadLevel = (level: number) => {
    setLoadingLevel(level)
    vscode.postMessage({ type: 'loadBundledLevel', level })
  }

  const handleLaunchTeam = () => {
    vscode.postMessage({ type: 'launchTeam', names: [...TEAM_NAMES] })
    onClose()
  }

  return (
    <>
      {/* Dark backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 49,
        }}
      />
      {/* Centered modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 200,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Header with title and X button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>Settings</span>
          <button
            onClick={onClose}
            onMouseEnter={() => setHovered('close')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'close' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>
        {/* Menu items */}
        <button
          onClick={() => {
            vscode.postMessage({ type: 'openSessionsFolder' })
            onClose()
          }}
          onMouseEnter={() => setHovered('sessions')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'sessions' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          Open Sessions Folder
        </button>
        <button
          onClick={() => {
            vscode.postMessage({ type: 'exportLayout' })
            onClose()
          }}
          onMouseEnter={() => setHovered('export')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'export' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          Export Layout
        </button>
        <button
          onClick={() => {
            vscode.postMessage({ type: 'importLayout' })
            onClose()
          }}
          onMouseEnter={() => setHovered('import')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'import' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          Import Layout
        </button>

        {/* Office Layout — level select */}
        {availableLevels.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '2px', paddingTop: '2px' }}>
            <div style={{ ...menuItemBase, cursor: 'default', fontSize: '20px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Office Layout
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '2px 10px 6px', justifyContent: 'center' }}>
              {availableLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => handleLoadLevel(level)}
                  onMouseEnter={() => setHovered(`level-${level}`)}
                  onMouseLeave={() => setHovered(null)}
                  disabled={loadingLevel !== null}
                  style={{
                    background: hovered === `level-${level}` ? 'rgba(90, 140, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 0,
                    color: loadingLevel === level ? 'rgba(90, 140, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '20px',
                    cursor: loadingLevel !== null ? 'wait' : 'pointer',
                    padding: '4px 12px',
                    fontFamily: '"FS Pixel Sans Unicode", monospace',
                    minWidth: 60,
                  }}
                >
                  {loadingLevel === level ? '...' : `Lv ${level}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Launch Team */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '2px', paddingTop: '2px' }}>
          <button
            onClick={handleLaunchTeam}
            onMouseEnter={() => setHovered('launch-team')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...menuItemBase,
              background: hovered === 'launch-team' ? 'rgba(50, 180, 80, 0.15)' : 'transparent',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <span style={{ color: 'rgba(90, 200, 120, 0.9)' }}>Launch Team</span>
            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
              {TEAM_NAMES.join(', ')}
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            const newVal = !isSoundEnabled()
            setSoundEnabled(newVal)
            setSoundLocal(newVal)
            vscode.postMessage({ type: 'setSoundEnabled', enabled: newVal })
          }}
          onMouseEnter={() => setHovered('sound')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'sound' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>Sound Notifications</span>
          <span
            style={{
              width: 14,
              height: 14,
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: 0,
              background: soundLocal ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {soundLocal ? 'X' : ''}
          </span>
        </button>
        <button
          onClick={() => {
            onOpenAchievements()
            onClose()
          }}
          onMouseEnter={() => setHovered('achievements')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'achievements' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          Achievements
        </button>

        {/* Office Pets — expandable section */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '2px', paddingTop: '2px' }}>
          <button
            onClick={() => setPetsExpanded((v) => !v)}
            onMouseEnter={() => setHovered('pets-header')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...menuItemBase,
              background: hovered === 'pets-header' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '16px', display: 'inline-block', transform: petsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }}>▶</span>
              Office Pets
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); onTogglePets() }}
              style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(255, 255, 255, 0.5)',
                borderRadius: 0,
                background: petsEnabled ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                lineHeight: 1,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {petsEnabled ? 'X' : ''}
            </span>
          </button>

          {petsExpanded && petsEnabled && (
            <div style={{ padding: '4px 10px 8px' }}>
              {petData.map((pet, idx) => (
                <div
                  key={pet.id}
                  onMouseEnter={() => setHovered(`pet-row-${idx}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                    padding: '4px 6px',
                    background: hovered === `pet-row-${idx}` ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                    flexWrap: 'wrap',
                  }}
                >
                  <select
                    value={pet.type ?? 'cat'}
                    onChange={(e) => handlePetTypeChange(pet.id, e.target.value as PetTypeValue)}
                    style={{
                      ...inputStyle,
                      width: 70,
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <option value={PetType.CAT}>Cat</option>
                    <option value={PetType.DOG}>Dog</option>
                  </select>
                  <input
                    type="text"
                    value={pet.name}
                    onChange={(e) => handlePetNameChange(pet.id, e.target.value)}
                    maxLength={PET_NAME_MAX_LENGTH}
                    style={{
                      ...inputStyle,
                      width: 60,
                      flex: 1,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={PET_HUE_MAX}
                    value={pet.hue ?? 0}
                    onChange={(e) => handlePetHueChange(pet.id, parseInt(e.target.value, 10))}
                    title={`Hue: ${pet.hue ?? 0}`}
                    style={{
                      width: 50,
                      flexShrink: 0,
                      cursor: 'pointer',
                      accentColor: `hsl(${pet.hue ?? 0}, 80%, 60%)`,
                    }}
                  />
                  <button
                    onClick={() => handleRemovePet(pet.id)}
                    onMouseEnter={() => setHovered(`pet-del-${idx}`)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: hovered === `pet-del-${idx}` ? 'rgba(200, 50, 50, 0.5)' : 'transparent',
                      border: 'none',
                      borderRadius: 0,
                      color: 'rgba(255, 80, 80, 0.8)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '0 4px',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    X
                  </button>
                </div>
              ))}
              {petData.length < MAX_PETS && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onClick={() => handleAddPet(PetType.CAT)}
                    onMouseEnter={() => setHovered('pet-add-cat')}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      ...menuItemBase,
                      fontSize: '20px',
                      padding: '4px 6px',
                      color: 'rgba(90, 200, 120, 0.9)',
                      background: hovered === 'pet-add-cat' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      justifyContent: 'center',
                      flex: 1,
                    }}
                  >
                    + Cat
                  </button>
                  <button
                    onClick={() => handleAddPet(PetType.DOG)}
                    onMouseEnter={() => setHovered('pet-add-dog')}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      ...menuItemBase,
                      fontSize: '20px',
                      padding: '4px 6px',
                      color: 'rgba(90, 200, 120, 0.9)',
                      background: hovered === 'pet-add-dog' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      justifyContent: 'center',
                      flex: 1,
                    }}
                  >
                    + Dog
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onToggleDebugMode}
          onMouseEnter={() => setHovered('debug')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'debug' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>Debug View</span>
          {isDebugMode && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(90, 140, 255, 0.8)',
                flexShrink: 0,
              }}
            />
          )}
        </button>
      </div>
    </>
  )
}
