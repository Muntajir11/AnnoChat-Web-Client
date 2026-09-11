"use client"

import { Mic, MicOff, Video, VideoOff, PhoneOff, RotateCcw } from "lucide-react"

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onFlip,
  onLeave,
  showLeave,
}: {
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onFlip: () => void
  onLeave: () => void
  showLeave: boolean
}) {
  return (
    <div className="p-4 flex items-center justify-center space-x-4">
      <button onClick={onToggleAudio} className="p-3 rounded-xl bg-slate-800 text-white">
        {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      <button onClick={onToggleVideo} className="p-3 rounded-xl bg-slate-800 text-white">
        {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>
      <button onClick={onFlip} className="p-3 rounded-xl bg-slate-800 text-white">
        <RotateCcw className="w-5 h-5" />
      </button>
      {showLeave && (
        <button onClick={onLeave} className="p-3 rounded-xl bg-red-600 text-white">
          <PhoneOff className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
