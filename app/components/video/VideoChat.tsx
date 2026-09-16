"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import { useVideoTuning } from "../../hooks/useVideoTuning"
import { useSignaling } from "../../hooks/useSignaling"
import { usePeerChat } from "../../hooks/usePeerChat"
import { CallControls } from "./CallControls"
import { CallStatus } from "./CallStatus"
import { LocalVideoOverlay } from "./LocalVideoOverlay"
import { getCallMedia, mediaErrorMessage } from "../../lib/media"

export default function VideoChat({ onBack }: { onBack: () => void }) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const facingRef = useRef<"user" | "environment">("user")
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [reported, setReported] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  useVideoTuning(localStream)
  const signaling = useSignaling()
  const chat = usePeerChat({
    send: signaling.send,
    onFrame: signaling.onFrame,
    mode: "video",
    localStream,
    onRemoteStream: (s) => setRemoteStream(s),
  })

  useEffect(() => {
    void signaling.connect("video")
    return () => signaling.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect once per mount
  }, [])

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  useEffect(() => {
    if (!chat.matched) {
      setRemoteStream(null)
      setReported(false)
    }
  }, [chat.matched])

  async function startCamera() {
    setMediaError(null)
    try {
      const stream = await getCallMedia(facingRef.current)
      setLocalStream(stream)
      return stream
    } catch (err) {
      setMediaError(mediaErrorMessage(err))
      return null
    }
  }

  async function flipCamera() {
    const next = facingRef.current === "user" ? "environment" : "user"
    try {
      const fresh = await getCallMedia(next)
      facingRef.current = next
      const newVideo = fresh.getVideoTracks()[0]
      const newAudio = fresh.getAudioTracks()[0]
      if (newVideo) await chat.replaceTrack(newVideo)
      if (newAudio) await chat.replaceTrack(newAudio)
      localStream?.getTracks().forEach((t) => t.stop())
      setLocalStream(fresh)
      setMediaError(null)
    } catch (err) {
      setMediaError(mediaErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      <header className="p-4 flex items-center gap-3 border-b border-slate-800">
        <button onClick={onBack} className="p-2 rounded-xl bg-slate-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Video Chat</h1>
        <span className="ml-auto text-xs text-slate-400" title="Includes you">
          {signaling.online} online (incl. you)
        </span>
      </header>
      <div className="relative flex-1 bg-black">
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        <LocalVideoOverlay videoRef={localVideoRef} visible={Boolean(localStream)} />
        {(!chat.matched || chat.connectFailed) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CallStatus
              connectionStatus={
                chat.connectFailed
                  ? "Couldn't connect"
                  : chat.searching
                    ? "Finding your match"
                    : signaling.status === "ready"
                      ? "Ready"
                      : signaling.status === "reconnecting"
                        ? "Reconnecting…"
                        : signaling.status
              }
              statusMessage={mediaError || chat.chatError || signaling.error || ""}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 pb-2">
        {(signaling.status === "closed" || signaling.status === "reconnecting") && (
          <button onClick={() => void signaling.reconnect()} className="text-xs text-slate-300">
            Reconnect
          </button>
        )}
        {!localStream && !chat.matched && (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="mt-2 px-6 py-3 bg-white text-black rounded-2xl font-semibold"
          >
            Allow camera
          </button>
        )}
        {signaling.status === "ready" && !chat.matched && !chat.searching && (
          <button
            onClick={async () => {
              const stream = localStream || (await startCamera())
              if (!stream) return
              chat.find()
            }}
            className="mt-2 px-6 py-3 bg-emerald-600 rounded-2xl font-semibold flex items-center gap-2"
          >
            <Search className="w-5 h-5" /> Find match
          </button>
        )}
        {chat.searching && (
          <button onClick={() => chat.cancel()} className="px-6 py-3 bg-red-600 rounded-2xl">
            Cancel
          </button>
        )}
        {chat.matched && (
          <button
            disabled={reported}
            onClick={() => {
              chat.report("user")
              setReported(true)
            }}
            className="text-xs text-slate-400 disabled:opacity-50"
          >
            {reported ? "Reported" : "Report"}
          </button>
        )}
        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={() => {
            localStream?.getAudioTracks().forEach((t) => {
              t.enabled = !t.enabled
            })
            setIsAudioEnabled((v) => !v)
          }}
          onToggleVideo={() => {
            localStream?.getVideoTracks().forEach((t) => {
              t.enabled = !t.enabled
            })
            setIsVideoEnabled((v) => !v)
          }}
          onFlip={() => void flipCamera()}
          onLeave={() => {
            localStream?.getTracks().forEach((t) => t.stop())
            setLocalStream(null)
            setRemoteStream(null)
            chat.leave()
          }}
          showLeave={chat.matched}
        />
      </div>
    </div>
  )
}
