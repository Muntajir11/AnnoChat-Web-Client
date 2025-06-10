"use client"

import { useState, useEffect } from "react"
import { ArrowRight, MessageSquare, Shield, Users, X, Smartphone, Download } from "lucide-react"
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

  const handlePlayStoreClick = () => {
    // Replace with your actual Play Store URL
    window.open("https://play.google.com/store/apps/details?id=com.annochat.app", "_blank")
  }

  if (startChat) {
    return <RandomChat onBack={() => setStartChat(false)} />
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
      style={{ overflow: "auto", height: "auto" }}
    >
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm p-3 md:p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center min-w-0">
          <img src="/logo.png" alt="AnnoChat Logo" className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 flex-shrink-0" />
          <h1 className="text-lg md:text-xl font-bold text-emerald-400 truncate">AnnoChat</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={handlePlayStoreClick}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1.5 md:px-3 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center"
          >
            <Smartphone className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            <span className="hidden xs:inline">Get App</span>
            <span className="xs:hidden">App</span>
          </button>
          <button
            onClick={() => setStartChat(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center"
          >
            <span className="hidden xs:inline">Start Chatting</span>
            <span className="xs:hidden">Chat</span>
            <ArrowRight className="ml-1 md:ml-2 w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section with App Download */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-start text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Chat <span className="text-emerald-400">Anonymously</span> with Strangers
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Connect instantly with random people from around the world. No registration required.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setStartChat(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-lg font-medium transition-all transform hover:scale-105 flex items-center"
              >
                Start a Random Chat
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={handlePlayStoreClick}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full text-lg font-medium transition-all flex items-center group"
              >
                <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Download App
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="w-48 h-96 bg-gray-900 rounded-3xl p-2 shadow-2xl border border-gray-600">
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl flex flex-col">
                  {/* Phone mockup header */}
                  <div className="bg-gray-800 rounded-t-2xl p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-emerald-400 rounded mr-2"></div>
                        <span className="text-white text-sm font-medium">AnnoChat</span>
                      </div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    </div>
                  </div>

                  {/* Phone mockup content */}
                  <div className="flex-1 p-4 space-y-3">
                    <div className="bg-emerald-600/20 p-3 rounded-lg">
                      <div className="text-emerald-400 text-xs">Stranger</div>
                      <div className="text-white text-sm">Hello! How are you?</div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg ml-8">
                      <div className="text-gray-300 text-xs">You</div>
                      <div className="text-white text-sm">Hi there! I'm good, thanks!</div>
                    </div>
                    <div className="bg-emerald-600/20 p-3 rounded-lg">
                      <div className="text-emerald-400 text-xs">Stranger</div>
                      <div className="text-white text-sm">Nice to meet you!</div>
                    </div>
                  </div>

                  {/* Phone mockup input */}
                  <div className="p-4 border-t border-gray-700">
                    <div className="bg-gray-700 rounded-full px-4 py-2">
                      <div className="text-gray-400 text-sm">Type a message...</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 bg-emerald-400/10 rounded-3xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Banner */}
      <section className="bg-gradient-to-r from-emerald-900/50 to-gray-800/50 py-8 px-4 border-y border-emerald-800/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <div className="bg-emerald-600/20 p-3 rounded-full mr-4">
              <Smartphone className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AnnoChat Mobile</h3>
              <p className="text-emerald-400">Available on Google Play</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-gray-300">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                Optimized mobile interface
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                Push notifications
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                Enhanced privacy
              </li>
            </ul>

            <button
              onClick={handlePlayStoreClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-base font-medium transition-all flex items-center whitespace-nowrap ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download on Google Play
            </button>
          </div>
        </div>
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
      <footer className="bg-gray-800 py-8 px-4 mt-auto border-t border-gray-700">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            {/* Brand Section */}
            <div className="flex flex-col">
              <div className="flex items-center mb-4">
                <img src="/logo.png" alt="AnnoChat Logo" className="w-6 h-6 mr-2" />
                <span className="text-emerald-400 font-bold text-lg">AnnoChat</span>
              </div>
              <p className="text-gray-400 text-sm">
                Connect anonymously with strangers from around the world. Safe, secure, and private conversations.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col">
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setStartChat(true)}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm text-left"
                >
                  Start Chatting
                </button>
                <button
                  onClick={handlePlayStoreClick}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm flex items-center"
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Download Android App
                </button>
                <button
                  onClick={() => setShowRules(true)}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm text-left"
                >
                  Community Guidelines
                </button>
              </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col">
              <h4 className="text-white font-semibold mb-4">Connect with Developer</h4>
              <div className="space-y-3">
                <a
                  href="https://www.linkedin.com/in/munta-jir-30737a230/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-400 hover:text-emerald-400 transition-colors text-sm group"
                >
                  <svg
                    className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn Profile
                </a>
                <a
                  href="https://x.com/MuntajirGazi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-400 hover:text-emerald-400 transition-colors text-sm group"
                >
                  <svg
                    className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                  </svg>
                  Follow on X (Twitter)
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} AnnoChat. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Made with ❤️ for anonymous connections</span>
            </div>
          </div>
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
