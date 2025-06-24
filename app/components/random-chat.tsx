"use client"

import { useEffect, useState, useRef, type FormEvent } from "react"
import { Send, Users, RefreshCw, XCircle, ArrowLeft } from "lucide-react"

export default function RandomChat({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<{ text: string; sender: "you" | "stranger" }[]>([])
  const [inputValue, setInputValue] = useState("")
  const [status, setStatus] = useState('Loading...')
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [strangerTyping, setStrangerTyping] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const chatWsRef = useRef<WebSocket | null>(null)
  const presenceWsRef = useRef<WebSocket | null>(null)
  const presenceConnectingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const authTokenFetchedRef = useRef(false)
  const PRESENCE_URL = "wss://muntajir.me/presence"
  const CHAT_URL = authToken ? `wss://muntajir.me/?token=${authToken}` : null

    useEffect(() => {
    async function fetchAuthToken() {
      if (authTokenFetchedRef.current) return 
      
      authTokenFetchedRef.current = true
      try {
        const response = await fetch('/api/get-socket-token')
        const data = await response.json()
        setAuthToken(data.token)
        setStatus('Press "Find" to start chatting')
      } catch (error) {
        console.error('Failed to fetch auth token:', error)
        setStatus('Failed to load. Please refresh the page.')
        authTokenFetchedRef.current = false 
      }
    }

    fetchAuthToken()
  }, [])


  useEffect(() => {
    if (authToken) {
      connectPresence()
    }

    return () => {
      if (presenceWsRef.current) {
        presenceWsRef.current.close()
      }
      if (chatWsRef.current) {
        chatWsRef.current.close()
      }
    }
  }, [authToken])

  function connectPresence() {
    if (presenceConnectingRef.current || 
        (presenceWsRef.current && 
         (presenceWsRef.current.readyState === WebSocket.CONNECTING || 
          presenceWsRef.current.readyState === WebSocket.OPEN))) {
      return
    }
    
    presenceConnectingRef.current = true
    const presenceWs = new WebSocket(PRESENCE_URL)
    presenceWsRef.current = presenceWs
    
    presenceWs.onopen = () => {
      presenceConnectingRef.current = false
    }
    
    presenceWs.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data)
      if (event === 'onlineUsers') {
        setOnlineUsers(data)
      }
    }
    
    presenceWs.onerror = (error) => {
      console.error('Presence WebSocket error:', error)
      presenceConnectingRef.current = false
    }
    
    presenceWs.onclose = (event) => {
      presenceConnectingRef.current = false
      
   
      if (event.code !== 1000 && presenceWsRef.current === presenceWs) {
        setTimeout(() => {
       
          if (presenceWsRef.current === presenceWs || !presenceWsRef.current) {
            connectPresence()
          }
        }, 3000)
      }
    }
  }
  async function connectSocket() {
    if (!CHAT_URL) {
      console.error('No auth token available')
      return
    }
    
    if (chatWsRef.current) {
      chatWsRef.current.close()
      chatWsRef.current = null
    }

    const chatWs = new WebSocket(CHAT_URL)
    chatWsRef.current = chatWs

    chatWs.onopen = () => {
      
    }

    chatWs.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data)
      
      switch (event) {
        case 'matched':
          setStatus("Matched! Say hello to your stranger.")
          setRoomId(data.roomId)
          setIsConnected(true)
          setIsSearching(false)
       
          chatWs.send(JSON.stringify({ event: 'join room', data: data.roomId }))
          break
          
        case 'joined':
          break
          
        case 'chat message':
          if (data.senderId !== 'self') { 
            setMessages((prev) => [...prev, { text: data.msg, sender: "stranger" }])
          }
          break
          
        case 'typing':
          if (data.senderId !== 'self') { 
            setStrangerTyping(data.isTyping)
          }
          break
          
        case 'user disconnected':
          chatWs.close()
          setStatus('Stranger disconnected. Press "Find" to start again.')
          setIsSearching(false)
          setStrangerTyping(false)
          setRoomId(null)
          setIsConnected(false)
          break
          
        case 'error':
          console.error('‹‹ SOCKET ERROR ››', data)
          if (data && data.message === 'Auth failed') {
            setStatus("Authentication failed. Please try again.")
            chatWs.close()
            setIsConnected(false)
            setIsSearching(false)
          } else {
            setStatus(`Error: ${data.message}`)
          }
          break
      }
    }

    chatWs.onerror = (error) => {
      console.error('Chat WebSocket error:', error)
      setStatus("Connection error. Please try again.")
      setIsSearching(false)
    }

    chatWs.onclose = (event) => {
      if (isConnected) {
        setIsConnected(false)
      }
    }
  }
  const leaveRoom = () => {
    const chat = chatWsRef.current
    if (chat && chat.readyState === WebSocket.OPEN && roomId) {
      chat.send(JSON.stringify({ event: "leave room" }))
    }
    if (chat) {
      chat.close()
    }

    setIsConnected(false)
    setStatus("You have left the chat. Press 'Find' to start again.")
    setRoomId(null)
    setMessages([])
    setStrangerTyping(false)
  }
  const handleFindChat = () => {
    if (!authToken) {
      setStatus("Loading authentication...")
      return
    }
    
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
    
    const chat = chatWsRef.current
    if (chat && chat.readyState === WebSocket.OPEN) {
      chat.send(JSON.stringify({ event: "typing", data: { roomId, isTyping: false } }))
    }

    setMessages((prev) => [...prev, { text: inputValue, sender: "you" }])
    
    if (chat && chat.readyState === WebSocket.OPEN) {
      chat.send(JSON.stringify({ event: "chat message", data: { msg: inputValue, roomId } }))
    }
      setInputValue("")
    setStrangerTyping(false)
  }

  const handleTyping = (isTyping: boolean) => {
    if (!roomId || !isConnected) return
    const chat = chatWsRef.current
    if (chat && chat.readyState === WebSocket.OPEN) {
      chat.send(JSON.stringify({ event: "typing", data: { roomId, isTyping } }))    }
  }
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

      <div className="bg-gray-800/50 p-3 sm:p-4 text-center border-b border-gray-700 flex-shrink-0">
        <p
          className={`text-sm sm:text-base font-medium ${
            status.includes("Matched") ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {status}
        </p>
      </div>


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

  
      <form
        onSubmit={handleSendMessage}
        className="bg-gray-800 p-3 sm:p-4 border-t border-gray-700 flex items-center gap-2 sm:gap-3 flex-shrink-0"
      >        {!isConnected && (
          <button
            type="button"
            onClick={handleFindChat}
            disabled={isSearching || !authToken}
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
