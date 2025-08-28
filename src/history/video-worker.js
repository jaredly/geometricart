let codec_string = "avc1.42001E";

function reportError(e) {
	// Report error to the main thread
	console.log(e.message);
	postMessage(e.message);
}

function captureAndEncode(frame_source, cnv, fps, processChunk) {
	let frame_counter = 0;

	const init = {
		output: processChunk,
		error: reportError,
	};

	const config = {
		codec: codec_string,
		width: cnv.width,
		height: cnv.height,
		bitrate: 1000000,
		avc: { format: "annexb" },
		framerate: fps,
		hardwareAcceleration: "prefer-software",
	};

	let encoder = new VideoEncoder(init);
	encoder.configure(config);

	let reader = frame_source.getReader();
	async function readFrame() {
		const result = await reader.read();
		let frame = result.value;

		if (encoder.encodeQueueSize < 2) {
			frame_counter++;
			const insert_keyframe = false; // (frame_counter % 130) == 0;
			encoder.encode(frame, { keyFrame: insert_keyframe });
			frame.close();
		} else {
			// Too many frames in flight, encoder is overwhelmed
			// let's drop this frame.
			console.log("dropping a frame");
			frame.close();
		}

		setTimeout(readFrame, 1);
	}

	readFrame();
}

function startDecodingAndRendering(cnv) {
	let ctx = cnv.getContext("2d");
	let ready_frames = [];
	let underflow = true;

	async function renderFrame() {
		if (ready_frames.length == 0) {
			underflow = true;
			return;
		}
		let frame = ready_frames.shift();
		underflow = false;

		ctx.drawImage(frame, 0, 0);
		frame.close();

		// Immediately schedule rendering of the next frame
		setTimeout(renderFrame, 0);
	}

	function handleFrame(frame) {
		ready_frames.push(frame);
		if (underflow) {
			underflow = false;
			setTimeout(renderFrame, 0);
		}
	}

	const init = {
		output: handleFrame,
		error: reportError,
	};

	let decoder = new VideoDecoder(init);
	return decoder;
}

function main(frame_source, canvas, fps) {
	let decoder = startDecodingAndRendering(canvas);
	function processChunk(chunk, md) {
		let config = md.decoderConfig;
		if (config) {
			console.log("decoder reconfig");
			decoder.configure(config);
		}

		decoder.decode(chunk);
	}
	captureAndEncode(frame_source, canvas, fps, processChunk);
}

self.onmessage = async function (e) {
	let frame_source = e.data.frame_source;
	let canvas = e.data.canvas;
	let fps = e.data.fps;

	main(frame_source, canvas, fps);
};
