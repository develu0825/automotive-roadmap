import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MIN = 1
const MAX = 8
const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s))

/**
 * Full-screen image viewer for lesson figures: zoom in to read a diagram and
 * pan around freely. Zoom with the + / - buttons or a double-click; move with
 * a drag or a two-finger trackpad scroll. Close with Esc, the ✕, or the backdrop.
 */
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  const zoom = (factor: number) =>
    setScale((s) => {
      const next = clamp(s * factor)
      if (next <= MIN) setPos({ x: 0, y: 0 })
      return next
    })

  const reset = () => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  // Esc to close + lock page scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Native (non-passive) wheel so two-finger scroll pans and pinch zooms.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey) {
        setScale((s) => {
          const next = clamp(s * Math.pow(2, -e.deltaY * 0.01))
          if (next <= MIN) setPos({ x: 0, y: 0 })
          return next
        })
        return
      }
      setPos((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onDown = (e: React.PointerEvent) => {
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos({
      x: drag.current.ox + (e.clientX - drag.current.px),
      y: drag.current.oy + (e.clientY - drag.current.py),
    })
  }
  const onUp = () => {
    drag.current = null
  }

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoom(1.5)} aria-label="확대">＋</button>
        <button type="button" onClick={() => zoom(1 / 1.5)} aria-label="축소">－</button>
        <button type="button" onClick={reset} aria-label="원래 크기">⟲</button>
        <button type="button" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      <div
        ref={stageRef}
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => zoom(scale < 2 ? 2.5 : 1 / scale)}
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="lightbox-img"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
        />
      </div>
      <p className="lightbox-hint">＋－·더블클릭: 확대 · 드래그·두 손가락: 이동 · Esc: 닫기</p>
    </div>,
    document.body,
  )
}
