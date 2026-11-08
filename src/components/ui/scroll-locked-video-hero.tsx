"use client"

import { useEffect, useRef, useState } from "react"

// Original scroll-locked video hero (kept as reference; see bookshelf-doors-hero.tsx
// for the library version that reuses the same scroll-lock + scrub technique).

export interface MetroHeroProps {
  videoSrc?: string
  title?: string
  scrollHint?: string
  tagline?: string
  scrubDistance?: number
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const COL_BG = "#05070d"
const COL_TEXT = "#f2f4f8"

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function MetroHero({
  videoSrc = DEFAULT_VIDEO,
  title = "THE CITY OPENS",
  scrollHint = "SCROLL",
  tagline = "Every door in the city is already open.",
  scrubDistance = 3200,
  className,
  style,
}: MetroHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    let duration = 0
    let rafId = 0
    let targetProgress = 0
    let currentProgress = 0
    let hasStartedScrolling = false
    let isSeeking = false
    let pendingTime: number | null = null
    let lockedScrollY = 0
    let touchStartY = 0

    const onLoadedData = () => { duration = video.duration || 0; setReady(true) }
    video.addEventListener("loadeddata", onLoadedData)
    video.play()?.then(() => video.pause()).catch(() => {})

    const onSeeked = () => {
      isSeeking = false
      if (pendingTime !== null) { const t = pendingTime; pendingTime = null; isSeeking = true; video.currentTime = t }
    }
    video.addEventListener("seeked", onSeeked)
    const seekTo = (t: number) => { if (isSeeking) { pendingTime = t; return } isSeeking = true; video.currentTime = t }

    lockedScrollY = window.scrollY
    const b = document.body.style
    Object.assign(b, { position: "fixed", top: `-${lockedScrollY}px`, left: "0", right: "0", width: "100%", height: "100%", overscrollBehavior: "none" })

    const addDelta = (d: number) => {
      targetProgress = clamp(targetProgress + d / scrubDistance, 0, 1)
      if (targetProgress > 0.001) hasStartedScrolling = true
    }
    const onWheel = (e: WheelEvent) => { addDelta(e.deltaY); e.preventDefault() }
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0]?.clientY ?? 0 }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchStartY
      addDelta(touchStartY - y); touchStartY = y; e.preventDefault()
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })

    function frame() {
      currentProgress += (targetProgress - currentProgress) * 0.18
      if (duration > 0) seekTo(currentProgress * duration)
      if (videoRef.current) videoRef.current.style.transform = `scale(${1 + currentProgress * 0.06})`
      if (titleRef.current) {
        const t = 1 - clamp(currentProgress / 0.35, 0, 1)
        titleRef.current.style.opacity = String(t)
        titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`
      }
      if (hintRef.current) hintRef.current.style.opacity = hasStartedScrolling ? "0" : "1"
      if (taglineRef.current) {
        const t = clamp((currentProgress - 0.82) / 0.18, 0, 1)
        taglineRef.current.style.opacity = String(t)
        taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`
      }
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${currentProgress})`
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      video.removeEventListener("loadeddata", onLoadedData)
      video.removeEventListener("seeked", onSeeked)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      cancelAnimationFrame(rafId)
      Object.assign(b, { position: "", top: "", left: "", right: "", width: "", height: "", overscrollBehavior: "" })
      window.scrollTo(0, lockedScrollY)
    }
  }, [scrubDistance])

  const overlay: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none" }
  return (
    <div ref={sectionRef} className={className} style={{ position: "relative", height: "100dvh", width: "100%", overflow: "hidden", background: COL_BG, touchAction: "none", ...style }}>
      <video ref={videoRef} src={videoSrc} muted playsInline preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: ready ? 1 : 0, transition: "opacity 0.6s ease", pointerEvents: "none" }} />
      <div ref={titleRef} style={overlay}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(30px, 7vw, 96px)", color: COL_TEXT }}>{title}</span>
      </div>
      <div ref={taglineRef} style={{ ...overlay, opacity: 0 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "clamp(20px, 3.4vw, 40px)", color: COL_TEXT }}>{tagline}</span>
      </div>
      <div ref={hintRef} style={{ position: "absolute", left: "50%", bottom: 40, transform: "translateX(-50%)", color: "rgba(240,244,248,.75)", fontFamily: SANS, letterSpacing: "0.3em", fontSize: 12 }}>{scrollHint}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,0.12)" }}>
        <div ref={progressBarRef} style={{ height: "100%", background: "#fff", transform: "scaleX(0)", transformOrigin: "left center" }} />
      </div>
    </div>
  )
}
