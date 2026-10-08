import { useEffect, useRef, useState } from "react";

// Microphone access only happens after an explicit Record answer click.
export default function useInterviewAudio({
  onRecording,
  onError,
  maxSeconds = 120,
  maxBytes = 3 * 1024 * 1024,
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const stopping = useRef(false);
  const [requesting, setRequesting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recorder = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const player = useRef(null);
  const audioUrl = useRef(null);
  const alive = useRef(true);
  const permissionPending = useRef(false);
  const generation = useRef(0);
  const callbacks = useRef({ onRecording, onError });
  callbacks.current = { onRecording, onError };
  const supported =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  const stopPlayback = () => {
    player.current?.pause();
    player.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    if (alive.current) setPlaying(false);
  };
  const releaseMicrophone = () => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (alive.current) setRecording(false);
  };
  const stopRecording = () => {
    if (recorder.current?.state === "recording") {
      stopping.current = true;
      if (alive.current) setProcessing(true);
      recorder.current.stop();
    }
    releaseMicrophone();
  };
  const cancelRecording = () => {
    generation.current += 1;
    permissionPending.current = false;
    if (alive.current) setRequesting(false);
    if (recorder.current) recorder.current.onstop = null;
    stopRecording();
    stopping.current = false;
    if (alive.current) setProcessing(false);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current += 1;
      if (recorder.current) recorder.current.onstop = null;
      if (recorder.current?.state === "recording") recorder.current.stop();
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
      player.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  const startRecording = async () => {
    if (
      !supported ||
      stream.current ||
      permissionPending.current ||
      stopping.current
    )
      return;
    const attempt = ++generation.current;
    permissionPending.current = true;
    setRequesting(true);
    stopPlayback();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!alive.current || attempt !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("unsupported");
      const capture = new MediaRecorder(media, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      recorder.current = capture;
      const chunks = [];
      let bytes = 0;
      capture.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
        }
        if (bytes > maxBytes) stopRecording();
      };
      capture.onerror = () => {
        capture.onstop = null;
        stopRecording();
        stopping.current = false;
        if (alive.current) setProcessing(false);
        callbacks.current.onError(
          "The recording stopped unexpectedly. Please record again or type your answer.",
        );
      };
      capture.onstop = () => {
        releaseMicrophone();
        stopping.current = false;
        if (alive.current) setProcessing(false);
        if (!alive.current || attempt !== generation.current) return;
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 32 || blob.size > maxBytes) {
          callbacks.current.onError(
            "The recording was empty or too large. Try a shorter answer or type instead.",
          );
          return;
        }
        callbacks.current.onRecording(blob);
      };
      let elapsed = 0;
      setSeconds(0);
      capture.start(250);
      setRecording(true);
      timer.current = setInterval(() => {
        elapsed += 1;
        setSeconds(elapsed);
        if (elapsed >= maxSeconds) stopRecording();
      }, 1000);
    } catch (error) {
      if (!alive.current || attempt !== generation.current) return;
      releaseMicrophone();
      callbacks.current.onError(
        error.name === "NotAllowedError"
          ? "Microphone access was not granted. Allow it in your browser or type your answer below."
          : "This browser could not start recording. Try Chrome or Safari over HTTPS, or type your answer.",
      );
    } finally {
      if (alive.current && attempt === generation.current) {
        permissionPending.current = false;
        setRequesting(false);
      }
    }
  };
  const play = async (blob) => {
    stopPlayback();
    audioUrl.current = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl.current);
    player.current = audio;
    audio.onended = stopPlayback;
    audio.onerror = () => {
      stopPlayback();
      if (!alive.current) return;
      callbacks.current.onError(
        "The question audio could not play. You can read it and continue.",
      );
    };
    try {
      await audio.play();
      if (alive.current && player.current === audio) setPlaying(true);
    } catch {
      if (!alive.current || player.current !== audio) return;
      stopPlayback();
      callbacks.current.onError(
        "Your browser blocked audio playback. Press Hear question again to play it.",
      );
    }
  };
  return {
    recording,
    processing,
    requesting,
    seconds,
    playing,
    supported,
    startRecording,
    stopRecording,
    cancelRecording,
    play,
    stopPlayback,
  };
}
