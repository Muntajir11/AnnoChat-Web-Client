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
          aspectRatio: { ideal: 16/9 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
        },
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

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
                min: Math.max(20, settings.frameRate || 10)
              },
              width: settings.width,
              height: settings.height
            })
            
            // Wait for settings to apply
            await new Promise(resolve => setTimeout(resolve, 1000))
            
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
        // Optimize for better frame rates
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      })
      peerConnectionRef.current = peerConnection

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          const sender = peerConnection.addTrack(track, localStreamRef.current!)
          
          // Optimize video encoding for higher frame rates
          if (track.kind === 'video') {
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
      peerConnectionRef.current?.getStats(null).then(stats => {
        const currentTime = Date.now()
        
        stats.forEach(report => {
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
      }).catch(error => {
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
      videoTrack.applyConstraints({
        frameRate: { ideal: optimalFrameRate }
      }).then(() => {
        // Frame rate restored silently
      }).catch(error => {
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-black via-neutral-950 to-black text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]"></div>
      </div>

      {/* Header Section */}
      <header
        className={`relative z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.1] p-4 flex-shrink-0 ${isInCall ? "hidden md:block" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4 p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
              Video Chat
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                connectionStatus === "connected"
                  ? "bg-green-500/20 text-green-400"
                  : connectionStatus === "searching"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : connectionStatus === "in-call"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {connectionStatus}
            </div>
          </div>
        </div>
      </header>

      {/* Video Section - Takes remaining space */}
      <div ref={videoContainerRef} className="flex-1 relative bg-black overflow-hidden">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover md:object-contain"
          style={{ display: isInCall ? "block" : "none" }}
        />

        {/* Local Video - positioned within video container with smaller mobile size */}
        <div
          ref={localVideoContainerRef}
          className="absolute w-25 h-33 md:w-48 md:h-36 bg-black/60 rounded-xl overflow-hidden border border-white/10 z-10 touch-none cursor-move smooth-transition"
          style={{
            width: isMobile ? "100px" : "192px",
            height: isMobile ? "133px" : "144px",
            top: `${localVideoPosition.y}px`,
            left: `${localVideoPosition.x}px`,
            display: isInCall || connectionStatus === "searching" || connectionStatus === "matched" ? "block" : "none",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white/60" />
            </div>
          )}
        </div>

        {/* Status Overlay */}
        {!isInCall && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                {connectionStatus === "searching" ? (
                  <Search className="w-12 h-12 text-white/80 animate-pulse" />
                ) : connectionStatus === "matched" ? (
                  <Users className="w-12 h-12 text-white/80" />
                ) : (
                  <Video className="w-12 h-12 text-white/80" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {connectionStatus === "disconnected"
                  ? "Ready to Connect"
                  : connectionStatus === "connecting"
                    ? "Connecting..."
                    : connectionStatus === "connected"
                      ? "Ready for Video Chat"
                      : connectionStatus === "searching"
                        ? "Finding a Match"
                        : connectionStatus === "matched"
                          ? "Match Found!"
                          : "Video Chat"}
              </h2>

              <p className="text-white/60 mb-6">
                {statusMessage || "Connect to start a random video chat with strangers"}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                {connectionStatus === "disconnected" && (
                  <button
                    onClick={connectToServer}
                    className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Connect to Server
                  </button>
                )}

                {connectionStatus === "connected" && (
                  <>
                    <button
                      onClick={findMatch}
                      disabled={isProcessing}
                      className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center ${
                        isProcessing
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      {isProcessing ? "Processing..." : "Find Match"}
                    </button>
                    <button
                      onClick={disconnect}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                )}

                {connectionStatus === "searching" && (
                  <button
                    onClick={cancelSearch}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel Search
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Section - Fixed at bottom */}
      {(connectionStatus === "searching" || connectionStatus === "matched" || isInCall) && (
        <div className="relative z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-safe flex-shrink-0">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-xl transition-colors ${
                isAudioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-xl transition-colors ${
                isVideoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            {(connectionStatus === "matched" || isInCall) && (
              <button
                onClick={leaveCall}
                className="p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
