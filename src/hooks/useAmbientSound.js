/**
 * useAmbientSound — manages ambient audio (rain / white noise)
 * Uses Web Audio API to generate sounds procedurally — no external files needed.
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export const SOUNDS = {
  none:       { label: 'None',        icon: '🔇' },
  rain:       { label: 'Rain',        icon: '🌧️' },
  whiteNoise: { label: 'White Noise', icon: '〰️' },
  forest:     { label: 'Forest',      icon: '🌲' },
  cafe:       { label: 'Café',        icon: '☕' },
}

export function useAmbientSound() {
  const [activeSound, setActiveSound] = useState('none')
  const [volume, setVolume]           = useState(0.3)
  const ctxRef     = useRef(null)
  const nodesRef   = useRef([])

  const stopAll = useCallback(() => {
    nodesRef.current.forEach(n => {
      try { n.stop?.(); n.disconnect?.() } catch { /* ignore */ }
    })
    nodesRef.current = []
  }, [])

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const playRain = useCallback((ctx, vol) => {
    // Pink-ish noise for rain
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759
      b2=0.96900*b2+white*0.1538520; b3=0.86650*b3+white*0.3104856
      b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980
      data[i]=(b0+b1+b2+b3+b4+b5+b6+white*0.5362)*0.11
      b6=white*0.115926
    }
    const src    = ctx.createBufferSource()
    src.buffer   = buffer
    src.loop     = true
    const filter = ctx.createBiquadFilter()
    filter.type  = 'lowpass'
    filter.frequency.value = 600
    const gain   = ctx.createGain()
    gain.gain.value = vol * 2
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    src.start()
    return [src, gain]
  }, [])

  const playWhiteNoise = useCallback((ctx, vol) => {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src  = ctx.createBufferSource()
    src.buffer = buffer
    src.loop   = true
    const gain = ctx.createGain()
    gain.gain.value = vol * 0.15
    src.connect(gain); gain.connect(ctx.destination)
    src.start()
    return [src, gain]
  }, [])

  const playForest = useCallback((ctx, vol) => {
    // Gentle brown noise + occasional chirp-like oscillation
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    const src    = ctx.createBufferSource()
    src.buffer   = buffer
    src.loop     = true
    const filter = ctx.createBiquadFilter()
    filter.type  = 'lowpass'
    filter.frequency.value = 800
    const gain   = ctx.createGain()
    gain.gain.value = vol * 2
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    src.start()
    return [src, gain]
  }, [])

  const playCafe = useCallback((ctx, vol) => {
    // Filtered white noise simulating café ambience
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src    = ctx.createBufferSource()
    src.buffer   = buffer
    src.loop     = true
    const bp     = ctx.createBiquadFilter()
    bp.type      = 'bandpass'
    bp.frequency.value  = 1200
    bp.Q.value          = 0.5
    const gain   = ctx.createGain()
    gain.gain.value = vol * 0.12
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination)
    src.start()
    return [src, gain]
  }, [])

  const play = useCallback((soundKey) => {
    stopAll()
    if (soundKey === 'none') {
      setActiveSound('none')
      return
    }
    const ctx = getCtx()
    let nodes = []
    if      (soundKey === 'rain')       nodes = playRain(ctx, volume)
    else if (soundKey === 'whiteNoise') nodes = playWhiteNoise(ctx, volume)
    else if (soundKey === 'forest')     nodes = playForest(ctx, volume)
    else if (soundKey === 'cafe')       nodes = playCafe(ctx, volume)
    nodesRef.current = nodes
    setActiveSound(soundKey)
  }, [volume, stopAll, getCtx, playRain, playWhiteNoise, playForest, playCafe])

  const updateVolume = useCallback((vol) => {
    setVolume(vol)
    // Update running gain nodes
    nodesRef.current.forEach(n => {
      if (n.gain) {
        n.gain.value = vol * (activeSound === 'whiteNoise' || activeSound === 'cafe' ? 0.15 : 2)
      }
    })
  }, [activeSound])

  // Cleanup on unmount
  useEffect(() => () => {
    stopAll()
    ctxRef.current?.close()
  }, [stopAll])

  return { activeSound, volume, play, updateVolume, SOUNDS }
}
