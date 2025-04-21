"use client"

import { useEffect, useRef } from "react"

// Mock price data for display
const mockPriceData = [
  { time: 0, price: 5.2 },
  { time: 1, price: 5.1 },
  { time: 2, price: 5.3 },
  { time: 3, price: 5.0 },
  { time: 4, price: 5.2 },
  { time: 5, price: 5.0 },
  { time: 6, price: 4.9 },
  { time: 7, price: 5.1 },
  { time: 8, price: 4.8 },
  { time: 9, price: 4.9 },
  { time: 10, price: 4.7 },
  { time: 11, price: 4.6 },
  { time: 12, price: 4.8 },
  { time: 13, price: 4.7 },
  { time: 14, price: 4.9 },
  { time: 15, price: 4.8 },
  { time: 16, price: 4.7 },
  { time: 17, price: 4.5 },
  { time: 18, price: 4.6 },
  { time: 19, price: 4.5 },
  { time: 20, price: 4.4 },
]

export default function PriceChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Scale canvas for better rendering
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // Find min and max values for scaling
    const minPrice = Math.min(...mockPriceData.map((d) => d.price))
    const maxPrice = Math.max(...mockPriceData.map((d) => d.price))
    const priceRange = maxPrice - minPrice
    const padding = 20
    const chartHeight = rect.height - padding * 2
    const chartWidth = rect.width

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = "#7367f0" // Purple color matching screenshot
    ctx.lineWidth = 2

    mockPriceData.forEach((point, i) => {
      const x = (i / (mockPriceData.length - 1)) * chartWidth
      const normalizedPrice = (point.price - minPrice) / priceRange
      const y = chartHeight - normalizedPrice * chartHeight + padding

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }, [])

  return <canvas ref={canvasRef} className="w-full h-64 rounded-lg" />
}
