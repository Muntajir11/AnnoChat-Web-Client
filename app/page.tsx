"use client"

import { useEffect, useState, useRef, type FormEvent } from "react"
import { io, type Socket } from "socket.io-client"
import { Send, Users, RefreshCw, XCircle } from "lucide-react"
import Image from "next/image"

export default function RandomChat() {
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
      <header className="bg-gray-800 p-3 sm:p-4 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-lg sm:text-xl font-bold text-emerald-400 flex items-center">
          <Image src="/logo.png" alt="User Icon" width={20} height={20} className="mr-2 sm:w-6 sm:h-6" />
          <span className="hidden xs:inline">AnnoChat</span>
          <span className="xs:hidden">AC</span>
        </h1>
        <div className="flex items-center bg-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
          <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-emerald-400" />
          <span className="hidden xs:inline">{onlineUsers} online</span>
          <span className="xs:hidden">{onlineUsers}</span>
        </div>
      </header>

      <div className="bg-gray-800/50 p-2 sm:p-3 text-center border-b border-gray-700 flex-shrink-0">
        <p
          className={`text-xs sm:text-sm font-medium ${
            status.includes("Matched") ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {status}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 messagesContainer min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-3 sm:px-4 py-2 rounded-2xl break-words whitespace-pre-wrap max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl overflow-auto text-sm sm:text-base ${
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
          <div className="ml-4 mb-2">
            <span className="text-gray-400 italic text-sm">Stranger is typing…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="bg-gray-800 p-2 sm:p-3 border-t border-gray-700 flex items-center gap-1 sm:gap-2 flex-shrink-0"
      >
        <button
          type="button"
          onClick={handleFindChat}
          disabled={isSearching || isConnected}
          className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-4 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base flex-shrink-0"
        >
          <span className="hidden xs:inline">{isSearching ? "Searching..." : "Find"}</span>
          <span className="xs:hidden">{isSearching ? "..." : "Find"}</span>
          <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isSearching ? "animate-spin" : ""}`} />
        </button>

        {isConnected && (
          <button
            type="button"
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-4 py-2 rounded-full flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base flex-shrink-0"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Leave</span>
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
          className="flex-1 bg-gray-700 text-gray-100 rounded-full px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base min-w-0"
        />

        <button
          type="submit"
          disabled={!isConnected || !inputValue.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  )
}
