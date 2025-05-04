// scripts/utils.js
let recorder;
let isRecording = false;
let recordedBlobs = [];
let downloadLink;
let recordButton;

export function setupRecording(canvasElement, recordButtonElement, downloadLinkElement) {
    recordButton = recordButtonElement;
    downloadLink = downloadLinkElement;

    recordButton.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = canvasElement.captureStream(30); // 30 FPS
                recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9,opus' // More modern codec
                });

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedBlobs.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(recordedBlobs, {
                        type: 'video/webm'
                    });
                    const url = URL.createObjectURL(blob);
                    downloadLink.href = url;
                    downloadLink.style.display = 'block';
                    recordedBlobs = [];
                    recorder = null;
                };

                recorder.start();
                recordButton.textContent = 'Stop Recording';
                isRecording = true;
                downloadLink.style.display = 'none';
            } catch (error) {
                console.error('Error starting recording:', error);
                alert('Error starting recording. Make sure your browser supports screen capture and the specified codec.');
            }
        } else {
            recorder.stop();
            recordButton.textContent = 'Start Recording';
            isRecording = false;
        }
    });
}