// Get the canvas element
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const containerWidth = canvas.clientWidth;
const containerHeight = canvas.clientHeight;

const imageEl = document.getElementById("image")
const bodyEl = document.querySelector("body")

// Set the canvas dimensions
canvas.width = containerWidth;
canvas.height = containerHeight;

addEventListener("click", () => {

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    fetch('musicExample.mp3')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            // Create an audio source from the decoded audio buffer
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;

            // Create an analyser node to analyze the audio data
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Connect the audio source to the analyser
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            // Beat detection variables
            const beatThreshold = 250; // Adjust this value to set the beat detection sensitivity
            let beatDetected = false;
            let beatTimeout = null;

            // Function to detect beats in the audio
            function detectBeat() {
                analyser.getByteFrequencyData(dataArray);

                // Check if any frequency bin exceeds the beat threshold
                for (let i = 0; i < bufferLength; i++) {
                    if (dataArray[i] > beatThreshold) {
                        if (!beatDetected) {
                            beatDetected = true;

                            // Set a timeout to reset the beat detection flag after a certain duration
                            clearTimeout(beatTimeout);
                            beatTimeout = setTimeout(() => {
                                beatDetected = false;
                            }, 500);
                        }
                        break;
                    }
                }

                // Call the detectBeat function recursively
                requestAnimationFrame(detectBeat);
            }

            // Call the detectBeat function to start beat detection
            detectBeat();

            // Function to update the visualizer
            function updateVisualizer() {
                requestAnimationFrame(updateVisualizer);

                // Get the current audio data
                analyser.getByteFrequencyData(dataArray);

                // Clear the canvas
                ctx.clearRect(0, 0, containerWidth, containerHeight);

                // Set the block color based on beat detection
                if (beatDetected) {
                    // imageEl.style.transform = "scale(1.2)"
                    imageEl.style.animation = "beat 0.5s cubic-bezier(0.26, -0.11, 0.2, 1.24) infinite"
                    ctx.fillStyle = "white"
                    bodyEl.style.animation = "backgroundAnimation 1s ease infinite"
                } else {
                    imageEl.style.transform = "scale(1)";
                    imageEl.style.animation = "";
                    ctx.fillStyle = "gray";
                    bodyEl.style.animation = ""
                    bodyEl.style.backgroundColor = "black"
                }

                // Calculate the radius of the circular visualizer
                const radius = 300;

                // Calculate the angle between each block
                const angle = (Math.PI * 2) / bufferLength;

                // Draw each block in a circular shape
                for (let i = 0; i < bufferLength; i++) {
                    // Calculate the height of the block based on the audio amplitude
                    const amplitude = (dataArray[i] / 255) * radius + 10;
                    const blockHeight = amplitude;

                    // Calculate the position of the block on the circumference of the circle
                    const x = containerWidth / 2 + Math.cos(i * angle) * radius;
                    const y = containerHeight / 2 + Math.sin(i * angle) * radius;

                    // Draw the block
                    ctx.fillRect(x, y, 2, blockHeight);
                }
            }

            // Start updating the visualizer when the audio starts playing
            source.onended = () => {
                cancelAnimationFrame(updateVisualizer);
            };

            source.start();

            // Start updating the visualizer
            updateVisualizer();
        })
        .catch(error => {
            console.error('Error loading audio:', error);
        });
})