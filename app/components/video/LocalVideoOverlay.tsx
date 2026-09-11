"use client"

import { useRef, useState, type PointerEvent } from "react"

export function LocalVideoOverlay({
  videoRef,
  visible,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  visible: boolean
}) {
  const [pos, setPos] = useState({ x: 16, y: 16 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    setPos({
      x: drag.current.x + (drag.current.px - e.clientX),
      y: drag.current.y + (e.clientY - drag.current.py),
    })
  }

  function onPointerUp() {
    drag.current = null
  }

  if (!visible) return null
  return (
    <div
      className="absolute z-20 w-28 h-40 rounded-2xl overflow-hidden border border-slate-600 cursor-move"
      style={{ right: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
    </div>
  )
}
