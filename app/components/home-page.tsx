"use client"

import { useState, useEffect } from "react"
import { ArrowRight, MessageSquare, Shield, Users, X } from "lucide-react"
import RandomChat from "./random-chat"

export default function HomePage() {
  const [startChat, setStartChat] = useState(false)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    // Override global overflow hidden when homepage is mounted
    document.body.style.overflow = "auto"
    document.documentElement.style.overflow = "auto"

    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    }
  }, [])

  if (startChat) {
    return <RandomChat onBack={() => setStartChat(false)} />
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
      style={{ overflow: "auto", height: "auto" }}
    >
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <img src="/logo.png" alt="AnnoChat Logo" className="w-8 h-8 mr-3" />
          <h1 className="text-xl font-bold text-emerald-400">AnnoChat</h1>
        </div>
        <button
          onClick={() => setStartChat(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center"
        >
          Start Chatting
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Chat <span className="text-emerald-400">Anonymously</span> with Strangers
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8">
          Connect instantly with random people from around the world. No registration required.
        </p>
        <button
          onClick={() => setStartChat(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full text-lg font-medium transition-all transform hover:scale-105"
        >
          Start a Random Chat
        </button>
      </section>

      {/* Features Section */}
      <section className="bg-gray-800/50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-700/50 p-6 rounded-xl flex flex-col items-center text-center">
              <div className="bg-emerald-600/20 p-3 rounded-full mb-4">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Instantly</h3>
              <p className="text-gray-300">
                Press the "Find" button and get matched with a random stranger in seconds.
              </p>
            </div>
            <div className="bg-gray-700/50 p-6 rounded-xl flex flex-col items-center text-center">
              <div className="bg-emerald-600/20 p-3 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Text Chat</h3>
              <p className="text-gray-300">
                Enjoy text-based conversations with complete anonymity. No video or audio.
              </p>
            </div>
            <div className="bg-gray-700/50 p-6 rounded-xl flex flex-col items-center text-center">
              <div className="bg-emerald-600/20 p-3 rounded-full mb-4">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Stay Anonymous</h3>
              <p className="text-gray-300">
                Your identity is never revealed. Chat freely without sharing personal information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Ready to meet someone new?</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setStartChat(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full text-lg font-medium transition-all"
          >
            Start Chatting Now
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-medium transition-all"
          >
            Community Guidelines
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img src="/logo.png" alt="AnnoChat Logo" className="w-5 h-5 mr-2" />
            <span className="text-emerald-400 font-medium">AnnoChat</span>
          </div>
          <div className="text-sm text-gray-400">&copy; {new Date().getFullYear()} AnnoChat. All rights reserved.</div>
        </div>
      </footer>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowRules(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4">Community Guidelines</h3>
            <ul className="space-y-3 text-gray-300">
              <li>• Be respectful to other users</li>
              <li>• Do not share personal information</li>
              <li>• No harassment, hate speech, or bullying</li>
              <li>• No explicit or inappropriate content</li>
              <li>• No spamming or flooding the chat</li>
              <li>• Users must be 18+ to use this service</li>
              <li>• Conversations are not monitored or stored</li>
            </ul>
            <button
              onClick={() => setShowRules(false)}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
