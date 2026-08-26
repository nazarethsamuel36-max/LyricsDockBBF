import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { PresentationRenderer } from '../presentation/PresentationRenderer'
import type { Presentation } from '../presentation/PresentationTypes'
import { getSongById } from '../services/DataService'
import { getCurrentRoom, getDeviceId } from '../services/RoomService'

function PresentationPanel() {
  const currentSongId = useStore((s) => s.currentSongId)
  const currentSectionIndex = useStore((s) => s.currentSectionIndex)
  const currentSlideIndex = useStore((s) => s.currentSlideIndex)
  const presentationDensity = 2
  const setCurrentSectionIndex = useStore((s) => s.setCurrentSectionIndex)
  const setCurrentSlideIndex = useStore((s) => s.setCurrentSlideIndex)
  const resetPresentation = useStore((s) => s.resetPresentation)
  const setlist = useStore((s) => s.setlist)
  const setCurrentSongId = useStore((s) => s.setCurrentSongId)

  // Live states
  const liveSongId = useStore((s) => s.liveSongId)
  const liveSectionIndex = useStore((s) => s.liveSectionIndex)
  const liveSlideIndex = useStore((s) => s.liveSlideIndex)
  const setLiveSlide = useStore((s) => s.setLiveSlide)
  const isLiveActive = useStore((s) => s.isLiveActive)
  const setIsLiveActive = useStore((s) => s.setIsLiveActive)

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [loading, setLoading] = useState(false)
  const [songTitle, setSongTitle] = useState<string>('')

  // ── Auto Scroll Active Slide ─────────────────────────────────────────────
  useEffect(() => {
    const activeEl = document.getElementById(`slide-${currentSectionIndex}-${currentSlideIndex}`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentSectionIndex, currentSlideIndex])

  // ── Keyboard navigation & Live control ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter: Toggle live state
      if (e.key === 'Enter') {
        e.preventDefault()
        if (isLiveActive) {
          // If already live, toggle OFF
          setIsLiveActive(false)
        } else {
          // If not live, toggle ON for currently selected slide
          setLiveSlide(currentSongId, currentSectionIndex, currentSlideIndex)
          setIsLiveActive(true)
        }
        return
      }

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()

      if (e.key === 'ArrowUp') {
        if (!presentation) return
        const currentSection = presentation.sections[currentSectionIndex]
        if (!currentSection) return
        
        let nextSec = currentSectionIndex
        let nextSlide = currentSlideIndex

        if (currentSlideIndex > 0) {
          nextSlide = currentSlideIndex - 1
        } else if (currentSectionIndex > 0) {
          const prev = presentation.sections[currentSectionIndex - 1]
          nextSec = currentSectionIndex - 1
          nextSlide = prev.slides.length - 1
        } else {
          return // Already at first slide
        }

        setCurrentSectionIndex(nextSec)
        setCurrentSlideIndex(nextSlide)
        
        // Inherit live state if active
        if (isLiveActive) {
          setLiveSlide(currentSongId, nextSec, nextSlide)
        }
      }

      if (e.key === 'ArrowDown') {
        if (!presentation) return
        const currentSection = presentation.sections[currentSectionIndex]
        if (!currentSection) return
        
        let nextSec = currentSectionIndex
        let nextSlide = currentSlideIndex

        if (currentSlideIndex < currentSection.slides.length - 1) {
          nextSlide = currentSlideIndex + 1
        } else if (currentSectionIndex < presentation.sections.length - 1) {
          nextSec = currentSectionIndex + 1
          nextSlide = 0
        } else {
          return // Already at last slide
        }

        setCurrentSectionIndex(nextSec)
        setCurrentSlideIndex(nextSlide)
        
        // Inherit live state if active
        if (isLiveActive) {
          setLiveSlide(currentSongId, nextSec, nextSlide)
        }
      }

      if (e.key === 'ArrowLeft') {
        if (setlist.length === 0 || currentSongId === null) return
        const songItems = setlist.filter(i => i.type !== 'marker' && i.songId !== null)
        const idx = songItems.findIndex(i => i.songId === currentSongId)
        if (idx > 0 && songItems[idx - 1].songId) {
          setIsLiveActive(false) // Always turn Live OFF when switching songs
          setCurrentSongId(songItems[idx - 1].songId!)
          resetPresentation()
        }
      }

      if (e.key === 'ArrowRight') {
        if (setlist.length === 0 || currentSongId === null) return
        const songItems = setlist.filter(i => i.type !== 'marker' && i.songId !== null)
        const idx = songItems.findIndex(i => i.songId === currentSongId)
        if (idx < songItems.length - 1 && songItems[idx + 1].songId) {
          setIsLiveActive(false) // Always turn Live OFF when switching songs
          setCurrentSongId(songItems[idx + 1].songId!)
          resetPresentation()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presentation, currentSectionIndex, currentSlideIndex, setlist, currentSongId, isLiveActive,
      setCurrentSectionIndex, setCurrentSlideIndex, setCurrentSongId, resetPresentation, setLiveSlide, setIsLiveActive])

  // ── Load presentation (Resets selection, sets Live = OFF) ────────────────
  useEffect(() => {
    if (!currentSongId) {
      setPresentation(null)
      setSongTitle('')
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const song = await getSongById(currentSongId)
        if (cancelled) return
        setSongTitle(song?.title ?? '')
        if (song?.display) {
          setPresentation(PresentationRenderer.render(song.display, presentationDensity))
        } else {
          setPresentation(null)
        }
        
        // Select the first slide when a song is opened. The store already resets live state
        // during song selection, so do not send a second SET_LIVE(false) command here.
        setCurrentSectionIndex(0)
        setCurrentSlideIndex(0)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load presentation:', err)
        setPresentation(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentSongId, presentationDensity])

  // ── Broadcast active live slide (or empty state if Live = OFF) ────────────
  useEffect(() => {
    if (getCurrentRoom().roomId) return

    const channel = new BroadcastChannel('song-viewer')
    
    if (isLiveActive && presentation && liveSongId === currentSongId) {
      const section = presentation.sections[liveSectionIndex]
      const slide = section?.slides[liveSlideIndex]
      if (slide) {
        channel.postMessage({
          type: 'SELECT_BLOCK',
          blockId: 'dynamic',
          roomId: getCurrentRoom().roomId,
          senderDeviceId: getDeviceId(),
          title: section.title,
          lines: slide.lines.map(l => l.text)
        })
      } else {
        channel.postMessage({
          type: 'SELECT_BLOCK',
          blockId: 'dynamic',
          roomId: getCurrentRoom().roomId,
          senderDeviceId: getDeviceId(),
          title: '',
          lines: []
        })
      }
    } else {
      channel.postMessage({
        type: 'SELECT_BLOCK',
        blockId: 'dynamic',
        roomId: getCurrentRoom().roomId,
        senderDeviceId: getDeviceId(),
        title: '',
        lines: []
      })
    }
    channel.close()
  }, [presentation, liveSongId, liveSectionIndex, liveSlideIndex, currentSongId, isLiveActive])

  // ── Click toggles slide Live / deselect ──────────────────────────────────
  const handleSlideClick = (sectionIndex: number, slideIndex: number) => {
    const alreadyLive =
      isLiveActive &&
      currentSongId === liveSongId &&
      sectionIndex === liveSectionIndex &&
      slideIndex === liveSlideIndex

    setCurrentSectionIndex(sectionIndex)
    setCurrentSlideIndex(slideIndex)

    if (alreadyLive) {
      // Click again on the live slide → clear screen
      setIsLiveActive(false)
    } else {
      // Click a new (or inactive) slide → make it live
      setLiveSlide(currentSongId, sectionIndex, slideIndex)
      setIsLiveActive(true)
    }
  }

  const isLastSlide =
    presentation
      ? currentSectionIndex === presentation.sections.length - 1 &&
        currentSlideIndex === presentation.sections[presentation.sections.length - 1].slides.length - 1
      : true

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#121214] text-zinc-100">

      {/* ── Top bar ── song title + density toggle ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#121214]">
        <div className="min-w-0">
          {songTitle ? (
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{songTitle}</h2>
          ) : (
            <span className="text-sm text-zinc-500">No song selected</span>
          )}
        </div>

        <span className="flex-shrink-0 ml-4 text-[11px] uppercase tracking-wider text-zinc-500">2 lines</span>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-500 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-800 border-t-zinc-500 animate-spin" />
            Loading…
          </div>
        ) : !currentSongId ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Select a song to begin
          </div>
        ) : !presentation ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No display content for this song
          </div>
        ) : (
          presentation.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="px-4">
              {/* Section heading */}
              <div className="pt-5 pb-1 border-b border-zinc-850">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {section.title}
                </span>
              </div>

              {/* Slides */}
              <div className="divide-y divide-zinc-850/60">
                {section.slides.map((slide, slideIndex) => {
                  const isSelected = sectionIndex === currentSectionIndex && slideIndex === currentSlideIndex
                  const isLive = isLiveActive && currentSongId === liveSongId && sectionIndex === liveSectionIndex && slideIndex === liveSlideIndex

                  return (
                    <div
                      key={slideIndex}
                      id={`slide-${sectionIndex}-${slideIndex}`}
                      onClick={() => handleSlideClick(sectionIndex, slideIndex)}
                      className={`my-1.5 cursor-pointer transition-all ${
                        isLive
                          ? 'bg-zinc-800 border border-green-500/80 shadow-[inset_0_0_12px_rgba(74,222,128,0.25)] rounded-xl px-4 py-3'
                          : isSelected
                            ? 'bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-3'
                            : 'border border-transparent py-2.5 px-4 hover:bg-zinc-800/10'
                      }`}
                    >
                      {/* Lyric lines */}
                      <div className="space-y-1">
                        {slide.lines.map((line, lineIndex) => (
                          <div
                            key={lineIndex}
                            className={`text-sm leading-relaxed transition-colors ${
                              isLive
                                ? 'text-white font-medium'
                                : isSelected
                                  ? 'text-zinc-200'
                                  : 'text-zinc-400'
                            }`}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Bottom nav ── Prev / Next (Selection only) ── */}
      {presentation && (
        <div className="flex-shrink-0 flex border-t border-zinc-800/80 bg-[#121214]">
          <button
            onClick={() => {
              let nextSec = currentSectionIndex
              let nextSlide = currentSlideIndex

              if (currentSlideIndex > 0) {
                nextSlide = currentSlideIndex - 1
              } else if (currentSectionIndex > 0) {
                const prev = presentation.sections[currentSectionIndex - 1]
                nextSec = currentSectionIndex - 1
                nextSlide = prev.slides.length - 1
              } else {
                return
              }

              setCurrentSectionIndex(nextSec)
              setCurrentSlideIndex(nextSlide)
              if (isLiveActive) {
                setLiveSlide(currentSongId, nextSec, nextSlide)
              }
            }}
            disabled={currentSectionIndex === 0 && currentSlideIndex === 0}
            className="flex-1 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <div className="w-px bg-zinc-800/80" />
          <button
            onClick={() => {
              const s = presentation.sections[currentSectionIndex]
              let nextSec = currentSectionIndex
              let nextSlide = currentSlideIndex

              if (currentSlideIndex < s.slides.length - 1) {
                nextSlide = currentSlideIndex + 1
              } else if (currentSectionIndex < presentation.sections.length - 1) {
                nextSec = currentSectionIndex + 1
                nextSlide = 0
              } else {
                return
              }

              setCurrentSectionIndex(nextSec)
              setCurrentSlideIndex(nextSlide)
              if (isLiveActive) {
                setLiveSlide(currentSongId, nextSec, nextSlide)
              }
            }}
            disabled={isLastSlide}
            className="flex-1 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PresentationPanel
