"use client"

import { useEffect, useState, useRef, type FormEvent } from "react"
import { io, type Socket } from "socket.io-client"
import { Send, Users, RefreshCw, XCircle, ArrowLeft } from "lucide-react"

export default function RandomChat({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<{ text: string; sender: "you" | "stranger" }[]>([])
  const [inputValue, setInputValue] = useState("")
  const [status, setStatus] = useState('Press "Find" to start chatting')
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [strangerTyping, setStrangerTyping] = useState(false)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const presenceRef = useRef<Socket>(
    io(`https://muntajir.me/presence`, {
      autoConnect: false,
      transports: ["websocket"],
      secure: true,
    }),
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const SERVER_URL = "https://muntajir.me"
  const SOCKET_PATH = "/socket.io"

  async function connectSocket() {
    // Tear down any existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
    }

    let token = ""
    try {
      const res = await fetch("/api/get-socket-token")
      const data = await res.json()
      token = data.token
    } catch (err) {
      console.error("Failed to fetch token:", err)
      setStatus("Error: Could not get auth token")
      setIsSearching(false)
      return
    }

    const socket = io(SERVER_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      secure: true,
      auth: { token },
    })
    socketRef.current = socket

    socket.on("matched", ({ roomId }) => {
      setStatus("Matched! Say hello to your stranger.")
      setRoomId(roomId)
      setIsConnected(true)
      setIsSearching(false)
      socket.emit("join room", roomId)
    })

    socket.on("chat message", ({ msg }) => {
      setMessages((prev) => [...prev, { text: msg, sender: "stranger" }])
    })

    socket.on("typing", ({ isTyping }) => {
      setStrangerTyping(isTyping)
    })

    socket.on("user disconnected", () => {
      socket.disconnect()

      setStatus('Stranger disconnected. Press "Find" to start again.')
      setIsSearching(false)
      setStrangerTyping(false)
      setRoomId(null)
    })

    socket.on("error", (err) => {
      console.error("‹‹ SOCKET ERROR ››", err)
      if (err && typeof err === "object" && err.message === "Authentication failed") {
        setStatus("Authentication failed. Please log in again.")
        socket.disconnect()
        setIsConnected(false)
        setIsSearching(false)
      } else {
        setStatus(`Error: ${(err as any).message}`)
      }
    })

    socket.connect()
  }

  const leaveRoom = () => {
    const chat = socketRef.current
    if (chat && roomId) chat.emit("leave room", { roomId })
    if (chat && chat.connected) {
      chat.disconnect()
    }

    setIsConnected(false)
    setStatus("You have left the chat. Press 'Find' to start again.")
    setRoomId(null)
    setMessages([])
    setStrangerTyping(false)
  }

  const handleFindChat = () => {
    setRoomId(null)
    setMessages([])
    setStatus("Searching for a match...")
    setIsSearching(true)

    connectSocket()
  }

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault()
    if (!isConnected || !inputValue.trim() || !roomId) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    socketRef.current?.emit("typing", { roomId, isTyping: false })

    setMessages((prev) => [...prev, { text: inputValue, sender: "you" }])
    socketRef.current!.emit("chat message", { msg: inputValue, roomId })
    setInputValue("")
    setStrangerTyping(false)
  }

  const handleTyping = (isTyping: boolean) => {
    if (!roomId || !isConnected) return
    socketRef.current?.emit("typing", { roomId, isTyping })
  }

  useEffect(() => {
    const pres = presenceRef.current
    pres.connect()
    pres.on("onlineUsers", setOnlineUsers)
    return () => {
      pres.off("onlineUsers", setOnlineUsers)
      pres.disconnect()
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
    return () => clearTimeout(t)
  }, [messages, strangerTyping])

  useEffect(() => {
    const input = document.querySelector("input")
    const handleFocus = () => {
      setTimeout(() => {
        input?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 300)
    }
    input?.addEventListener("focus", handleFocus)
    return () => input?.removeEventListener("focus", handleFocus)
  }, [])

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-none bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header - Increased size */}
      <header className="bg-gray-800 p-4 sm:p-5 shadow-md flex justify-between items-center flex-shrink-0">
        <div className="flex items-center">
          {onBack && (
            <button onClick={onBack} className="mr-3 text-gray-300 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <button onClick={onBack} className="flex items-center hover:opacity-80 transition-opacity" disabled={!onBack}>
            <img src="/logo.png" alt="AnnoChat Logo" className="w-7 h-7 sm:w-8 sm:h-8 mr-3" />
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-400">
              <span className="hidden xs:inline">AnnoChat</span>
              <span className="xs:hidden">AC</span>
            </h1>
          </button>
        </div>
        <div className="flex items-center bg-gray-700 px-3 sm:px-4 py-2 rounded-full text-sm">
          <Users className="w-5 h-5 mr-2 text-emerald-400" />
          <span>{onlineUsers} online</span>
        </div>
      </header>

      {/* Status bar - Increased size */}
      <div className="bg-gray-800/50 p-3 sm:p-4 text-center border-b border-gray-700 flex-shrink-0">
        <p
          className={`text-sm sm:text-base font-medium ${
            status.includes("Matched") ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {status}
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 messagesContainer min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-4 sm:px-5 py-3 rounded-2xl break-words whitespace-pre-wrap max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl overflow-auto text-base ${
                msg.sender === "you"
                  ? "bg-emerald-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-100 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {strangerTyping && (
          <div className="ml-0 mb-2">
            <span className="text-gray-400 italic text-sm">Stranger is typing…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Increased size */}
      <form
        onSubmit={handleSendMessage}
        className="bg-gray-800 p-3 sm:p-4 border-t border-gray-700 flex items-center gap-2 sm:gap-3 flex-shrink-0"
      >
        {!isConnected && (
          <button
            type="button"
            onClick={handleFindChat}
            disabled={isSearching}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-base flex-shrink-0"
          >
            <span>{isSearching ? "Searching..." : "Find"}</span>
            <RefreshCw className={`w-5 h-5 ${isSearching ? "animate-spin" : ""}`} />
          </button>
        )}

        {isConnected && (
          <button
            type="button"
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            handleTyping(true)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500)
          }}
          placeholder="Type a message…"
          disabled={!isConnected}
          className="flex-1 bg-gray-700 text-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base min-w-0"
        />

        <button
          type="submit"
          disabled={!isConnected || !inputValue.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
