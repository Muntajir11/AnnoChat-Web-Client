"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, Users, Search, X } from "lucide-react"

const WEBSOCKET_URL = "wss://annochat.social/video"

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

  // Controls auto-hide functionality
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeoutId, setControlsTimeoutId] = useState<NodeJS.Timeout | null>(null)
  
  // Track screen size for dynamic border radius
  const [screenWidth, setScreenWidth] = useState(768)

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

  // Audio level monitoring for visual feedback only
  const [audioLevel, setAudioLevel] = useState(0)
  const audioAnalyserRef = useRef<AnalyserNode | null>(null)
  const audioLevelIntervalRef = useRef<number | null>(null)

  // Call timer state
  const [callDuration, setCallDuration] = useState(0)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize screen width on client side
    if (typeof window !== 'undefined') {
      setScreenWidth(window.innerWidth)
    }
    
    return () => {
      cleanup()
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId)
      }
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
      const controlsHeight = (connectionStatus === "searching" || connectionStatus === "matched" || isInCall) && showControls ? 80 : 0
      availableHeight = window.innerHeight - headerHeight - controlsHeight - 20 // Extra padding
    } else {
      // For desktop, use video container if available
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect()
        availableWidth = rect.width
        availableHeight = rect.height
      } else {
        // Fallback for desktop - controls always visible on desktop
        const controlsHeight = (connectionStatus === "searching" || connectionStatus === "matched" || isInCall) ? 80 : 0
        availableHeight = window.innerHeight - 160 - controlsHeight // Account for header/controls
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
      setScreenWidth(window.innerWidth) // Update screen width state

      // Set position using safe calculation
      setTimeout(() => {
        const { x, y } = calculateSafePosition()
        setLocalVideoPosition({ x, y })
      }, 150) // Slightly longer delay to ensure layout is ready
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [connectionStatus, isInCall, showControls]) // Recalculate when state changes

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
  }, [connectionStatus, isInCall, showControls])

  // Draggable functionality for local video
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.classList.remove("smooth-transition")
      localVideoContainerRef.current.style.transition = "none"
    }

    setDragStart({
      x: e.clientX - localVideoPosition.x,
      y: e.clientY - localVideoPosition.y,
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.classList.remove("smooth-transition")
      localVideoContainerRef.current.style.transition = "none"
    }

    const touch = e.touches[0]
    setDragStart({
      x: touch.clientX - localVideoPosition.x,
      y: touch.clientY - localVideoPosition.y,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      const { x: maxX, y: maxY, margin } = calculateSafePosition()

      const finalX = Math.max(margin, Math.min(newX, maxX))
      const finalY = Math.max(margin, Math.min(newY, maxY))

      // Use requestAnimationFrame for smooth dragging
      requestAnimationFrame(() => {
        setLocalVideoPosition({ x: finalX, y: finalY })
      })
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

      // Use requestAnimationFrame for smooth dragging
      requestAnimationFrame(() => {
        setLocalVideoPosition({ x: finalX, y: finalY })
      })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      if (localVideoContainerRef.current) {
        localVideoContainerRef.current.style.transition = "top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
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

      // Smooth transition to final position
      requestAnimationFrame(() => {
        setLocalVideoPosition({ x: finalX, y: finalY })
      })
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

  // Auto-hide controls functionality (mobile only)
  const startControlsTimeout = () => {
    if (controlsTimeoutId) {
      clearTimeout(controlsTimeoutId)
    }
    
    // Only auto-hide controls during actual calls on mobile
    if (isInCall && isMobile) {
      const timeoutId = setTimeout(() => {
        setShowControls(false)
      }, 5000) // Hide after 5 seconds
      
      setControlsTimeoutId(timeoutId)
    }
  }

  const handleScreenClick = () => {
    // Only allow auto-hide on mobile devices and only during actual calls
    if (isInCall && isMobile) {
      setShowControls(!showControls)
      
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId)
        setControlsTimeoutId(null)
      }
      
      if (!showControls) {
        // If showing controls, start the timeout to hide them again
        startControlsTimeout()
      }
    }
  }

  // Start controls timeout when call starts or status changes
  useEffect(() => {
    if (isInCall && isMobile) {
      // Only start auto-hide timeout during actual calls on mobile
      setShowControls(true)
      startControlsTimeout()
    } else {
      // For all other states (searching, matched, etc.), always show controls
      setShowControls(true)
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId)
        setControlsTimeoutId(null)
      }
    }
    
    return () => {
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId)
      }
    }
  }, [isInCall, connectionStatus, isMobile])

  // Call timer effect
  useEffect(() => {
    if (isInCall) {
      // Start timer when call begins
      setCallDuration(0)
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      // Stop and reset timer when call ends
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
      setCallDuration(0)
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }
  }, [isInCall])

  // Format call duration to MM:SS
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Reset timeout when user interacts with controls (mobile only)
  const resetControlsTimeout = () => {
    if (isMobile) {
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId)
      }
      setShowControls(true)
      startControlsTimeout()
    }
  }

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

    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    setCallDuration(0)

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
        // Unknown server message - silently ignored in production
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
          echoCancellation: { exact: true },
          noiseSuppression: { exact: true },
          autoGainControl: { exact: true },
          sampleRate: { ideal: 48000 },
          // Enhanced browser-native audio processing
          channelCount: { ideal: 1 }, // Mono for better processing
        },
      })

      // Apply WhatsApp-style minimal audio processing
      const streamAudioTrack = stream.getAudioTracks()[0]
      if (streamAudioTrack) {
        // Apply enhanced constraints for optimal audio quality
        try {
          await streamAudioTrack.applyConstraints({
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true },
            // Use advanced browser-specific settings when available
            // @ts-ignore - Browser-specific advanced audio processing
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            // Ensure smooth audio flow
            googAudioMirroring: false,
          })
        } catch (constraintError) {
          // Advanced audio constraints not supported, using standard constraints
        }
        streamAudioTrack.enabled = isAudioEnabled
      }


      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Start basic audio level monitoring (no aggressive processing)
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

          // Optimize audio encoding with DTX for WhatsApp-style smoothness
          if (track.kind === "audio") {
            const params = sender.getParameters()
            if (!params.encodings) params.encodings = [{}]

            // Enable DTX (Discontinuous Transmission) for smooth audio flow
            // @ts-ignore - DTX is supported but not in TypeScript definitions yet
            params.encodings[0].dtx = true
            // Configure audio parameters for excellent quality
            params.encodings[0].maxBitrate = 128000  // 96 kbps for excellent audio quality
            params.encodings[0].priority = "high" // Prioritize audio
            
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

  // Simplified audio level monitoring for visual feedback only
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
          setAudioLevel(average / 255) // Normalize to 0-1 for visual indicator only
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
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative">
      <style jsx>{`
        .smooth-transition {
          transition: top 0.3s ease-out, left 0.3s ease-out;
        }
        
        /* Hide any drag indicators or pseudo-elements that might create dots */
        .cursor-move::before,
        .cursor-move::after,
        .cursor-move *::before,
        .cursor-move *::after {
          display: none !important;
        }
        
        /* Ensure no drag visual feedback */
        .cursor-move {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        @keyframes professional-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }
        
        .animate-professional-spin {
          animation: professional-spin 2s linear infinite;
        }
        
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      
      {/* Premium Multi-layered Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 via-transparent to-violet-950/30"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-slate-950/80 to-teal-950/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent"></div>
      
      {/* Premium Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large ambient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/8 to-indigo-600/4 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-violet-500/6 to-purple-600/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-r from-teal-500/4 to-cyan-500/2 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }}></div>
        
        {/* Smaller floating particles */}
        <div className="absolute top-1/5 right-1/3 w-20 h-20 bg-blue-400/5 rounded-full blur-xl animate-glow"></div>
        <div className="absolute bottom-1/5 left-1/3 w-16 h-16 bg-violet-400/4 rounded-full blur-lg animate-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-2/3 right-1/5 w-12 h-12 bg-teal-400/3 rounded-full blur-md animate-glow" style={{ animationDelay: '3s' }}></div>
      </div>
      
      {/* Subtle Mesh Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px'
      }}></div>
      
      {/* Premium noise texture */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-soft-light" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }}></div>

      {/* Header Section - Premium Design */}
      <header
        className={`relative z-50 backdrop-blur-2xl bg-slate-950/95 border-b border-slate-800/50 transition-all duration-300 ${
          isInCall ? "hidden md:block" : ""
        }`}
      >
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="group p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-200 hover:scale-105 shadow-xl backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-100 bg-clip-text text-transparent">
                Video Chat
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Connect with people worldwide</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div
              className={`px-4 py-2 rounded-full text-xs font-medium border backdrop-blur-xl transition-all duration-200 ${
                connectionStatus === "connected"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20 shadow-lg"
                  : connectionStatus === "searching"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20 shadow-lg animate-pulse"
                    : connectionStatus === "in-call"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/20 shadow-lg"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/40"
              }`}
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400 shadow-emerald-400/50 shadow-sm"
                      : connectionStatus === "searching"
                        ? "bg-amber-400 animate-pulse shadow-amber-400/50 shadow-sm"
                        : connectionStatus === "in-call"
                          ? "bg-blue-400 shadow-blue-400/50 shadow-sm"
                          : "bg-slate-400"
                  }`}
                ></div>
                <span className="capitalize">{connectionStatus.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
      </header>


      <div ref={videoContainerRef} className="flex-1 relative bg-slate-950 overflow-hidden" onClick={handleScreenClick}>
        
        {/* Call Timer */}
        {isInCall && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="px-4 py-2 bg-slate-950/90 backdrop-blur-xl rounded-full border border-slate-700/50 shadow-xl">
              <span className="text-white font-mono text-sm font-medium tracking-wider">
                {formatCallDuration(callDuration)}
              </span>
            </div>
          </div>
        )}
   
        <div 
          className="absolute inset-0"
          style={{ 
            display: isInCall ? "block" : "none"
          }}
        >
          <div 
            className="absolute inset-0 overflow-hidden md:rounded-3xl"
            style={{
              clipPath: screenWidth > 768 ? 'inset(0 round 24px)' : 'none'
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplaybook"
              className="absolute inset-0 w-full h-full object-cover md:object-contain transition-opacity duration-500 bg-transparent"
              style={{ 
                background: "transparent"
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>

        {/* Local Video - Premium Glass Design */}
        <div
          ref={localVideoContainerRef}
          className="absolute z-[100] touch-none cursor-move transition-all duration-300 group will-change-transform"
          style={{
            width: isMobile ? "100px" : "192px",
            height: isMobile ? "133px" : "144px",
            top: `${localVideoPosition.y}px`,
            left: `${localVideoPosition.x}px`,
            display: isInCall || connectionStatus === "searching" || connectionStatus === "matched" ? "block" : "none",
            background: "transparent",
            transform: isDragging ? "scale(1.05)" : "scale(1)",
            transition: isDragging ? 
              "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : 
              "top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glass container with premium styling */}
          <div className="relative w-full h-full bg-slate-950/95 backdrop-blur-2xl rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl group-hover:border-slate-600/80 group-hover:shadow-slate-900/80 transition-all duration-300">
            {/* Premium glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-white/5"></div>
            
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              className="relative z-10 w-full h-full object-cover bg-transparent" 
              style={{ background: "transparent" }}
              onContextMenu={(e) => e.preventDefault()}
            />
            
            {!isVideoEnabled && (
              <div className="absolute inset-0 z-20 bg-slate-950/98 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-400 font-medium">Camera off</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Overlay - Premium Design */}
        {!isInCall && (
          <div className="absolute inset-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-center max-w-md mx-auto p-8 relative">
              {/* Premium animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-violet-500/8 to-teal-500/6 rounded-3xl blur-2xl animate-glow"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-slate-900/30 via-transparent to-slate-800/20 rounded-3xl backdrop-blur-sm"></div>

              <div className="relative z-10">
                <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-slate-800/60 via-slate-900/80 to-slate-950/90 flex items-center justify-center border border-slate-700/40 shadow-2xl backdrop-blur-xl aspect-square relative overflow-hidden">
                  {/* Premium glass effect on icon container */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-white/3"></div>
                  
                  {connectionStatus === "searching" ? (
                    <div className="relative flex items-center justify-center w-full h-full z-10">
                      <Search className="w-16 h-16 text-blue-400 drop-shadow-lg" />
                      
                      {/* Professional spinner rings */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Outer ring */}
                        <div className="w-24 h-24 rounded-full border-2 border-transparent border-t-blue-400/60 border-r-blue-400/30 animate-professional-spin"></div>
                        {/* Middle ring */}
                        <div className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-blue-300/40 border-r-blue-300/20 animate-professional-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
                        {/* Inner ring */}
                        <div className="absolute w-16 h-16 rounded-full border border-transparent border-t-blue-200/30 animate-professional-spin" style={{ animationDuration: '1.5s' }}></div>
                      </div>
                      
                      {/* Pulse rings */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full border border-blue-400/20 animate-pulse-ring"></div>
                        <div className="absolute w-28 h-28 rounded-full border border-blue-300/15 animate-pulse-ring" style={{ animationDelay: '1s' }}></div>
                      </div>
                    </div>
                  ) : connectionStatus === "matched" ? (
                    <div className="relative z-10">
                      <Users className="w-16 h-16 text-emerald-400 drop-shadow-lg" />
                      <div className="absolute -inset-3 rounded-2xl border-2 border-emerald-400/20 animate-ping"></div>
                      <div className="absolute -inset-6 rounded-3xl border border-emerald-400/10 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <Video className="w-16 h-16 text-slate-300 drop-shadow-lg" />
                    </div>
                  )}
                </div>

                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent drop-shadow-sm">
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

                <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                  {statusMessage || "Connect to start a random video chat with people from around the world"}
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent"></div>
                    <div className="flex items-center space-x-2 relative z-10">
                      <div className="w-2 h-2 bg-red-400 rounded-full shadow-red-400/50 shadow-sm"></div>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Premium Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {connectionStatus === "disconnected" && (
                    <button
                      onClick={connectToServer}
                      className="group px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl hover:shadow-blue-500/25 hover:scale-105 border border-blue-500/20 backdrop-blur-sm relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <Video className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
                      <span className="relative z-10">Connect to Server</span>
                    </button>
                  )}

                  {connectionStatus === "connected" && (
                    <button
                      onClick={findMatch}
                      disabled={isProcessing}
                      className={`group px-8 py-4 font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl border backdrop-blur-sm relative overflow-hidden rounded-2xl ${
                        isProcessing
                          ? "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-600/30"
                          : "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-600 text-white hover:shadow-emerald-500/25 hover:scale-105 border-emerald-500/20"
                      }`}
                    >
                      {!isProcessing && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      )}
                      <Search
                        className={`w-5 h-5 ${isProcessing ? "animate-spin" : "group-hover:scale-110"} transition-transform relative z-10`}
                      />
                      <span className="relative z-10">{isProcessing ? "Processing..." : "Find Match"}</span>
                    </button>
                  )}

                  {connectionStatus === "searching" && (
                    <button
                      onClick={cancelSearch}
                      className="group px-8 py-4 bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-500 hover:via-red-600 hover:to-rose-600 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl hover:shadow-red-500/25 hover:scale-105 border border-red-500/20 backdrop-blur-sm relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <X className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
                      <span className="relative z-10">Cancel Search</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium Controls Section */}
      {(connectionStatus === "searching" || connectionStatus === "matched" || isInCall) && 
       (!isMobile || showControls) && (
        <div className="relative z-50 backdrop-blur-2xl bg-slate-950/95 border-t border-slate-800/50 pb-safe transition-all duration-300">
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent"></div>
          
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-center space-x-6 max-w-md mx-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleAudio()
                  resetControlsTimeout()
                }}
                className={`group p-4 rounded-2xl transition-all duration-300 shadow-xl hover:scale-105 border backdrop-blur-sm relative overflow-hidden ${
                  isAudioEnabled
                    ? "bg-slate-800/60 hover:bg-slate-700/70 text-white border-slate-600/40 hover:border-slate-500/60"
                    : "bg-red-600/90 hover:bg-red-500/95 text-white border-red-500/40 shadow-red-500/20"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isAudioEnabled ? (
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                ) : (
                  <MicOff className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleVideo()
                  resetControlsTimeout()
                }}
                className={`group p-4 rounded-2xl transition-all duration-300 shadow-xl hover:scale-105 border backdrop-blur-sm relative overflow-hidden ${
                  isVideoEnabled
                    ? "bg-slate-800/60 hover:bg-slate-700/70 text-white border-slate-600/40 hover:border-slate-500/60"
                    : "bg-red-600/90 hover:bg-red-500/95 text-white border-red-500/40 shadow-red-500/20"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isVideoEnabled ? (
                  <Video className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                ) : (
                  <VideoOff className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                )}
              </button>

              {(connectionStatus === "matched" || isInCall) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    leaveCall()
                    resetControlsTimeout()
                  }}
                  className="group p-4 rounded-2xl bg-red-600/90 hover:bg-red-500/95 text-white transition-all duration-300 shadow-xl hover:scale-105 border border-red-500/40 shadow-red-500/20 backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <PhoneOff className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
