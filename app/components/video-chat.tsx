"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, Users, Search, X } from "lucide-react"

const WEBSOCKET_URL =
  process.env.NODE_ENV === "production" ? "wss://annochat.social/video" : "ws://localhost:5000/video"

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
]

interface VideoChatProps {
  onBack: () => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "searching" | "matched" | "in-call"

export default function VideoChat({ onBack }: VideoChatProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")

  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isInCall, setIsInCall] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Draggable local video state
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoContainerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const [roomId, setRoomId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [role, setRole] = useState<"caller" | "callee" | null>(null)

  // Audio gain control for microphone sensitivity adjustment
  const [microphoneGain, setMicrophoneGain] = useState(0.7) // Default to 70% gain

  // Audio level monitoring
  const [audioLevel, setAudioLevel] = useState(0)
  const audioAnalyserRef = useRef<AnalyserNode | null>(null)
  const audioLevelIntervalRef = useRef<number | null>(null)

  // Debug state
  // const [debugMode, setDebugMode] = useState(false)
  // const [cameraTestResults, setCameraTestResults] = useState<any[]>([])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Calculate safe position based on current state and screen size
  const calculateSafePosition = () => {
    const mobile = window.innerWidth <= 768

    // Smaller dimensions for mobile to ensure it fits
    const containerWidth = mobile ? 100 : 192
    const containerHeight = mobile ? 133 : 144
    const margin = mobile ? 12 : 16

    // Calculate available space based on screen state
    let availableWidth = window.innerWidth
    let availableHeight = window.innerHeight

    if (mobile) {
      // For mobile, account for header and controls
      const headerHeight = isInCall ? 0 : 80 // Header hidden in call
      const controlsHeight = connectionStatus === "searching" || connectionStatus === "matched" || isInCall ? 80 : 0
      availableHeight = window.innerHeight - headerHeight - controlsHeight - 20 // Extra padding
    } else {
      // For desktop, use video container if available
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect()
        availableWidth = rect.width
        availableHeight = rect.height
      } else {
        // Fallback for desktop
        availableHeight = window.innerHeight - 160 // Account for header/controls
      }
    }

    const maxX = Math.max(margin, availableWidth - containerWidth - margin)
    const maxY = Math.max(margin, availableHeight - containerHeight - margin)

    return {
      x: Math.max(margin, maxX),
      y: Math.max(margin, maxY),
      containerWidth,
      containerHeight,
      margin,
    }
  }

  // Check if mobile and set initial position
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)

      // Set position using safe calculation
      setTimeout(() => {
        const { x, y } = calculateSafePosition()
        setLocalVideoPosition({ x, y })
      }, 150) // Slightly longer delay to ensure layout is ready
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [connectionStatus, isInCall]) // Recalculate when state changes

  // Handle window resize and state changes
  useEffect(() => {
    const handleResize = () => {
      const { x, y } = calculateSafePosition()
      setLocalVideoPosition((prev) => {
        const safePos = calculateSafePosition()
        return {
          x: Math.max(safePos.margin, Math.min(prev.x, safePos.x)),
          y: Math.max(safePos.margin, Math.min(prev.y, safePos.y)),
        }
      })
    }

    window.addEventListener("resize", handleResize)

    // Recalculate position when video becomes visible
    if (connectionStatus === "searching" || connectionStatus === "matched" || isInCall) {
      setTimeout(handleResize, 100)
    }

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [connectionStatus, isInCall])

  // Draggable functionality for local video
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.classList.remove("smooth-transition")
    }

    setDragStart({
      x: e.clientX - localVideoPosition.x,
      y: e.clientY - localVideoPosition.y,
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.classList.remove("smooth-transition")
    }

    const touch = e.touches[0]
    setDragStart({
      x: touch.clientX - localVideoPosition.x,
      y: touch.clientY - localVideoPosition.y,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      const { x: maxX, y: maxY, margin } = calculateSafePosition()

      const finalX = Math.max(margin, Math.min(newX, maxX))
      const finalY = Math.max(margin, Math.min(newY, maxY))

      setLocalVideoPosition({ x: finalX, y: finalY })
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault()
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y

      const { x: maxX, y: maxY, margin } = calculateSafePosition()

      const finalX = Math.max(margin, Math.min(newX, maxX))
      const finalY = Math.max(margin, Math.min(newY, maxY))

      setLocalVideoPosition({ x: finalX, y: finalY })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      if (localVideoContainerRef.current) {
        localVideoContainerRef.current.classList.add("smooth-transition")
      }

      const { x: maxX, y: maxY, margin } = calculateSafePosition()

      let finalX = localVideoPosition.x
      let finalY = localVideoPosition.y

      // Snap to corners/edges
      const snapThreshold = 60
      const distanceFromBottom = maxY - finalY
      const distanceFromRight = maxX - finalX

      if (distanceFromBottom < snapThreshold && distanceFromRight < snapThreshold) {
        // Snap to bottom right corner (WhatsApp style)
        finalX = maxX
        finalY = maxY
      } else {
        // Snap to nearest edge
        const distanceFromLeft = finalX - margin
        const distanceFromTop = finalY - margin

        if (distanceFromLeft < snapThreshold) {
          finalX = margin
        } else if (distanceFromRight < snapThreshold) {
          finalX = maxX
        }

        if (distanceFromTop < snapThreshold) {
          finalY = margin
        } else if (distanceFromBottom < snapThreshold) {
          finalY = maxY
        }
      }

      setLocalVideoPosition({ x: finalX, y: finalY })
    }

    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove)
      document.addEventListener("touchend", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleMouseUp)
      }
    }
  }, [isDragging, dragStart, localVideoPosition])

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    // Stop audio level monitoring
    stopAudioLevelMonitoring()

    setIsVideoEnabled(true)
    setIsAudioEnabled(true)
    setIsInCall(false)
    setIsProcessing(false)
    setConnectionStatus("disconnected")
    setStatusMessage("")
    setError("")
    setRoomId(null)
    setPartnerId(null)
    setRole(null)
  }

  const connectToServer = async () => {
    try {
      setConnectionStatus("connecting")
      setStatusMessage("Getting authorization...")
      setError("")

      // Fetch token from API
      const tokenResponse = await fetch("/api/video-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        if (tokenResponse.status === 429) {
          setError(`Rate limit exceeded. Try again in ${errorData.retryAfter} seconds.`)
        } else {
          setError(errorData.message || "Failed to get authorization")
        }
        setConnectionStatus("disconnected")
        return
      }

      const { token, signature, expiresAt } = await tokenResponse.json()

      setStatusMessage("Connecting to server...")

      const ws = new WebSocket(`${WEBSOCKET_URL}?token=${token}&signature=${signature}&expiresAt=${expiresAt}`)

      ws.onopen = () => {
        setConnectionStatus("connected")
        setStatusMessage("Connected to server")
        wsRef.current = ws
      }

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)
          await handleServerMessage(message)
        } catch (error) {
          console.error("Error parsing server message:", error)
        }
      }

      ws.onclose = () => {
        setConnectionStatus("disconnected")
        setStatusMessage("Disconnected from server")
        wsRef.current = null
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setError("Connection error")
        setConnectionStatus("disconnected")
      }
    } catch (error) {
      console.error("Error connecting to server:", error)
      setError("Failed to connect to server")
      setConnectionStatus("disconnected")
    }
  }

  const handleServerMessage = async (message: any) => {
    const { event, data } = message

    switch (event) {
      case "connected":
        break

      case "searching":
        setConnectionStatus("searching")
        setStatusMessage("Searching for a match...")
        setError("")
        setIsProcessing(false)
        break

      case "search-canceled":
        setConnectionStatus("connected")
        setStatusMessage("Search canceled")
        setError("")
        break

      case "match-found":
        setConnectionStatus("matched")
        setStatusMessage("Match found! Preparing video call...")
        setError("")
        setRoomId(data.roomId)
        setPartnerId(data.partnerId)
        setRole(data.role)
        await initializeCall(data.role === "caller")
        break

      case "webrtc-offer":
        await handleWebRTCOffer(data)
        break

      case "webrtc-answer":
        await handleWebRTCAnswer(data)
        break

      case "webrtc-ice-candidate":
        await handleWebRTCIceCandidate(data)
        break

      case "partner-left":
      case "partner-disconnected":
        handlePartnerLeft()
        break

      case "call-ended":
        handleCallEnded()
        break

      case "error":
        setError(data.message || "Unknown error")
        break

      default:
        console.log("Unknown server message:", event, data)
    }
  }

  const findMatch = async () => {
    if (!wsRef.current || connectionStatus !== "connected" || isProcessing) {
      if (connectionStatus !== "connected") {
        setError("Not connected to server")
      } else if (isProcessing) {
        setError("Please wait, processing your request...")
      }
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, min: 20, max: 60 }, // Prioritize higher frame rates
          aspectRatio: { ideal: 16 / 9 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
        },
      })

      // Apply additional audio processing for better noise suppression
      const streamAudioTrack = stream.getAudioTracks()[0]
      if (streamAudioTrack) {
        // Apply standard constraints for better noise suppression
        try {
          await streamAudioTrack.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          })
        } catch (constraintError) {
          console.log("Audio constraints not supported, using defaults")
        }
        streamAudioTrack.enabled = isAudioEnabled
      }

      // Start audio level monitoring for visual feedback
      startAudioLevelMonitoring(stream)

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Start basic audio level monitoring (removed aggressive processing)
      startAudioLevelMonitoring(stream)

      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]

      // Log actual captured video settings and capabilities
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        const capabilities = videoTrack.getCapabilities()

        // Apply optimal frame rate based on capabilities
        if (capabilities.frameRate?.max && capabilities.frameRate.max > (settings.frameRate || 0)) {
          try {
            // Use the maximum supported frame rate, but cap at 30fps for WebRTC stability
            const optimalFrameRate = Math.min(30, capabilities.frameRate.max)

            await videoTrack.applyConstraints({
              frameRate: {
                ideal: optimalFrameRate,
                min: Math.max(20, settings.frameRate || 10),
              },
              width: settings.width,
              height: settings.height,
            })

            // Wait for settings to apply
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } catch (error) {
            // Silently handle frame rate constraint errors
          }
        }

        videoTrack.enabled = isVideoEnabled
      }

      if (audioTrack) {
        audioTrack.enabled = isAudioEnabled
      }

      wsRef.current.send(JSON.stringify({ event: "find-match" }))

      setConnectionStatus("searching")
      setStatusMessage("Getting ready...")
    } catch (error) {
      console.error("Error accessing media devices:", error)
      setError("Unable to access camera/microphone. Please check permissions.")
      setIsProcessing(false)
    }
  }

  
  const cancelSearch = () => {
    if (!wsRef.current) return

    wsRef.current.send(JSON.stringify({ event: "cancel-search" }))

    // Stop audio level monitoring
    stopAudioLevelMonitoring()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
  }

  const initializeCall = async (isInitiator: boolean) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        // Optimize for better frame rates and audio quality
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      })
      peerConnectionRef.current = peerConnection

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          const sender = peerConnection.addTrack(track, localStreamRef.current!)

          // Optimize audio encoding for better quality
          if (track.kind === "audio") {
            const params = sender.getParameters()
            if (!params.encodings) params.encodings = [{}]

            // Configure audio parameters for good quality
            params.encodings[0].maxBitrate = 64000 // 64 kbps for good audio quality
            
            sender.setParameters(params).catch(console.error)
          }

          // Optimize video encoding for higher frame rates
          if (track.kind === "video") {
            const settings = track.getSettings()

            const params = sender.getParameters()
            if (!params.encodings) params.encodings = [{}]

            // Set encoding parameters to match our camera settings
            const targetFrameRate = Math.min(30, settings.frameRate || 10)
            params.encodings[0].maxFramerate = targetFrameRate
            params.encodings[0].scaleResolutionDownBy = 1.0 // Don't downscale

            // Set bitrate to support higher frame rates
            if (settings.width && settings.height) {
              const pixelsPerSecond = settings.width * settings.height * targetFrameRate
              const estimatedBitrate = Math.min(2500000, pixelsPerSecond * 0.1) // Cap at 2.5Mbps
              params.encodings[0].maxBitrate = estimatedBitrate
            }

            sender.setParameters(params).catch(console.error)
          }
        })
      }

      peerConnection.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0]
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
        setIsInCall(true)
        setConnectionStatus("in-call")
        setStatusMessage("Connected!")
        setError("")
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              event: "webrtc-ice-candidate",
              data: { candidate: event.candidate },
            }),
          )
        }
      }

      if (isInitiator) {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await peerConnection.setLocalDescription(offer)

        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              event: "webrtc-offer",
              data: { offer },
            }),
          )
        }
      }
    } catch (error) {
      console.error("Error initializing call:", error)
      setError("Failed to initialize video call")
    }
  }

  const handleWebRTCOffer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return

      await peerConnectionRef.current.setRemoteDescription(data.offer)
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)

      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            event: "webrtc-answer",
            data: { answer },
          }),
        )
      }
    } catch (error) {
      console.error("Error handling WebRTC offer:", error)
      setError("Failed to handle video call offer")
    }
  }

  const handleWebRTCAnswer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return
      await peerConnectionRef.current.setRemoteDescription(data.answer)
    } catch (error) {
      console.error("Error handling WebRTC answer:", error)
      setError("Failed to handle video call answer")
    }
  }

  const handleWebRTCIceCandidate = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return
      await peerConnectionRef.current.addIceCandidate(data.candidate)
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const leaveCall = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ event: "leave-call" }))
    }
    handleCallEnded()
  }

  const handlePartnerLeft = () => {
    setStatusMessage("Partner left the call")
    setIsInCall(false)
    setConnectionStatus("connected")

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    remoteStreamRef.current = null

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    setIsVideoEnabled(true)
    setIsAudioEnabled(true)
    setIsProcessing(false)

    setRoomId(null)
    setPartnerId(null)
    setRole(null)
  }

  const handleCallEnded = () => {
    setStatusMessage("Call ended")
    setIsInCall(false)
    setConnectionStatus("connected")

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    remoteStreamRef.current = null

    setIsVideoEnabled(true)
    setIsAudioEnabled(true)
    setIsProcessing(false)

    setRoomId(null)
    setPartnerId(null)
    setRole(null)
  }

  const disconnect = () => {
    cleanup()
    setConnectionStatus("disconnected")
    setStatusMessage("")
    setError("")
  }

  // Camera diagnostics and frame rate testing (removed for production)
  // const testCameraCapabilities = async (videoTrack: MediaStreamTrack) => { ... }

  // Monitor video stats for debugging
  useEffect(() => {
    if (!isInCall || !peerConnectionRef.current) return

    let lastInboundBytes = 0
    let lastOutboundBytes = 0
    let lastTimestamp = 0

    const interval = setInterval(() => {
      peerConnectionRef.current
        ?.getStats(null)
        .then((stats) => {
          const currentTime = Date.now()

          stats.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              const bytesDiff = report.bytesReceived - lastInboundBytes
              const timeDiff = (currentTime - lastTimestamp) / 1000
              const bitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff : 0

              lastInboundBytes = report.bytesReceived
            }

            if (report.type === "outbound-rtp" && report.kind === "video") {
              const bytesDiff = report.bytesSent - lastOutboundBytes
              const timeDiff = (currentTime - lastTimestamp) / 1000
              const bitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff : 0

              lastOutboundBytes = report.bytesSent
            }

            if (report.type === "media-source" && report.kind === "video") {
              // Check if local video source frame rate is sub-optimal
              if (report.framesPerSecond && report.framesPerSecond < 25) {
                // Trigger frame rate maintenance
                setTimeout(maintainOptimalFrameRate, 100)
              }
            }
          })

          lastTimestamp = currentTime
        })
        .catch((error) => {
          // Silently handle stats errors
        })
    }, 2000) // Check every 2 seconds

    return () => clearInterval(interval)
  }, [isInCall])

  // Monitor and maintain optimal frame rate during call
  const maintainOptimalFrameRate = () => {
    if (!localStreamRef.current) return

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    const settings = videoTrack.getSettings()
    const capabilities = videoTrack.getCapabilities()

    // Check if frame rate has dropped below optimal
    if (capabilities.frameRate?.max && settings.frameRate && settings.frameRate < 25) {
      const optimalFrameRate = Math.min(30, capabilities.frameRate.max)
      videoTrack
        .applyConstraints({
          frameRate: { ideal: optimalFrameRate },
        })
        .then(() => {
          // Frame rate restored silently
        })
        .catch((error) => {
          // Silently handle frame rate restoration errors
        })
    }
  }

  // Maintain optimal frame rate every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      maintainOptimalFrameRate()
    }, 2000)

    return () => clearInterval(interval)
  }, [isInCall, localStreamRef.current])

  // Noise gate to reduce background noise
  const createNoiseGate = (stream: MediaStream, threshold: number = -50) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      const gainNode = audioContext.createGain()
      const destination = audioContext.createMediaStreamDestination()

      // Configure analyser for noise detection
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8

      // Connect nodes
      source.connect(analyser)
      analyser.connect(gainNode)
      gainNode.connect(destination)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let isGateOpen = false
      let gateTimer = 0

      // Noise gate processing
      const processAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const volume = 20 * Math.log10(average / 255) // Convert to dB
        
        // Gate logic with hysteresis
        const openThreshold = threshold
        const closeThreshold = threshold - 10 // 10dB hysteresis
        
        if (volume > openThreshold && !isGateOpen) {
          isGateOpen = true
          gainNode.gain.setTargetAtTime(1, audioContext.currentTime, 0.01)
          gateTimer = 0
        } else if (volume < closeThreshold && isGateOpen) {
          gateTimer++
          // Close gate after 100ms of low volume
          if (gateTimer > 10) {
            isGateOpen = false
            gainNode.gain.setTargetAtTime(0.1, audioContext.currentTime, 0.05) // Reduce to 10% instead of complete cutoff
          }
        } else if (isGateOpen) {
          gateTimer = 0
        }
        
        requestAnimationFrame(processAudio)
      }
      
      processAudio()
      
      return destination.stream
    } catch (error) {
      console.warn("Noise gate not supported, using original stream:", error)
      return stream
    }
  }

  // Apply gain control to audio stream
  const applyGainControl = (stream: MediaStream, gainValue: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const gainNode = audioContext.createGain()
      const destination = audioContext.createMediaStreamDestination()

      // Set gain value (0.0 to 1.0)
      gainNode.gain.value = gainValue

      // Connect nodes
      source.connect(gainNode)
      gainNode.connect(destination)

      return destination.stream
    } catch (error) {
      console.warn("Gain control not supported:", error)
      return stream
    }
  }

  // Real-time gain adjustment
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Update gain in real-time when slider changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(microphoneGain, audioContextRef.current!.currentTime)
    }
  }, [microphoneGain])

  // Enhanced audio processing with real-time gain control
  const createAdvancedAudioProcessor = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const gainNode = audioContext.createGain()
      const analyser = audioContext.createAnalyser()
      const destination = audioContext.createMediaStreamDestination()

      // Configure nodes
      gainNode.gain.value = microphoneGain
      gainNodeRef.current = gainNode

      // Noise gate setup
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8

      // Connect nodes
      source.connect(gainNode)
      gainNode.connect(analyser)
      analyser.connect(destination)

      // Noise gate processing
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let isGateOpen = false
      let gateTimer = 0

      const processAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const volume = 20 * Math.log10(average / 255)
        
        // Adaptive threshold based on gain setting
        const threshold = -45 + (microphoneGain - 0.7) * 20
        const openThreshold = threshold
        const closeThreshold = threshold - 10
        
        if (volume > openThreshold && !isGateOpen) {
          isGateOpen = true
          gateTimer = 0
        } else if (volume < closeThreshold && isGateOpen) {
          gateTimer++
          if (gateTimer > 10) {
            isGateOpen = false
          }
        } else if (isGateOpen) {
          gateTimer = 0
        }
        
        // Apply gate
        const targetGain = isGateOpen ? microphoneGain : microphoneGain * 0.1
        gainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.05)
        
        // Update visual level indicator
        setAudioLevel(average / 255)
        
        requestAnimationFrame(processAudio)
      }
      
      processAudio()
      
      return destination.stream
    } catch (error) {
      console.warn("Advanced audio processing not supported:", error)
      return stream
    }
  }

  // Simplified audio level monitoring
  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      audioAnalyserRef.current = analyser
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const updateAudioLevel = () => {
        if (audioAnalyserRef.current) {
          audioAnalyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255) // Normalize to 0-1
        }
      }
      
      audioLevelIntervalRef.current = window.setInterval(updateAudioLevel, 100)
    } catch (error) {
      console.warn("Audio level monitoring not supported:", error)
    }
  }

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = null
    }
    audioAnalyserRef.current = null
    setAudioLevel(0)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-slate-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent_50%)]"></div>

      {/* Header Section */}
      <header
        className={`relative z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 transition-all duration-300 ${
          isInCall ? "hidden md:block" : ""
        }`}
      >
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="group p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                Video Chat
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Connect with people worldwide</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                connectionStatus === "connected"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/20 shadow-sm"
                  : connectionStatus === "searching"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-amber-500/20 shadow-sm animate-pulse"
                    : connectionStatus === "in-call"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-blue-500/20 shadow-sm"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400"
                      : connectionStatus === "searching"
                        ? "bg-amber-400 animate-pulse"
                        : connectionStatus === "in-call"
                          ? "bg-blue-400"
                          : "bg-slate-400"
                  }`}
                ></div>
                <span className="capitalize">{connectionStatus.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Video Section - Takes remaining space */}
      <div ref={videoContainerRef} className="flex-1 relative bg-slate-900 overflow-hidden">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover md:object-contain transition-opacity duration-500"
          style={{ display: isInCall ? "block" : "none" }}
        />

        {/* Local Video - Enhanced styling */}
        <div
          ref={localVideoContainerRef}
          className="absolute bg-slate-800/90 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-slate-600/40 shadow-2xl z-10 touch-none cursor-move smooth-transition hover:border-slate-500/60 hover:shadow-slate-900/50"
          style={{
            width: isMobile ? "100px" : "192px",
            height: isMobile ? "133px" : "144px",
            top: `${localVideoPosition.y}px`,
            left: `${localVideoPosition.x}px`,
            display: isInCall || connectionStatus === "searching" || connectionStatus === "matched" ? "block" : "none",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <VideoOff className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs text-slate-400">Camera off</span>
              </div>
            </div>
          )}
          {/* Drag indicator */}
          <div className="absolute top-2 right-2 w-1 h-1 bg-white/30 rounded-full"></div>
          <div className="absolute top-2 right-4 w-1 h-1 bg-white/30 rounded-full"></div>
          <div className="absolute top-2 right-6 w-1 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Status Overlay - Enhanced design */}
        {!isInCall && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8 relative">
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>

              <div className="relative">
                <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center border border-slate-600/30 shadow-2xl backdrop-blur-sm aspect-square">
                  {connectionStatus === "searching" ? (
                    <div className="relative flex items-center justify-center w-full h-full">
                      <Search className="w-14 h-14 text-blue-400 z-10" />
                      <div className="absolute inset-0 rounded-full animate-spin">
                        <div className="w-full h-full rounded-full border border-transparent border-t-blue-400 opacity-60"></div>
                      </div>
                    </div>
                  ) : connectionStatus === "matched" ? (
                    <div className="relative">
                      <Users className="w-14 h-14 text-emerald-400" />
                      <div className="absolute -inset-2 rounded-full border border-emerald-400/30 animate-ping"></div>
                    </div>
                  ) : (
                    <Video className="w-14 h-14 text-slate-300" />
                  )}
                </div>

                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                  {connectionStatus === "disconnected"
                    ? "Ready to Connect"
                    : connectionStatus === "connecting"
                      ? "Connecting..."
                      : connectionStatus === "connected"
                        ? "Ready for Video Chat"
                        : connectionStatus === "searching"
                          ? "Finding Your Match"
                          : connectionStatus === "matched"
                            ? "Match Found!"
                            : "Video Chat"}
                </h2>

                <p className="text-slate-400 mb-8 leading-relaxed">
                  {statusMessage || "Connect to start a random video chat with people from around the world"}
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Enhanced styling */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {connectionStatus === "disconnected" && (
                    <button
                      onClick={connectToServer}
                      className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-blue-500/25 hover:scale-105 border border-blue-500/20"
                    >
                      <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Connect to Server</span>
                    </button>
                  )}

                  {connectionStatus === "connected" && (
                    <>
                      <button
                        onClick={findMatch}
                        disabled={isProcessing}
                        className={`group px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg border ${
                          isProcessing
                            ? "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-600/30"
                            : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white hover:shadow-emerald-500/25 hover:scale-105 border-emerald-500/20"
                        }`}
                      >
                        <Search
                          className={`w-5 h-5 ${isProcessing ? "animate-spin" : "group-hover:scale-110"} transition-transform`}
                        />
                        <span>{isProcessing ? "Processing..." : "Find Match"}</span>
                      </button>
                      <button
                        onClick={disconnect}
                        className="group px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/25 hover:scale-105 border border-red-500/20"
                      >
                        <span>Disconnect</span>
                      </button>
                    </>
                  )}

                  {connectionStatus === "searching" && (
                    <button
                      onClick={cancelSearch}
                      className="group px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-red-500/25 hover:scale-105 border border-red-500/20"
                    >
                      <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Cancel Search</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Section - Enhanced design */}
      {(connectionStatus === "searching" || connectionStatus === "matched" || isInCall) && (
        <div className="relative z-50 backdrop-blur-xl bg-slate-900/90 border-t border-slate-700/50 pb-safe">
          <div className="p-6">
            <div className="flex items-center justify-center space-x-6 max-w-md mx-auto">
              <button
                onClick={toggleAudio}
                className={`group p-4 rounded-2xl transition-all duration-200 shadow-lg hover:scale-105 border ${
                  isAudioEnabled
                    ? "bg-slate-700/50 hover:bg-slate-600/50 text-white border-slate-600/30 hover:border-slate-500/50"
                    : "bg-red-600/90 hover:bg-red-500/90 text-white border-red-500/30 shadow-red-500/20"
                }`}
              >
                {isAudioEnabled ? (
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <MicOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <button
                onClick={toggleVideo}
                className={`group p-4 rounded-2xl transition-all duration-200 shadow-lg hover:scale-105 border ${
                  isVideoEnabled
                    ? "bg-slate-700/50 hover:bg-slate-600/50 text-white border-slate-600/30 hover:border-slate-500/50"
                    : "bg-red-600/90 hover:bg-red-500/90 text-white border-red-500/30 shadow-red-500/20"
                }`}
              >
                {isVideoEnabled ? (
                  <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <VideoOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>

              {(connectionStatus === "matched" || isInCall) && (
                <button
                  onClick={leaveCall}
                  className="group p-4 rounded-2xl bg-red-600/90 hover:bg-red-500/90 text-white transition-all duration-200 shadow-lg hover:scale-105 border border-red-500/30 shadow-red-500/20"
                >
                  <PhoneOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>

            {/* Audio Level Indicator - Only during call */}
            {isAudioEnabled && isInCall && (
              <div className="mt-2 flex items-center justify-center space-x-1">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-2 rounded-full transition-colors duration-150 ${
                      audioLevel > i * 0.16
                        ? audioLevel > 0.6
                          ? "bg-red-400"
                          : "bg-green-400"
                        : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
