"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal types for the Web Speech API. The DOM lib doesn't ship these by
// default — Chrome/Safari expose `webkitSpeechRecognition`, recent Edge also
// exposes `SpeechRecognition`, Firefox exposes neither.
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechError =
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "unknown";

function mapError(code: string): SpeechError {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "not-allowed";
  if (code === "no-speech") return "no-speech";
  if (code === "audio-capture") return "audio-capture";
  if (code === "network") return "network";
  if (code === "aborted") return "aborted";
  return "unknown";
}

export interface UseSpeechRecognitionResult {
  /** Whether the browser supports Web Speech at all. */
  isSupported: boolean;
  /** True between start() and the recognition end event. */
  isListening: boolean;
  /** Concatenated final results since the last start(). */
  finalTranscript: string;
  /** Live partial result while the user is still speaking. */
  interimTranscript: string;
  /** Last error code, cleared on next start(). */
  error: SpeechError | null;
  start(): void;
  stop(): void;
  reset(): void;
}

interface Options {
  lang?: string;
  /** Called once with the final transcript when recognition ends naturally. */
  onResult?: (transcript: string) => void;
}

/**
 * Thin wrapper around the Web Speech API. Push-to-talk style — call start()
 * to begin and stop() (or release) to end. We intentionally use a single
 * recognition instance per hook and recycle it on each start to keep the
 * lifecycle predictable on Chrome (which silently auto-stops after ~5s
 * otherwise).
 */
export function useSpeechRecognition(
  options: Options = {},
): UseSpeechRecognitionResult {
  const { lang = "en-US", onResult } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);

  // Keep the latest callback in a ref so we don't re-create the recognition
  // each render.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Detect support on mount only — keeps SSR output deterministic.
  useEffect(() => {
    setIsSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // no-op — already stopped
    }
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("unknown");
      return;
    }

    // Make sure any previous instance is fully gone before starting again —
    // calling start() twice on the same instance throws InvalidStateError.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    finalRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);

    const r = new Ctor();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => setIsListening(true);

    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalRef.current = (finalRef.current + " " + text).trim();
        } else {
          interim += text;
        }
      }
      setFinalTranscript(finalRef.current);
      setInterimTranscript(interim);
    };

    r.onerror = (event) => {
      const mapped = mapError(event.error);
      // 'aborted' fires whenever we cancel manually — not worth surfacing.
      if (mapped !== "aborted") setError(mapped);
    };

    r.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      const final = finalRef.current.trim();
      if (final && onResultRef.current) {
        onResultRef.current(final);
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (err) {
      setError("unknown");
      setIsListening(false);
      recognitionRef.current = null;
      void err;
    }
  }, [lang]);

  // Always release the mic if the consumer unmounts mid-recording.
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    finalTranscript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
