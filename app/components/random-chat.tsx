"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Send, Users, RefreshCw, XCircle, ArrowLeft, Flag } from "lucide-react"
import { useSignaling } from "../hooks/useSignaling"
import { usePeerChat } from "../hooks/usePeerChat"
import { MAX_INPUT_CHARS, MAX_RELAY_TEXT } from "../lib/protocol"

function connectionLabel(status: string) {
  if (status === "ready") return "Online"
  if (status === "connecting") return "Connecting…"
  if (status === "reconnecting") return "Reconnecting…"
  if (status === "closed") return "Offline"
  return "Idle"
}

export default function RandomChat({ onBack }: { onBack?: () => void }) {
  const [inputValue, setInputValue] = useState("")
  const [reported, setReported] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const signaling = useSignaling()
  const chat = usePeerChat({
    send: signaling.send,
    onFrame: signaling.onFrame,
    mode: "text",
  })

  useEffect(() => {
    void signaling.connect("text")
    return () => signaling.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect once per mount
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat.messages, chat.peerTyping])

  useEffect(() => {
    if (!chat.matched) setReported(false)
  }, [chat.matched])

  const status = chat.matched
    ? chat.connectFailed
      ? "Couldn't connect — find someone else."
      : chat.transport === "none"
        ? "Matched! Connecting…"
        : "Matched! Say hello to your stranger."
    : chat.searching
      ? "Searching for a match..."
      : chat.chatError || signaling.error || 'Press "Find" to start chatting'

  const placeholder = !chat.matched
    ? "Find a match to chat"
    : chat.transport === "none"
      ? "Connecting…"
      : "Type a message…"

  const maxLen = chat.transport === "relay" ? MAX_RELAY_TEXT : MAX_INPUT_CHARS

  const handleSend = (e: FormEvent) => {
    e.preventDefault()
    if (!chat.matched || !inputValue.trim()) return
    chat.sendTyping(false)
    const ok = chat.sendMessage(inputValue.trim())
    if (ok) setInputValue("")
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-900 text-gray-100 overflow-hidden">
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center">
          {onBack && (
            <button onClick={onBack} className="mr-3 text-gray-300 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold text-emerald-400">AnnoChat</h1>
        </div>
        <div className="flex items-center gap-2">
          {chat.matched && (
            <button
              type="button"
              disabled={reported}
              onClick={() => {
                chat.report("user")
                setReported(true)
              }}
              className="bg-gray-700 px-3 py-2 rounded-full text-sm disabled:opacity-50"
              title={reported ? "Reported" : "Report"}
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center bg-gray-700 px-3 py-2 rounded-full text-sm" title="Includes you">
            <Users className="w-5 h-5 mr-2 text-emerald-400" />
            <span>{signaling.online} online</span>
            <span className="ml-1 text-xs text-gray-400">incl. you</span>
          </div>
        </div>
      </header>
      <div className="bg-gray-800/50 p-3 text-center border-b border-gray-700 flex items-center justify-center gap-3">
        <p className={`text-sm font-medium ${status.includes("Matched") ? "text-emerald-400" : "text-amber-400"}`}>
          {status}
        </p>
        <span className="text-xs text-gray-400">{connectionLabel(signaling.status)}</span>
        {(signaling.status === "closed" || signaling.status === "reconnecting") && (
          <button
            type="button"
            onClick={() => void signaling.reconnect()}
            className="text-xs bg-gray-700 px-2 py-1 rounded-full"
          >
            Reconnect
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {chat.messages.map((msg) =>
          msg.sender === "system" ? (
            <div key={msg.id} className="text-center text-xs text-gray-400 py-2">
              {msg.text}
            </div>
          ) : (
            <div key={msg.id} className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-4 py-3 rounded-2xl break-words max-w-[85%] ${
                  msg.sender === "you" ? "bg-emerald-600 text-white" : "bg-gray-700"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ),
        )}
        {chat.peerTyping && <span className="text-gray-400 italic text-sm">Stranger is typing…</span>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="bg-gray-800 p-3 border-t border-gray-700 flex items-center gap-2">
        {!chat.matched && !chat.searching && (
          <button
            type="button"
            onClick={() => chat.find()}
            disabled={signaling.status !== "ready"}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-full disabled:opacity-50 flex items-center space-x-2"
          >
            <span>Find</span>
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
        {chat.searching && (
          <button
            type="button"
            onClick={() => chat.cancel()}
            className="bg-red-600 text-white px-4 py-3 rounded-full flex items-center space-x-2"
          >
            <span>Cancel</span>
            <XCircle className="w-5 h-5" />
          </button>
        )}
        {chat.matched && (
          <button type="button" onClick={() => chat.leave()} className="bg-red-600 text-white p-3 rounded-full">
            <XCircle className="w-5 h-5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          maxLength={maxLen}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            chat.sendTyping(true)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => chat.sendTyping(false), 1500)
          }}
          placeholder={placeholder}
          disabled={!chat.matched || chat.transport === "none"}
          className="flex-1 bg-gray-700 rounded-full px-4 py-3 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!chat.matched || !inputValue.trim() || chat.transport === "none"}
          className="bg-emerald-600 text-white p-3 rounded-full disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
