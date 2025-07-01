"use client"

import { useState, useEffect } from "react"
import { ArrowRight, MessageSquare, Shield, Users, X, Smartphone, Download, Sparkles, Zap, Video } from "lucide-react"
import RandomChat from "./random-chat"
import VideoChat from "./video-chat"

export default function HomePage() {
  const [startChat, setStartChat] = useState(false)
  const [startVideoChat, setStartVideoChat] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [floatingElements, setFloatingElements] = useState<Array<{
    left: string;
    top: string;
    animation: string;
    animationDelay: string;
  }>>([]);

  useEffect(() => {
    document.body.style.overflow = "auto"
    document.documentElement.style.overflow = "auto"


    const elements = [...Array(15)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
      animationDelay: `${Math.random() * 3}s`,
    }))
    setFloatingElements(elements)

    // Mouse tracking for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)

  
    return () => {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const handlePlayStoreClick = () => {
    // Replace with your actual Play Store URL
    window.open("https://play.google.com/store/apps/details?id=com.annochat", "_blank")
  }

  if (startChat) {
    return <RandomChat onBack={() => setStartChat(false)} />
  }

  if (startVideoChat) {
    return <VideoChat onBack={() => setStartVideoChat(false)} />
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black text-white relative overflow-hidden"
      style={{ overflow: "auto", height: "auto" }}
    >
      {/* Interactive Mouse Follower */}
      <div
        className="fixed w-96 h-96 pointer-events-none z-0 opacity-20"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 50%, transparent 70%)",
          filter: "blur(40px)",
          transition: "all 0.3s ease-out",
        }}
      />

      {/* Dynamic Background Patterns */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:30px_30px]"></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-white/[0.03] to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-l from-white/[0.03] to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-gradient-to-t from-white/[0.02] to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-gradient-to-b from-white/[0.02] to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((element, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              left: element.left,
              top: element.top,
              animation: element.animation,
              animationDelay: element.animationDelay,
            }}
          >
            {i % 3 === 0 ? (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            ) : i % 3 === 1 ? (
              <div className="w-3 h-3 border border-white/30 rotate-45"></div>
            ) : (
              <div className="w-1 h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.1] p-3 md:p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center min-w-0 group">
            <div className="relative">
              <img
                src="/logo.png"
                alt="AnnoChat Logo"
                className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 flex-shrink-0 transition-all duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-white/30 rounded blur-lg opacity-0 group-hover:opacity-50 transition-all duration-500"></div>
            </div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent truncate">
              AnnoChat
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={handlePlayStoreClick}
              className="relative group bg-neutral-900/70 hover:bg-neutral-800/70 text-white px-2 py-1.5 md:px-3 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 flex items-center border border-white/[0.1] hover:border-white/30 overflow-hidden backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Smartphone className="w-3 h-3 md:w-4 md:h-4 mr-1 relative z-10" />
              <span className="hidden xs:inline relative z-10">Get App</span>
              <span className="xs:hidden relative z-10">App</span>
            </button>
            <button
              onClick={() => setStartChat(true)}
              className="relative group bg-white text-black px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 flex items-center hover:bg-neutral-100 overflow-hidden shadow-lg hover:shadow-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="hidden xs:inline relative z-10">Start Chatting</span>
              <span className="xs:hidden relative z-10">Chat</span>
              <ArrowRight className="ml-1 md:ml-2 w-3 h-3 md:w-4 md:h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with App Download */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-neutral-900/60 border border-white/[0.1] backdrop-blur-sm shadow-lg">
                <Sparkles className="w-4 h-4 mr-2 text-neutral-300 animate-pulse" />
                <span className="text-sm font-medium text-neutral-200">Anonymous • Secure • Instant</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                Chat{" "}
                <span className="bg-gradient-to-r from-neutral-200 via-white to-neutral-300 bg-clip-text text-transparent">
                  Anonymously
                </span>
                <br />
                with Strangers
              </h1>
              <p className="text-xl text-neutral-300 leading-relaxed max-w-lg">
                Connect instantly with random people from around the world. Experience genuine conversations without
                boundaries.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setStartChat(true)}
                className="group relative bg-white text-black px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 flex items-center hover:bg-neutral-100 transform hover:scale-[1.02] overflow-hidden shadow-xl hover:shadow-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <MessageSquare className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10">Start Text Chat</span>
                <ArrowRight className="ml-3 w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setStartVideoChat(true)}
                className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 flex items-center transform hover:scale-[1.02] overflow-hidden shadow-xl hover:shadow-blue-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Video className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10">Start Video Chat</span>
                <ArrowRight className="ml-3 w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handlePlayStoreClick}
                className="group relative bg-neutral-900/60 hover:bg-neutral-800/60 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 flex items-center border border-white/[0.1] hover:border-white/30 backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Download className="w-5 h-5 mr-3 relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10">Download App</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <div className="absolute -inset-4 bg-white/[0.02] rounded-3xl blur-xl"></div>
              <div className="relative w-64 h-[32rem] bg-gradient-to-b from-neutral-950/90 to-black/90 rounded-3xl p-2 border border-white/[0.1] backdrop-blur-sm shadow-2xl">
                <div className="w-full h-full bg-gradient-to-b from-neutral-950 to-black rounded-2xl flex flex-col overflow-hidden border border-white/[0.08]">
                  {/* Phone mockup header */}
                  <div className="bg-gradient-to-r from-neutral-950 to-neutral-900 p-4 border-b border-white/[0.1]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img src="/logo.png" alt="AnnoChat Logo" className="w-6 h-6 rounded mr-2 shadow-lg" />
                        <span className="text-white text-sm font-semibold">AnnoChat</span>
                      </div>
                      <div className="w-2 h-2 bg-gradient-to-r from-white to-neutral-300 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                  </div>

                  {/* Phone mockup content */}
                  <div className="flex-1 p-4 space-y-4 bg-gradient-to-b from-black to-neutral-950">
                    <div className="bg-gradient-to-r from-neutral-900/70 to-neutral-800/70 p-4 rounded-2xl border border-white/[0.1] backdrop-blur-sm shadow-lg">
                      <div className="text-neutral-300 text-xs font-medium mb-1">Stranger</div>
                      <div className="text-white text-sm">Hello! How are you today?</div>
                    </div>
                    <div className="bg-gradient-to-r from-neutral-800/70 to-neutral-700/70 p-4 rounded-2xl ml-8 border border-white/[0.1] backdrop-blur-sm shadow-lg">
                      <div className="text-neutral-300 text-xs font-medium mb-1">You</div>
                      <div className="text-white text-sm">Hi there! I'm doing great, thanks!</div>
                    </div>
                    <div className="bg-gradient-to-r from-neutral-900/70 to-neutral-800/70 p-4 rounded-2xl border border-white/[0.1] backdrop-blur-sm shadow-lg">
                      <div className="text-neutral-300 text-xs font-medium mb-1">Stranger</div>
                      <div className="text-white text-sm">Nice to meet you! 😊</div>
                    </div>
                  </div>

                  {/* Phone mockup input */}
                  <div className="p-4 border-t border-white/[0.1] bg-gradient-to-r from-neutral-950 to-neutral-900">
                    <div className="bg-neutral-900/70 rounded-2xl px-4 py-3 border border-white/[0.1] backdrop-blur-sm">
                      <div className="text-neutral-400 text-sm">Type a message...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Banner */}
      <section className="relative py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-gradient-to-r from-neutral-950/80 via-neutral-900/80 to-neutral-950/80 rounded-3xl p-8 border border-white/[0.1] backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.01]"></div>
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/[0.08] rounded-2xl blur opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-neutral-900/80 to-neutral-800/80 p-4 rounded-2xl border border-white/[0.1] shadow-lg">
                    <Smartphone className="w-8 h-8 text-neutral-200" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
                    AnnoChat Mobile
                  </h3>
                  <p className="text-neutral-300 font-medium">Available on Google Play</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center">
                <ul className="flex flex-wrap gap-x-8 gap-y-3 text-neutral-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gradient-to-r from-white to-neutral-300 rounded-full mr-3 shadow-lg"></div>
                    Optimized mobile interface
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gradient-to-r from-white to-neutral-300 rounded-full mr-3 shadow-lg"></div>
                    Push notifications
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gradient-to-r from-white to-neutral-300 rounded-full mr-3 shadow-lg"></div>
                    Enhanced privacy
                  </li>
                </ul>

                <button
                  onClick={handlePlayStoreClick}
                  className="group relative bg-white text-black px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center hover:bg-neutral-100 overflow-hidden shadow-lg hover:shadow-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Download className="w-5 h-5 mr-2 relative z-10 group-hover:animate-bounce" />
                  <span className="relative z-10">Download on Google Play</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Experience seamless anonymous conversations with our cutting-edge platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Connect Instantly",
                description:
                  "Press the 'Find' button and get matched with a random stranger in seconds. No waiting, no delays.",
              },
              {
                icon: MessageSquare,
                title: "Text Chat",
                description:
                  "Enjoy text-based conversations with complete anonymity. Pure communication without distractions.",
              },
              {
                icon: Shield,
                title: "Stay Anonymous",
                description:
                  "Your identity is never revealed. Chat freely without sharing personal information or worries.",
              },
            ].map((feature, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-white/[0.03] rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-b from-neutral-950/80 to-neutral-900/80 p-8 rounded-3xl border border-white/[0.1] backdrop-blur-sm hover:border-white/20 transition-all duration-300 h-full shadow-xl">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-white/[0.08] rounded-2xl blur opacity-60"></div>
                    <div className="relative bg-gradient-to-r from-neutral-900/80 to-neutral-800/80 p-4 rounded-2xl border border-white/[0.1] shadow-lg">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-neutral-300 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative bg-gradient-to-r from-neutral-950/80 via-neutral-900/80 to-neutral-950/80 rounded-3xl p-12 border border-white/[0.1] backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.01]"></div>
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white via-neutral-100 to-neutral-200 bg-clip-text text-transparent">
                Ready to meet someone new?
              </h2>
              <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
                Join thousands of users already connecting anonymously around the world
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button
                  onClick={() => setStartChat(true)}
                  className="group relative bg-white text-black px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:bg-neutral-100 transform hover:scale-[1.02] overflow-hidden shadow-xl hover:shadow-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">Start Chatting Now</span>
                </button>
                <button
                  onClick={() => setShowRules(true)}
                  className="group relative bg-neutral-900/60 hover:bg-neutral-800/60 text-white px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 border border-white/[0.1] hover:border-white/30 backdrop-blur-sm overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">Community Guidelines</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-neutral-950/80 to-neutral-900/80 py-12 px-4 mt-auto border-t border-white/[0.1] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-8">
            {/* Brand Section */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center group">
                <div className="relative">
                  <img
                    src="/logo.png"
                    alt="AnnoChat Logo"
                    className="w-8 h-8 mr-3 transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-white/30 rounded blur opacity-0 group-hover:opacity-40 transition-opacity"></div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
                  AnnoChat
                </span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Connect anonymously with strangers from around the world. Safe, secure, and private conversations that
                matter.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col space-y-4">
              <h4 className="text-xl font-bold text-white">Quick Links</h4>
              <div className="space-y-3">
                <button
                  onClick={() => setStartChat(true)}
                  className="text-neutral-300 hover:text-white transition-colors text-left block"
                >
                  Start Chatting
                </button>
                <button
                  onClick={handlePlayStoreClick}
                  className="text-neutral-300 hover:text-white transition-colors flex items-center"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Download Android App
                </button>
                <button
                  onClick={() => setShowRules(true)}
                  className="text-neutral-300 hover:text-white transition-colors text-left block"
                >
                  Community Guidelines
                </button>
              </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col space-y-4">
              <h4 className="text-xl font-bold text-white">Connect with Developer</h4>
              <div className="space-y-4">
                <a
                  href="https://www.linkedin.com/in/munta-jir-30737a230/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center text-neutral-300 hover:text-white transition-all duration-300"
                >
                  <div className="relative">
                    <svg
                      className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <div className="absolute inset-0 bg-white/20 rounded blur opacity-0 group-hover:opacity-40 transition-opacity"></div>
                  </div>
                  LinkedIn Profile
                </a>
                <a
                  href="https://x.com/MuntajirGazi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center text-neutral-300 hover:text-white transition-all duration-300"
                >
                  <div className="relative">
                    <svg
                      className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                    <div className="absolute inset-0 bg-white/20 rounded blur opacity-0 group-hover:opacity-40 transition-opacity"></div>
                  </div>
                  Follow on X (Twitter)
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/[0.1] pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-neutral-300 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} AnnoChat. All rights reserved.
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-400">Made with</span>
              <span className="text-red-400 animate-pulse">❤️</span>
              <span className="text-neutral-400">for anonymous connections</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-gradient-to-b from-neutral-950 to-black rounded-3xl max-w-md w-full p-8 border border-white/[0.1] backdrop-blur-xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="absolute inset-0 bg-white/[0.02] rounded-3xl"></div>
            <button
              onClick={() => setShowRules(false)}
              className="absolute right-6 top-6 text-neutral-300 hover:text-white transition-colors group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
            <div className="relative">
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
                Community Guidelines
              </h3>
              <ul className="space-y-4 text-neutral-300">
                {[
                  "Be respectful to other users",
                  "Do not share personal information",
                  "No harassment, hate speech, or bullying",
                  "No explicit or inappropriate content",
                  "No spamming or flooding the chat",
                  "Users must be 18+ to use this service",
                  "Conversations are not monitored or stored",
                ].map((rule, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-gradient-to-r from-white to-neutral-300 rounded-full mr-3 mt-2 flex-shrink-0 shadow-lg"></div>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowRules(false)}
                className="mt-8 w-full bg-white text-black py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-neutral-100 shadow-lg hover:shadow-white/20"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
