//@hiyokun-d was here!

const canvases = document.getElementsByClassName("visualizer");
const videoPlayer = document.getElementById("background-video");

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let source;
let analyser;
let dataArray;

// Function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const colors = [
  "#607848",
  "#b4ccB9",
  "#de652f",
  "#f7dc8d",
  "#3d2e3d",
  "#4286f4",
  "#fc035e",
  "#21c188",
  "#f08a17",
  "#a82745",
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#16a085",
  "#c0392b",
  "#27ae60",
  "#d35400",
  "#8e44ad",
  "#1abc9c",
  "#2980b9",
  "#f1c40f",
  "#34495e",
  "#e67e22",
  "#34495e",
  "#e74c3c",
  "#95a5a6",
  "#d35400",
  "#8e44ad",
];

// Shuffle the colors array
const shuffledColors = shuffleArray(colors);

const beatThreshold = 248;
let beatDetected = false;
let beatTimeout = null;

for (const element of canvases) {
  const canvas = element;
  const ctx = canvas.getContext("2d");

  addEventListener("resize", () => {
    canvas.width = innerHeight;
  });

  canvas.width = innerHeight;
  canvas.height = innerHeight;

  fetch("music/gravity falls.mp3")
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((AudioBuffer) => {
      console.log("Audio loaded successfully");
      source = audioContext.createBufferSource();
      source.buffer = AudioBuffer;

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024; // Adjust this for the smoother visualization
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      function detectBeat() {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > beatThreshold) {
            if (!beatDetected) {
              beatDetected = true;
              clearTimeout(beatTimeout);

              beatTimeout = setTimeout(() => {
                beatDetected = false;
              }, 100);
            }

            break;
          }
        }

        requestAnimationFrame(detectBeat);
      }

      // Add an event listener to start the audio context on user interaction
      document.addEventListener("click", () => {
        // Check if the audio context is in a suspended state
        if (audioContext.state === "suspended") {
          audioContext.resume().then(() => {
            console.log("Audio context resumed successfully");
            if (audioContext.state === "running" && videoPlayer.paused)
              videoPlayer.play();
          });
        }
      });

      // Start the audio playback
      source.start(0);

      detectBeat();

      function drawVisualizer() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create a new array to store the smoothed points
        const smoothedPoints = [];

        // Calculate the width of each line segment
        const segmentWidth = canvas.width / dataArray.length;

        // Calculate the vertical center
        const centerY = canvas.height / 2;

        // Find the minimum amplitude in the dataArray

        // Loop through the frequency data array and calculate smoothed points
        for (let i = 0; i < dataArray.length; i++) {
          const amplitude = (dataArray[i] / 200 - 1) * (canvas.height / 4);
          const x =
            (i - dataArray.length / 2) * segmentWidth + canvas.width / 2; // Mirror left and right
          let y = centerY + amplitude; // Adjusted y-coordinate

          smoothedPoints.push({ x, y });
        }

        // Set visualizer style properties
        ctx.lineWidth = 2; // Set the line width
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        for (let i = 0; i < shuffledColors.length; i++) {
          gradient.addColorStop(
            i / (shuffledColors.length - 1),
            shuffledColors[i],
          );
        }
        ctx.strokeStyle = gradient; // Set stroke color

        // Begin drawing the visualizer
        ctx.beginPath();

        // Loop through the smoothed points and draw lines, circles, and rectangles
        for (let i = 1; i < smoothedPoints.length; i++) {
          // Draw lines between points
          // ctx.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
          const rectHeight = Math.abs(
            smoothedPoints[i].y - smoothedPoints[i - 1].y,
          ); // Height of the rectangle

          // // Draw circles at each point on the right side
          // ctx.beginPath();
          // ctx.arc(canvas.width * 0.42 + smoothedPoints[i].x, smoothedPoints[i].y, 6, 0, Math.PI * 2);
          // ctx.fill();

          // // Draw circles at each point on the left side (flipped horizontally)
          // ctx.beginPath();
          // ctx.arc(canvas.width * 0.45 - smoothedPoints[i].x, smoothedPoints[i].y, 6, 0, Math.PI * 2);
          // ctx.fill();

          // Begin drawing the blur effect with aesthetic colors

          ctx.beginPath();
          ctx.strokeRect(
            canvas.width * 0.45 + smoothedPoints[i].x,
            smoothedPoints[i].y,
            15,
            rectHeight - 2,
          );
          ctx.strokeRect(
            canvas.width * 0.45 - smoothedPoints[i].x,
            smoothedPoints[i].y,
            15,
            rectHeight - 2,
          );

          // ctx.strokeRect(canvas.width * 0.45 + smoothedPoints[i].x, rectHeight, 15, smoothedPoints[i].y,)
          // ctx.strokeRect(canvas.width * 0.45 - smoothedPoints[i].x, rectHeight, 15, smoothedPoints[i].y)
        }

        // Stroke the lines
        ctx.stroke();

        // Continue animation
        requestAnimationFrame(drawVisualizer);
      }

      // Start drawing the visualizer
      drawVisualizer();
    })
    .catch((error) => {
      console.error("Error loading audio:", error);
    });
}

//@hiyokun-d was here!
