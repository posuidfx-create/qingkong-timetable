import { useEffect, useRef, useState } from "react"

import type { WallpaperDefinition } from "@/data/wallpapers"
import type { WallpaperMotionPreference } from "@/lib/wallpaperMotion"
import { resolveVideoWallpaperFallback, shouldMountWallpaperVideo, shouldPlayWallpaperVideo } from "@/lib/wallpaperRender"

function getMediaPreference(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches
}

interface WallpaperLayerProps {
  wallpaper: WallpaperDefinition
  motionPreference: WallpaperMotionPreference
  reducedMotionOverride?: boolean
}

function getSaveDataPreference(): boolean {
  if (typeof navigator === "undefined") return false
  return "connection" in navigator && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
}

export function WallpaperLayer({ wallpaper, motionPreference, reducedMotionOverride }: WallpaperLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failedVideoId, setFailedVideoId] = useState<string>()
  const [activeVideoId, setActiveVideoId] = useState<string>()
  const [failedPosterId, setFailedPosterId] = useState<string>()
  const [failedImageId, setFailedImageId] = useState<string>()
  const [reducedMotion, setReducedMotion] = useState(() => getMediaPreference("(prefers-reduced-motion: reduce)"))
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === "undefined" ? 0 : window.innerWidth)
  const [saveData, setSaveData] = useState(getSaveDataPreference)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    const updateViewport = () => setViewportWidth(window.innerWidth)
    const updateSaveData = () => setSaveData(getSaveDataPreference())
    update()
    updateViewport()
    updateSaveData()
    media.addEventListener("change", update)
    window.addEventListener("resize", updateViewport)
    return () => {
      media.removeEventListener("change", update)
      window.removeEventListener("resize", updateViewport)
    }
  }, [])

  const effectiveReducedMotion = reducedMotionOverride ?? reducedMotion
  const videoFailed = failedVideoId === wallpaper.id
  const videoActive = activeVideoId === wallpaper.id
  const posterFailed = failedPosterId === wallpaper.id
  const canMountVideo = shouldMountWallpaperVideo(wallpaper, { reducedMotion: effectiveReducedMotion, viewportWidth, videoFailed, saveData })
  const shouldPlayVideo = shouldPlayWallpaperVideo(wallpaper, { reducedMotion: effectiveReducedMotion, viewportWidth, videoFailed, userPaused: motionPreference === "paused", saveData })
  const showImage = wallpaper.type === "image" && wallpaper.src
  const imageSource = failedImageId === wallpaper.id ? wallpaper.fallbackSrc : wallpaper.src
  const videoFallback = resolveVideoWallpaperFallback(wallpaper, posterFailed)
  const showPoster = wallpaper.type === "video" && videoFallback === "poster"

  useEffect(() => {
    const video = videoRef.current
    if (!video || !canMountVideo) return

    const handlePlaying = () => setActiveVideoId(wallpaper.id)
    const handleError = () => setFailedVideoId(wallpaper.id)
    const handlePlayback = () => {
      if (!shouldPlayVideo) {
        video.pause()
        return
      }
      void video.play().catch(() => setFailedVideoId(wallpaper.id))
    }

    video.addEventListener("loadedmetadata", handlePlayback)
    video.addEventListener("loadeddata", handlePlayback)
    video.addEventListener("canplay", handlePlayback)
    video.addEventListener("playing", handlePlaying)
    video.addEventListener("error", handleError)
    handlePlayback()

    return () => {
      video.removeEventListener("loadedmetadata", handlePlayback)
      video.removeEventListener("loadeddata", handlePlayback)
      video.removeEventListener("canplay", handlePlayback)
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("error", handleError)
    }
  }, [canMountVideo, shouldPlayVideo, wallpaper.id])

  return <div aria-hidden="true" className="wallpaper-layer" data-motion={effectiveReducedMotion ? "reduced" : motionPreference} data-video-active={videoActive || undefined} data-wallpaper={wallpaper.id}>
    {wallpaper.type === "css" ? <svg className="wallpaper-filter-defs" focusable="false">
      <defs>
        <filter id="water-caustics-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence baseFrequency="0.008 0.015" numOctaves="2" seed="17" type="fractalNoise" result="waterNoise" />
          <feDisplacementMap in="SourceGraphic" in2="waterNoise" scale="34" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </defs>
    </svg> : null}
    {showPoster ? <img alt="" className="wallpaper-poster" onError={() => setFailedPosterId(wallpaper.id)} src={wallpaper.poster} /> : null}
    {canMountVideo ? <video key={wallpaper.id} loop muted playsInline preload="metadata" ref={videoRef} src={wallpaper.src} /> : null}
    {showImage && imageSource ? <img alt="" onError={() => setFailedImageId(wallpaper.id)} src={imageSource} /> : null}
    {wallpaper.type === "css" ? <span className="wallpaper-water-base" /> : null}
    <span className="wallpaper-refraction" />
    <span className="wallpaper-caustics" />
    {wallpaper.type === "css" ? <span className="wallpaper-caustics-secondary" /> : null}
    <span className="wallpaper-ripples"><i /><i /><i /></span>
    <span className="wallpaper-haze" />
  </div>
}
