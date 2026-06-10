'use client'

import { useRef, useEffect, useCallback } from 'react'

type Props = { onChange: (dataUrl: string | null) => void }

export function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const hasDrawn = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#24343a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = useCallback((e: MouseEvent | Touch) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const emitDataUrl = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(hasDrawn.current ? canvas.toDataURL('image/png') : null)
  }, [onChange])

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(emitDataUrl, 300)
  }, [emitDataUrl])

  const startDrawing = useCallback((e: MouseEvent | Touch) => {
    isDrawing.current = true
    hasDrawn.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: MouseEvent | Touch) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [getPos])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMouseDown = (e: MouseEvent) => startDrawing(e)
    const onMouseMove = (e: MouseEvent) => draw(e)
    const onMouseUp = () => stopDrawing()
    const onMouseLeave = () => stopDrawing()
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [startDrawing, draw, stopDrawing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) startDrawing(touch)
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) draw(touch)
    }
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      stopDrawing()
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [startDrawing, draw, stopDrawing])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
    onChange(null)
  }, [onChange])

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full cursor-crosshair rounded-xl border border-[#eadfd6] bg-white"
        style={{ touchAction: 'none' }}
      />
      <button
        type="button"
        onClick={clear}
        className="text-xs text-[#667085] underline transition-colors hover:text-[#f37d6d]"
      >
        Clear signature
      </button>
    </div>
  )
}
