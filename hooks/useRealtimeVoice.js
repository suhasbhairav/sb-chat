"use client";

import { useRef, useState } from "react";

function getEphemeralKey(session) {
  return session.value || session.client_secret?.value || session.client_secret;
}

const REALTIME_WEBRTC_URL = "https://api.openai.com/v1/realtime/calls";

function cleanTranscript(value) {
  return String(value || "").trim();
}

export function useRealtimeVoice({ apiKey, onAssistantTranscript, onTranscript, onUserTranscript, realtimeModel }) {
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  async function stopVoiceChat() {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.remove();
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setVoiceState("idle");
  }

  async function startVoiceChat() {
    if (voiceState === "connecting" || voiceState === "connected") return;
    setVoiceError("");
    setVoiceState("connecting");

    try {
      const sessionResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model: realtimeModel }),
      });
      const session = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(session.error || "Could not create realtime session.");
      }

      const ephemeralKey = getEphemeralKey(session);
      if (!ephemeralKey) {
        throw new Error("Realtime session did not return an ephemeral key.");
      }

      const peer = new RTCPeerConnection();
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;

      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const channel = peer.createDataChannel("oai-events");
      channel.onopen = () => {
        setVoiceState("connected");
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: "Start the voice conversation with a short greeting.",
            },
          }),
        );
      };
      channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const assistantTranscript = cleanTranscript(data.transcript || data.text);
        const userTranscript = cleanTranscript(data.transcript);

        if (data.type === "response.audio_transcript.done" && assistantTranscript) {
          onAssistantTranscript?.(assistantTranscript);
          onTranscript?.(assistantTranscript);
        }
        if (data.type === "response.text.done" && assistantTranscript) {
          onAssistantTranscript?.(assistantTranscript);
          onTranscript?.(assistantTranscript);
        }
        if (data.type === "conversation.item.input_audio_transcription.completed" && userTranscript) {
          onUserTranscript?.(userTranscript);
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const formData = new FormData();
      formData.append("sdp", new Blob([offer.sdp], { type: "application/sdp" }), "offer.sdp");

      const realtimeResponse = await fetch(REALTIME_WEBRTC_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
        },
        body: formData,
      });

      if (!realtimeResponse.ok) {
        throw new Error(`Realtime WebRTC connection failed with status ${realtimeResponse.status}.`);
      }

      const answer = { type: "answer", sdp: await realtimeResponse.text() };
      await peer.setRemoteDescription(answer);

      peerRef.current = peer;
      channelRef.current = channel;
      streamRef.current = stream;
    } catch (error) {
      await stopVoiceChat();
      setVoiceError(error.message || "Voice chat failed.");
      setVoiceState("error");
    }
  }

  async function toggleVoiceChat() {
    if (voiceState === "connected" || voiceState === "connecting") {
      await stopVoiceChat();
      return;
    }

    await startVoiceChat();
  }

  return {
    voiceError,
    voiceState,
    startVoiceChat,
    stopVoiceChat,
    toggleVoiceChat,
  };
}
