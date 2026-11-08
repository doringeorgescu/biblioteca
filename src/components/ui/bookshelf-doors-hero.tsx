"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Scroll-locked hero: the page is pinned (position: fixed) and wheel/touch
// input only drives the opening of two bookcase doors. Same technique as
// scroll-locked-video-hero.tsx, but animating CSS 3D transforms instead of video.

export interface Book {
  id: string
  title: string
  author: string
  blurb: string
  color: string
  textColor?: string
  width: number // px
  height: number // px
}

export const MY_BOOKS: Book[] = [
  { id: "walden", title: "Walden", author: "Henry David Thoreau", color: "#2f5d46", textColor: "#e8dfb8", width: 44, height: 210,
    blurb: "Doi ani petrecuți într-o colibă lângă lacul Walden: despre simplitate, natură și cât de puțin ai nevoie, de fapt." },
  { id: "ferma", title: "Ferma animalelor", author: "George Orwell", color: "#a8372c", textColor: "#f6e7c8", width: 38, height: 195,
    blurb: "Animalele alungă omul de la fermă și își fac propria lege. Fabulă scurtă și necruțătoare despre putere." },
  { id: "27", title: "27 de pași", author: "Tiberiu Useriu", color: "#1f3350", textColor: "#f0d9a0", width: 42, height: 205,
    blurb: "Cartea lui Tibi Useriu, citită și bifată pe raft." },
  { id: "cujo", title: "Cujo", author: "Stephen King", color: "#16110f", textColor: "#d83a2e", width: 46, height: 200,
    blurb: "Un sf. bernard turbat, o mașină blocată în caniculă și o mamă prinsă înăuntru. King la intensitate maximă." },
]

const FILLER_COLORS = ["#6b3a2a", "#3d4a5c", "#7a6a3c", "#4a2f43", "#2c4a4a", "#8a5a34", "#5a3030", "#38422c", "#645b4e"]

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

type Slot = { kind: "book"; book: Book } | { kind: "filler"; id: string; color: string; width: number; height: number }

function buildShelves(): Slot[][] {
  const r = rng(42)
  const filler = (shelf: number, i: number): Slot => ({
    kind: "filler", id: `f${shelf}-${i}`,
    color: FILLER_COLORS[Math.floor(r() * FILLER_COLORS.length)],
    width: 26 + Math.floor(r() * 24), height: 150 + Math.floor(r() * 70),
  })
  const real = MY_BOOKS.map((book): Slot => ({ kind: "book", book }))
  const row = (shelf: number, before: number, mid: Slot[], after: number) => [
    ...Array.from({ length: before }, (_, i) => filler(shelf, i)),
    ...mid,
    ...Array.from({ length: after }, (_, i) => filler(shelf, 100 + i)),
  ]
  return [
    row(0, 14, [], 17),
    row(1, 11, [real[0], real[1]], 15),
    row(2, 12, [real[2], real[3]], 13),
  ]
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export interface BookshelfDoorsHeroProps {
  title?: string
  tagline?: string
  scrollHint?: string
  scrubDistance?: number
  className?: string
}

export default function BookshelfDoorsHero({
  title = "BIBLIOTECA MEA",
  tagline = "Cărțile pe care le-am citit.",
  scrollHint = "DERULEAZĂ",
  scrubDistance = 1800,
  className,
}: BookshelfDoorsHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const shelfRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const shelves = useMemo(buildShelves, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    let target = reduce ? 1 : 0
    let current = target
    let started = false
    let isOpen = false
    let raf = 0
    let touchY = 0
    const scrollY = window.scrollY

    const b = document.body.style
    Object.assign(b, { position: "fixed", top: `-${scrollY}px`, left: "0", right: "0", width: "100%", height: "100%", overscrollBehavior: "none" })

    const add = (d: number) => {
      target = clamp(target + d / scrubDistance, 0, 1)
      if (target > 0.001) started = true
    }
    const onWheel = (e: WheelEvent) => { add(e.deltaY); e.preventDefault() }
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0 }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchY
      add(touchY - y); touchY = y; e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") { add(220); e.preventDefault() }
      if (e.key === "ArrowUp" || e.key === "PageUp") { add(-220); e.preventDefault() }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("keydown", onKey)

    const frame = () => {
      current += (target - current) * 0.12
      if (Math.abs(target - current) < 0.0005) current = target

      // Doors: open over the first 80% of progress.
      const d = ease(clamp(current / 0.8, 0, 1))
      if (leftRef.current) leftRef.current.style.transform = `rotateY(${-d * 112}deg)`
      if (rightRef.current) rightRef.current.style.transform = `rotateY(${d * 112}deg)`
      if (shelfRef.current) shelfRef.current.style.transform = `scale(${0.94 + d * 0.06})`
      if (glowRef.current) glowRef.current.style.opacity = String(d)
      if (titleRef.current) {
        const t = 1 - clamp(current / 0.25, 0, 1)
        titleRef.current.style.opacity = String(t)
        titleRef.current.style.filter = `blur(${(1 - t) * 8}px)`
      }
      if (hintRef.current) hintRef.current.style.opacity = started ? "0" : "1"
      if (taglineRef.current) {
        const t = clamp((current - 0.8) / 0.2, 0, 1)
        taglineRef.current.style.opacity = String(t)
        taglineRef.current.style.transform = `translateY(${(1 - t) * 16}px)`
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${current})`

      const nowOpen = current > 0.95
      if (nowOpen !== isOpen) { isOpen = nowOpen; setOpen(nowOpen); if (!nowOpen) setSelected(null) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("keydown", onKey)
      Object.assign(b, { position: "", top: "", left: "", right: "", width: "", height: "", overscrollBehavior: "" })
      window.scrollTo(0, scrollY)
    }
  }, [scrubDistance])

  const doorBase =
    "absolute top-0 h-full w-1/2 border-[10px] border-[#2a170d] bg-gradient-to-b from-[#5a3720] via-[#4a2c19] to-[#3a2012] shadow-[inset_0_0_60px_rgba(0,0,0,.55)] [backface-visibility:hidden]"

  return (
    <div
      ref={rootRef}
      className={cn("relative h-dvh w-full overflow-hidden touch-none select-none", className)}
      style={{ background: "radial-gradient(ellipse at 50% 40%, #2a1a10 0%, #0b0705 75%)" }}
    >
      {/* Bookcase */}
      <div className="absolute inset-0 flex items-center justify-center p-[4vmin]">
        <div
          ref={shelfRef}
          className="relative flex h-full max-h-[760px] w-full max-w-[1100px] flex-col justify-between border-[14px] border-[#2a170d] bg-[#150c07] px-3 py-3 shadow-[0_30px_120px_rgba(0,0,0,.8)]"
          style={{ transform: "scale(.94)" }}
        >
          <div ref={glowRef} className="pointer-events-none absolute inset-0 opacity-0"
               style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,190,110,.22), transparent 70%)" }} />
          {shelves.map((row, si) => (
            <div key={si} className="relative flex flex-1 items-end justify-center gap-[3px] overflow-hidden border-b-[12px] border-[#3a2112] pb-0">
              {row.map((slot) => {
                if (slot.kind === "filler") {
                  return (
                    <div key={slot.id} className="shrink rounded-[2px] shadow-[inset_-3px_0_5px_rgba(0,0,0,.35)]"
                         style={{ width: slot.width, height: slot.height, maxHeight: "92%", background: slot.color }}>
                      <div className="mx-auto mt-3 h-[2px] w-3/4 bg-white/20" />
                      <div className="mx-auto mt-1 h-[2px] w-3/4 bg-white/10" />
                    </div>
                  )
                }
                const bk = slot.book
                const active = selected?.id === bk.id
                return (
                  <button
                    key={bk.id}
                    type="button"
                    disabled={!open}
                    aria-label={`${bk.title} — ${bk.author}`}
                    onClick={() => setSelected(active ? null : bk)}
                    className={cn(
                      "group relative shrink-0 rounded-[2px] shadow-[inset_-3px_0_6px_rgba(0,0,0,.45)] transition-transform duration-300",
                      open && "cursor-pointer hover:-translate-y-3",
                      active && "-translate-y-5 ring-2 ring-amber-300/80",
                    )}
                    style={{ width: bk.width, height: bk.height, maxHeight: "94%", background: bk.color, color: bk.textColor }}
                  >
                    <span className="absolute inset-x-0 top-2 mx-auto block h-[2px] w-3/4 bg-current opacity-50" />
                    <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 text-[13px] font-bold tracking-wide [text-orientation:mixed] [writing-mode:vertical-rl]">
                      <span className="rotate-180 whitespace-nowrap">{bk.title}</span>
                    </span>
                    <span className="absolute inset-x-0 bottom-2 mx-auto block h-[2px] w-3/4 bg-current opacity-50" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Doors */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-[4vmin] [perspective:1800px]">
        <div className="relative h-full max-h-[760px] w-full max-w-[1100px] [transform-style:preserve-3d]">
          <div ref={leftRef} className={cn(doorBase, "left-0 origin-left rounded-l-sm")}>
            <DoorPanel side="left" />
          </div>
          <div ref={rightRef} className={cn(doorBase, "right-0 origin-right rounded-r-sm")}>
            <DoorPanel side="right" />
          </div>
        </div>
      </div>

      {/* Title on the doors */}
      <div ref={titleRef} className="pointer-events-none absolute inset-0 flex items-center justify-center px-[6%] text-center">
        <span className="text-[clamp(30px,7vw,92px)] font-bold leading-none tracking-[0.06em] text-[#f1d9a6]"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,.7)" }}>
          {title}
        </span>
      </div>

      {/* Tagline */}
      <div ref={taglineRef} className="pointer-events-none absolute inset-x-0 top-[3vh] flex justify-center opacity-0">
        <span className="flex items-center gap-2 text-[clamp(16px,2.2vw,26px)] italic text-[#f1d9a6]">
          <BookOpen className="size-5" /> {tagline}
        </span>
      </div>

      {/* Hint */}
      <div ref={hintRef} className="pointer-events-none absolute bottom-[clamp(20px,6vh,48px)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#f1d9a6]/80 transition-opacity duration-500">
        <span>{scrollHint}</span>
        <ChevronDown className="size-5 animate-bounce" />
      </div>

      {/* Detail card */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-4 mx-auto w-[min(92vw,520px)] rounded-lg border border-amber-200/20 bg-black/75 p-4 text-[#f3e9dc] backdrop-blur transition-all duration-300",
          selected ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {selected && (
          <>
            <button type="button" aria-label="Închide" onClick={() => setSelected(null)} className="absolute right-2 top-2 rounded p-1 text-white/60 hover:text-white">
              <X className="size-4" />
            </button>
            <h3 className="text-lg font-bold">{selected.title}</h3>
            <p className="text-sm text-amber-200/80">{selected.author} · citită ✓</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{selected.blurb}</p>
          </>
        )}
      </div>

      {/* Progress line */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
        <div ref={barRef} className="h-full origin-left bg-amber-200/80" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  )
}

function DoorPanel({ side }: { side: "left" | "right" }) {
  return (
    <div className="relative h-full w-full p-5">
      <div className="h-full w-full border-4 border-[#2a170d]/80 shadow-[inset_0_0_30px_rgba(0,0,0,.5)]" />
      <div
        className={cn("absolute top-1/2 h-24 w-3 -translate-y-1/2 rounded bg-gradient-to-b from-[#e4c47a] to-[#9a7430] shadow-lg", side === "left" ? "right-4" : "left-4")}
      />
    </div>
  )
}
