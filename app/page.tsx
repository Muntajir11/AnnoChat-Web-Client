"use client"

import { useEffect, useState, useRef, type FormEvent } from "react"
import { io, type Socket } from "socket.io-client"
import { Send, UserRound, Users, RefreshCw } from "lucide-react"

export default function RandomChat() {
  const [messages, setMessages] = useState<{ text: string; sender: "you" | "stranger" }[]>([])
  const [inputValue, setInputValue] = useState("")
  const [status, setStatus] = useState("Waiting for a match...")
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize socket connection
  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io('https://muntajir.me', {
      path: '/socket.io',
      transports: ['websocket'],
      secure: true
    });

    const socket = socketRef.current

    // Handle matching with another user
    socket.on("matched", ({ roomId, partnerId }) => {
      console.log(`You are matched with user ${partnerId}`)
      setStatus("You are matched with a stranger!")
      setRoomId(roomId)
      setIsConnected(true)
      console.log("Room ID set:", roomId)
    })

    // Handle receiving messages
    socket.on("chat message", (data) => {
      console.table(data)
      setMessages((prev) => [...prev, { text: data.msg, sender: "stranger" }])
    })

    // Handle user disconnection
    socket.on("user disconnected", (userId) => {
      setStatus("Stranger disconnected.")
      setIsConnected(false)
    })

    // Handle online users count
    socket.on("onlineUsers", (count) => {
      setOnlineUsers(count)
    })

    // Cleanup on component unmount
    return () => {
      socket.disconnect()
    }
  }, [])

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle sending a message
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault()

    if (inputValue.trim() && roomId && socketRef.current) {
      // Add message to local state
      setMessages((prev) => [...prev, { text: inputValue, sender: "you" }])

      // Send message to server
      socketRef.current.emit("chat message", { msg: inputValue, roomId })

      // Clear input field
      setInputValue("")
    }
  }

  // Handle finding a new match
  const handleFindNew = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()

      // Reconnect to find a new match
      socketRef.current = io("http://localhost:5000", {
        transports: ["websocket"],
      })

      // Reset state
      setMessages([])
      setRoomId(null)
      setStatus("Waiting for a match...")
      setIsConnected(false)

      // Re-register event handlers
      const socket = socketRef.current

      socket.on("matched", ({ roomId, partnerId }) => {
        setStatus("You are matched with a stranger!")
        setRoomId(roomId)
        setIsConnected(true)
      })

      socket.on("chat message", (data) => {
        setMessages((prev) => [...prev, { text: data.msg, sender: "stranger" }])
      })

      socket.on("user disconnected", () => {
        setStatus("Stranger disconnected.")
        setIsConnected(false)
      })

      socket.on("onlineUsers", (count) => {
        setOnlineUsers(count)
      })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold text-emerald-400 flex items-center">
          <UserRound className="mr-2" />
          AnnoChat
        </h1>
        <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full text-sm">
          <Users className="w-4 h-4 mr-2 text-emerald-400" />
          <span>{onlineUsers} online</span>
        </div>
      </header>

      {/* Status */}
      <div className="bg-gray-800/50 p-3 text-center border-b border-gray-700">
        <p className={`text-sm font-medium ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>{status}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.sender === "you" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                message.sender === "you"
                  ? "bg-emerald-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-100 rounded-tl-none"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="bg-gray-800 p-3 border-t border-gray-700 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={!isConnected}
          className="flex-1 bg-gray-700 text-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!isConnected || !inputValue.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleFindNew}
          className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
