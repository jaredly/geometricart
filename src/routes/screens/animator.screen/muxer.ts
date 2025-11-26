import {
    AudioBufferSource,
    BufferTarget,
    CanvasSource,
    getFirstEncodableVideoCodec,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
} from 'mediabunny';

export const generateVideo = async (
    renderCanvas: HTMLCanvasElement | OffscreenCanvas,
    frameRate: number,
    totalFrames: number,
    updateScene: (t: number, frame: number) => void,
) => {
    // let progressInterval = -1;
    let output: Output<Mp4OutputFormat, BufferTarget> | null = null;

    try {
        // Let's set some DOM state
        // renderButton.disabled = true;
        // renderButton.textContent = 'Generating...';
        // horizontalRule.style.display = '';
        // progressBarContainer.style.display = '';
        // progressText.style.display = '';
        // progressText.textContent = 'Initializing...';
        // resultVideo.style.display = 'none';
        // resultVideo.src = '';
        // videoInfo.style.display = 'none';
        // errorElement.textContent = '';

        // const duration = Number(durationSlider.value);
        // const totalFrames = duration * frameRate;

        // Let's init the scene
        // initScene(duration);

        // Create a new output file
        output = new Output({
            target: new BufferTarget(), // Stored in memory
            format: new Mp4OutputFormat(),
        });

        // Retrieve the first video codec supported by this browser that can be contained in the output format
        const videoCodec = await getFirstEncodableVideoCodec(
            output.format.getSupportedVideoCodecs(),
            {
                width: renderCanvas.width,
                height: renderCanvas.height,
            },
        );
        if (!videoCodec) {
            throw new Error("Your browser doesn't support video encoding.");
        }

        // For video, we use a CanvasSource for convenience, as we're rendering to a canvas
        const canvasSource = new CanvasSource(renderCanvas, {
            codec: videoCodec,
            bitrate: QUALITY_HIGH,
        });
        output.addVideoTrack(canvasSource, {frameRate});

        // For audio, we use ArrayBufferSource, because we'll be creating an ArrayBuffer with OfflineAudioContext
        // let audioBufferSource: AudioBufferSource | null = null;

        // Retrieve the first audio codec supported by this browser that can be contained in the output format
        // const audioCodec = await getFirstEncodableAudioCodec(output.format.getSupportedAudioCodecs(), {
        // 	numberOfChannels,
        // 	sampleRate,
        // });
        // if (audioCodec) {
        // 	audioBufferSource = new AudioBufferSource({
        // 		codec: audioCodec,
        // 		bitrate: QUALITY_HIGH,
        // 	});
        // 	output.addAudioTrack(audioBufferSource);
        // } else {
        // 	alert('Your browser doesn\'t support audio encoding, so we won\'t include audio in the output file.');
        // }

        await output.start();

        let currentFrame = 0;

        // // Start an interval that updates the progress bar
        // progressInterval = window.setInterval(() => {
        // 	const videoProgress = currentFrame / totalFrames;
        // 	const overallProgress = videoProgress * (audioBufferSource ? 0.9 : 0.95);
        // 	// progressBar.style.width = `${overallProgress * 100}%`;
        // 	// if (currentFrame === totalFrames && audioBufferSource) {
        // 	// 	progressText.textContent = 'Rendering audio...';
        // 	// } else {
        // 	// 	progressText.textContent = `Rendering frame ${currentFrame}/${totalFrames}`;
        // 	// }
        // }, 1000 / 60);

        // Now, let's crank through all frames in a tight loop and render them as fast as possible
        for (currentFrame; currentFrame < totalFrames; currentFrame++) {
            const currentTime = currentFrame / frameRate;

            // Update the scene
            updateScene(currentTime, currentFrame);

            // Add the current state of the canvas as a frame to the video. Using `await` here is crucial to
            // automatically slow down the rendering loop when the encoder can't keep up.
            await canvasSource.add(currentTime, 1 / frameRate);
        }

        // Signal to the output that no more video frames are coming (not necessary, but recommended)
        canvasSource.close();

        // if (audioBufferSource) {
        // 	// Let's render the audio. Ideally, the audio is rendered before the video (or concurrently to it), but for
        // 	// simplicity, we're rendering it after we've cranked through all frames.
        // 	const audioBuffer = await audioContext.startRendering();
        // 	await audioBufferSource.add(audioBuffer);
        // 	audioBufferSource.close();
        // }

        // clearInterval(progressInterval);

        // // Finalize the file
        // progressText.textContent = 'Finalizing file...';
        // progressBar.style.width = '95%';
        await output.finalize();

        // The file is now ready!

        // progressBar.style.width = '100%';
        // progressBarContainer.style.display = 'none';
        // progressText.style.display = 'none';
        // resultVideo.style.display = '';
        // videoInfo.style.display = '';

        // Display and play the resulting media file
        const videoBlob = new Blob([output.target.buffer!], {type: output.format.mimeType});
        // resultVideo.src = URL.createObjectURL(videoBlob);
        // void resultVideo.play();

        // const fileSizeMiB = (videoBlob.size / (1024 * 1024)).toPrecision(3);
        // videoInfo.textContent = `File size: ${fileSizeMiB} MiB`;
        return videoBlob;
    } catch (error) {
        console.error(error);

        await output?.cancel();

        // clearInterval(progressInterval);
        // errorElement.textContent = String(error);
        // progressBarContainer.style.display = 'none';
        // progressText.style.display = 'none';
    } finally {
        // renderButton.disabled = false;
        // renderButton.textContent = 'Generate video';
    }
};
