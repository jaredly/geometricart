const foods = [
	"🍇",
	"🍈",
	"🍉",
	"🍊",
	"🍋",
	"🍌",
	"🍍",
	"🥭",
	"🍎",
	"🍏",
	"🍐",
];
function getRandomFood() {
	let index = Math.floor(Math.random() * foods.length);
	return foods[index];
}

// Draw pretty animation on the source canvas
async function startDrawing() {
	let cnv = document.getElementById("src");
	var ctx = cnv.getContext("2d");

	ctx.fillStyle = "#fff5e6";
	let width = cnv.width;
	let height = cnv.height;
	let cx = width / 2;
	let cy = height / 2;
	let r = Math.min(width, height) / 5;

	ctx.font = "30px Helvetica";
	const text = getRandomFood() + "📹📷Hello WebCodecs 🎥🎞️" + getRandomFood();
	const size = ctx.measureText(text).width;

	let drawOneFrame = function (time) {
		let angle = Math.PI * 2 * (time / 5000);
		let scale = 1 + 0.3 * Math.sin(Math.PI * 2 * (time / 7000));
		ctx.save();
		ctx.fillRect(0, 0, width, height);

		ctx.translate(cx, cy);
		ctx.rotate(angle);
		ctx.scale(scale, scale);

		ctx.fillStyle = "hsl(" + angle * 40 + ",80%,50%)";
		ctx.fillRect(-size / 2, 10, size, 25);

		ctx.fillStyle = "black";
		ctx.fillText(text, -size / 2, 0);

		ctx.restore();
		window.requestAnimationFrame(drawOneFrame);
	};
	window.requestAnimationFrame(drawOneFrame);
}

function startWorker() {
	let worker = new Worker("video-worker.js", { name: "Video worker" });
	worker.onmessage = function (e) {
		// Recreate worker in case of an error
		console.log("Worker error: " + e.data);
		worker.terminate();
		startWorker();
	};

	// Capture animation track for the source canvas
	let src_cnv = document.getElementById("src");
	const fps = 25;
	let stream = src_cnv.captureStream(fps);
	const track = stream.getVideoTracks()[0];
	media_processor = new MediaStreamTrackProcessor(track);
	const reader = media_processor.readable;

	// Create a new destination canvas
	const dst_cnv = document.createElement("canvas");
	dst_cnv.width = src_cnv.width;
	dst_cnv.height = src_cnv.height;
	const dst = document.getElementById("dst");
	if (dst.firstChild) dst.removeChild(dst.firstChild);
	dst.appendChild(dst_cnv);
	let offscreen = dst_cnv.transferControlToOffscreen();
	worker.postMessage(
		{
			canvas: offscreen,
			frame_source: reader,
			fps: fps,
		},
		[offscreen, reader],
	);
}

function main() {
	if (!("VideoFrame" in window)) {
		document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
		return;
	}

	startDrawing();
	startWorker();
}

document.body.onload = main;
