'use client';

import { useEffect, useState, useRef, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { Send, UserRound, Users, RefreshCw } from "lucide-react";

export default function RandomChat() {
  const [messages, setMessages] = useState<
    { text: string; sender: "you" | "stranger" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState('Press "Find" to start chatting');
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const presenceRef = useRef<Socket>(
    io(`https://muntajir.me/presence`, {
      autoConnect: false,
      transports: ["websocket"],
      secure: true,
      path: "/socket.io",
    })
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SERVER_URL = "https://muntajir.me";
  const SOCKET_PATH = "/socket.io";

  function connectSocket() {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(SERVER_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      secure: true,
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on("matched", ({ roomId: newRoom }) => {
      setStatus("Matched! Say hello to your stranger.");
      setRoomId(newRoom);
      setIsConnected(true);

      // Join the room
      socket.emit("join room", newRoom);
    });

    socket.on("chat message", ({ msg }) => {
      setMessages((prev) => [...prev, { text: msg, sender: "stranger" }]);
    });

    socket.on("user disconnected", () => {
      setStatus('Stranger disconnected. Press "Find" to start again.');
    });

    socket.connect();
  }

  useEffect(() => {
    const pres = presenceRef.current;
    pres.connect();
    pres.on("onlineUsers", setOnlineUsers);

    // Before the page unloads, tell server you’re leaving
    const handleBeforeUnload = () => {
      if (socketRef.current && roomId) {
        socketRef.current.emit("leave_room", { roomId });
        socketRef.current.close();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Initial chat socket setup
    connectSocket();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      pres.off("onlineUsers", setOnlineUsers);
      pres.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!isConnected || !inputValue.trim() || !roomId) return;
    setMessages((prev) => [...prev, { text: inputValue, sender: "you" }]);
    socketRef.current!.emit("chat message", { msg: inputValue, roomId });
    setInputValue("");
  };

  const handleFindNew = () => {
    setMessages([]);
    setRoomId(null);
    setStatus("Searching for a match...");
    setIsConnected(false);
    connectSocket();
  };

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

      {/* Status Bar */}
      <div className="bg-gray-800/50 p-3 text-center border-b border-gray-700">
        <p
          className={`text-sm font-medium ${
            status.includes("Matched") ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {status}
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "you" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                msg.sender === "you"
                  ? "bg-emerald-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-100 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="bg-gray-800 p-3 border-t border-gray-700 flex items-center gap-2"
      >
        {/* Find New button */}
        <button
          type="button"
          onClick={handleFindNew}
          className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message…"
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
      </form>
    </div>
  );
}
