// js/utils.js

let recorder;
let recordedBlobs = [];
let isRecording = false;
let canvasStream = null;

/**
 * Initialize the recorder with the canvas element.
 * Must be called once after the renderer’s canvas is in the DOM.
 */
export function initRecording(canvasElement) {
  // 60 FPS capture for smooth HD
  canvasStream = canvasElement.captureStream(60);
}

/**
 * Starts a high-bitrate VP9 recording of the initialized canvas.
 */
export function startRecording() {
  if (isRecording || !canvasStream) return;

  recordedBlobs = [];
  try {
    recorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 25_000_000  // ~25 Mbps for HD
    });
  } catch (e) {
    console.error('MediaRecorder init failed:', e);
    alert('Unable to start recording: ' + e.message);
    return;
  }

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedBlobs.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.style.display = 'none';
    a.href    = url;
    a.download= 'solar-system.webm';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  recorder.start();
  isRecording = true;
  console.log('Recording started');
}

/**
 * Stops the recording and triggers download.
 */
export function stopRecording() {
  if (!isRecording || !recorder) return;
  recorder.stop();
  isRecording = false;
  console.log('Recording stopped');
}
