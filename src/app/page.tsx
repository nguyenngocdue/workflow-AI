
"use client";

import { useState } from "react";
import { Button } from "ui/button";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("http://127.0.0.1:5678/webhook/366f90e6-9e3d-434b-8e17-54fa4b8cbe7d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      console.log("DATA", data)
      setResponse(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponse(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow w-full max-w-lg p-5 flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-gray-800">AI Chat</h1>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        <Button onClick={handleClick} disabled={loading || !message.trim()} className="w-full">
          {loading ? "Sending..." : "Send"}
        </Button>

        {response && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
            <p className="text-xs font-medium text-gray-400 mb-1">AI Response</p>
            {response}
          </div>
        )}
      </div>
    </div>
  );
}
