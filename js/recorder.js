import * as RecordRTC from 'recordrtc';

export class Recorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.recorder = null;
        this.isRecording = false;
        this.recordingStatus = document.getElementById('recordingStatus');
    }

    startRecording() {
        if (this.isRecording) return;

        const stream = this.canvas.captureStream(60);
        this.recorder = new RecordRTC.RecordRTCPromisesHandler(stream, {
            type: 'video',
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 8000000
        });

        this.recorder.startRecording();
        this.isRecording = true;
        this.recordingStatus.style.display = 'block';
    }

    async stopRecording() {
        if (!this.isRecording) return;

        try {
            await this.recorder.stopRecording();
            const blob = await this.recorder.getBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'solar-system-simulation.webm';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error stopping recording:', error);
        }

        this.isRecording = false;
        this.recordingStatus.style.display = 'none';
    }

    update() {
        if (this.isRecording) {
            this.recorder.record();
        }
    }
} 