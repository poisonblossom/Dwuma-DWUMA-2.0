import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LogLevel, SimliClient } from "simli-client";

import { createSimliSession, generateInterviewerSpeech } from "../services/interviewService";

function resamplePcm16(inputBytes, inputRate = 24000, outputRate = 16000) {
  if (inputRate === outputRate) return inputBytes;

  const input = new Int16Array(
    inputBytes.buffer,
    inputBytes.byteOffset,
    Math.floor(inputBytes.byteLength / 2)
  );

  const outputLength = Math.max(1, Math.floor((input.length * outputRate) / inputRate));
  const output = new Int16Array(outputLength);
  const ratio = inputRate / outputRate;

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * ratio;
    const left = Math.floor(sourcePosition);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = sourcePosition - left;
    output[index] = Math.round(input[left] * (1 - fraction) + input[right] * fraction);
  }

  return new Uint8Array(output.buffer);
}

const SimliInterviewer = forwardRef(function SimliInterviewer(
  { onSpeakingChange, onAvailabilityChange, onStatusChange, className = "" },
  ref
) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const clientRef = useRef(null);
  const startPromiseRef = useRef(null);
  const silentResolverRef = useRef(null);
  const silentTimeoutRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const mountedRef = useRef(true);
  const stoppingRef = useRef(false);
  const connectingRef = useRef(false);
  const connectedRef = useRef(false);
  const speechCacheRef = useRef(new Map());

  const [status, setStatus] = useState("connecting");
  const [errorMessage, setErrorMessage] = useState("");

  function updateStatus(nextStatus) {
    if (!mountedRef.current) return;
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  }

  function resolveSilentWait() {
    if (!silentResolverRef.current) return;
    if (silentTimeoutRef.current) {
      window.clearTimeout(silentTimeoutRef.current);
      silentTimeoutRef.current = null;
    }
    const resolve = silentResolverRef.current;
    silentResolverRef.current = null;
    hasSpokenRef.current = false;
    resolve();
  }

  async function prepare(text) {
  const cleanText = text?.trim();

  if (!cleanText) {
    return;
  }

  if (speechCacheRef.current.has(cleanText)) {
    return;
  }

  try {
    const speech =
      await generateInterviewerSpeech(cleanText);

    speechCacheRef.current.set(
      cleanText,
      speech
    );

    console.log(
      "Preloaded interviewer speech:",
      cleanText
    );
  } catch (error) {
    console.warn(
      "Unable to preload interviewer speech:",
      error
    );
  }
}

 async function start() {
  if (connectedRef.current && clientRef.current) {
    return clientRef.current;
  }

  if (startPromiseRef.current) {
    return startPromiseRef.current;
  }

  if (connectingRef.current) {
    throw new Error("Simli connection is already starting.");
  }

  connectingRef.current = true;

  startPromiseRef.current = (async () => {
    setErrorMessage("");
    updateStatus("connecting");

    const { sessionToken } =
      await createSimliSession();

    if (!sessionToken) {
      throw new Error(
        "Simli did not return a session token."
      );
    }

    if (!videoRef.current || !audioRef.current) {
      throw new Error(
        "The live interviewer media elements are not ready."
      );
    }

    const client = new SimliClient(
      sessionToken,
      videoRef.current,
      audioRef.current,
      null,
      LogLevel.INFO,
      "livekit"
    );

    client.on("start", () => {
      connectedRef.current = true;
      updateStatus("ready");
      onAvailabilityChange?.(true);
    });

    client.on("speaking", () => {
      hasSpokenRef.current = true;
      updateStatus("speaking");
      onSpeakingChange?.(true);
    });

    client.on("silent", () => {
      updateStatus("ready");
      onSpeakingChange?.(false);

      if (hasSpokenRef.current) {
        resolveSilentWait();
      }
    });

    client.on("stop", () => {
      connectedRef.current = false;
      clientRef.current = null;

      updateStatus("disconnected");
      onAvailabilityChange?.(false);
      onSpeakingChange?.(false);

      resolveSilentWait();
    });

    client.on("error", (error) => {
  const message =
    typeof error === "string"
      ? error
      : error?.message || String(error);

  console.error(
    "Simli connection error:",
    message
  );

  connectedRef.current = false;

  setErrorMessage(message);

  updateStatus("error");
  onAvailabilityChange?.(false);
  onSpeakingChange?.(false);

  resolveSilentWait();
});

    clientRef.current = client;

    await client.start();

    connectedRef.current = true;

    return client;
  })();

  try {
    return await startPromiseRef.current;
  } catch (error) {
    connectedRef.current = false;

    console.error(
      "Simli startup failed:",
      error
    );

    setErrorMessage(
      error?.message ||
        String(error) ||
        "Could not start the live interviewer."
    );

    updateStatus("error");
    onAvailabilityChange?.(false);

    throw error;
  } finally {
    connectingRef.current = false;
    startPromiseRef.current = null;
  }
}

  async function speak(text) {
    const client = await start();
    updateStatus("preparing");

          let speech =
        speechCacheRef.current.get(text);

      if (speech) {
        speechCacheRef.current.delete(text);

        console.log(
          "Using preloaded interviewer speech"
        );
      } else {
        console.log(
          "Generating interviewer speech now"
        );

        speech =
          await generateInterviewerSpeech(text);
      }

      const {
        pcmBytes,
        sampleRate
      } = speech;
    const simliAudio = resamplePcm16(pcmBytes, sampleRate || 24000, 16000);

    const finished = new Promise((resolve) => {
      silentResolverRef.current = resolve;
      silentTimeoutRef.current = window.setTimeout(() => {
        console.warn("Simli speaking timeout; releasing interview turn.");
        onSpeakingChange?.(false);
        updateStatus(clientRef.current ? "ready" : "error");
        resolveSilentWait();
      }, Math.max(12000, Math.min(45000, simliAudio.length / 16 + 9000)));
    });

    for (let offset = 0; offset < simliAudio.length; offset += 6000) {
      client.sendAudioData(simliAudio.slice(offset, offset + 6000));
    }

    await finished;
  }

  function clear() {
    clientRef.current?.ClearBuffer?.();
    onSpeakingChange?.(false);
    updateStatus(clientRef.current ? "ready" : "connecting");
    resolveSilentWait();
  }

  async function stop() {
  if (stoppingRef.current) {
    return;
  }

  stoppingRef.current = true;

  resolveSilentWait();

  const client = clientRef.current;

  clientRef.current = null;
  connectedRef.current = false;

  try {
    if (client) {
      await client.stop();
    }
  } catch (error) {
    console.warn(
      "Simli shutdown warning:",
      error
    );
  } finally {
    if (mountedRef.current) {
      updateStatus("disconnected");
      onAvailabilityChange?.(false);
      onSpeakingChange?.(false);
    }

    stoppingRef.current = false;
  }
}

  async function retry() {
  if (
    connectingRef.current ||
    stoppingRef.current
  ) {
    return;
  }

  const previousClient =
    clientRef.current;

  clientRef.current = null;
  connectedRef.current = false;

  if (previousClient) {
    stoppingRef.current = true;

    try {
      await previousClient.stop();
    } catch (error) {
      console.warn(
        "Previous Simli session cleanup:",
        error
      );
    } finally {
      stoppingRef.current = false;
    }
  }

  // Give the remote session a moment to release.
  await new Promise((resolve) =>
    setTimeout(resolve, 1200)
  );

  return start();
}

  useImperativeHandle(
      ref,
      () => ({
        start,
        speak,
        prepare,
        clear,
        stop,
        retry
      })
    );

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      start().catch(() => {
        // Visible error state is rendered below; do not silently swap to the old image.
      });
    }, 0);

    return () => {
  window.clearTimeout(timer);

  resolveSilentWait();

  const client = clientRef.current;
  clientRef.current = null;

  mountedRef.current = false;

  if (client && !stoppingRef.current) {
    stoppingRef.current = true;

    client
      .stop()
      .catch((error) => {
        console.warn(
          "Simli cleanup warning:",
          error
        );
      })
      .finally(() => {
        stoppingRef.current = false;
      });
  }
};
  }, []);

  useEffect(() => {
  mountedRef.current = true;

  const timer = window.setTimeout(() => {
    start().catch(() => {});
  }, 0);

  return () => {
    window.clearTimeout(timer);

    mountedRef.current = false;

    resolveSilentWait();

    // Do not call client.stop() here.
    // The interview lifecycle already stops Simli explicitly.
    clientRef.current = null;
  };
}, []);

  return (
  <div
    className={`coach-simli-stage ${className}`}
    data-status={status}
  >
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="coach-simli-video"
    />

    <audio
      ref={audioRef}
      autoPlay
    />

    {status !== "ready" &&
      status !== "speaking" && (
        <div
          className={`coach-simli-status ${
            status === "error"
              ? "error"
              : ""
          }`}
        >
          {status === "error" ? (
            <>
              <strong>
                Live interviewer could not connect
              </strong>

              <span>
                {errorMessage ||
                  "Check the Simli configuration."}
              </span>

              <button
                type="button"
                disabled={
                  status === "connecting" ||
                  stoppingRef.current
                }
                onClick={() => {
                  retry().catch(() => {});
                }}
              >
                Retry Simli
              </button>
            </>
          ) : (
            <>
              <span className="coach-simli-pulse" />

              <span>
                {status === "preparing"
                  ? "Preparing interviewer..."
                  : "Connecting to Simli..."}
              </span>
            </>
          )}
        </div>
      )}
  </div>
);

 
});



export default SimliInterviewer;
