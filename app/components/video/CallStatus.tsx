"use client"

export function CallStatus({
  connectionStatus,
  statusMessage,
}: {
  connectionStatus: string
  statusMessage: string
}) {
  return (
    <div className="text-center p-6">
      <h2 className="text-2xl font-semibold mb-2">{connectionStatus}</h2>
      <p className="text-slate-400 text-sm">{statusMessage}</p>
    </div>
  )
}
