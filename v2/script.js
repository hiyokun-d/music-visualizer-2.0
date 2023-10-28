// Get the canvas element
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const pausePlay = document.getElementsByClassName("button");
let play = false;
let source;
let analyser;
let dataArray;

const visualizerMenu = document.getElementById("visualizer_menu")
const visualizer = document.getElementById("visualizer")
const bodyEl = document.querySelector("body")

// Function to set canvas dimensions
function setCanvasSize() {
    const containerWidth = canvas.clientWidth;
    const containerHeight = canvas.clientHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    return { containerWidth, containerHeight };
}

const { containerWidth, containerHeight } = setCanvasSize();

// Load and play audio
fetch('../MUSIC/musicExample10.mp3')
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
        // Create an audio source from the decoded audio buffer
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Create an analyser node to analyze the audio data
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Adjust the FFT size for smoother visualization
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Connect the audio source to the analyser
        source.connect(analyser);
        analyser.connect(audioContext.destination);


        // Beat detection variables
        const beatThreshold = 254; // Adjust this value to set the beat detection sensitivity
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
        
        // Start playing the audio
        Array.from(pausePlay).forEach((element) => {
            element.addEventListener("click", () => {
                if (element.classList.contains("play")) {
                    play = true;
                    console.log("It's playing");
                    element.classList.remove("play");
                    element.classList.add("pause");
                    element.textContent = "=";
                    audioContext.resume().then(() => source.start()); // Resume and start the audio
                } else if (element.classList.contains("pause")) {
                    play = false;
                    console.log("It's pausing");
                    element.classList.remove("pause");
                    element.classList.add("play");
                    element.textContent = "▸";
                    audioContext.suspend().then(() => source.stop()); // Suspend and stop the audio
                }
            });
        });

        // Function to draw the centered line-based visualizer
        function drawCenteredLineVisualizer() {
            requestAnimationFrame(drawCenteredLineVisualizer);

            // Set the block color based on beat detection
            // Get the current audio data
            analyser.getByteTimeDomainData(dataArray);

            // Clear the canvas
            ctx.clearRect(0, 0, containerWidth, containerHeight);

            // Set visualizer style properties
            ctx.strokeStyle = 'rgb(187, 225, 250)'; // Set the stroke color
            ctx.lineWidth = 2; // Set the line width
            
            // Calculate the width of each line segment
            const segmentWidth = containerWidth / dataArray.length + 3;
            
            // Calculate the vertical center
            const centerY = containerHeight / 2;
            
            // Draw the centered line-based visualizer
            ctx.beginPath();
            for (let i = 0; i < dataArray.length; i++) {
                const x = i * segmentWidth;
                const y = centerY + (dataArray[i] / 128 - 1) * (containerHeight / 3);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();


            if (beatDetected) {
                visualizerMenu.style.animation = "rotate3D 0.5s ease infinite"
                visualizer.style.animation = "beat 0.5s ease infinite"
                bodyEl.style.animation = "backgroundAnimation 1s ease infinite"
            } else {
                visualizerMenu.style.animation = "rotate3D 1.5s ease infinite"
                visualizer.style.animation = ""
                bodyEl.style.animation = ""
                bodyEl.style.backgroundColor = "black"
            }
        }

        drawCenteredLineVisualizer();
    })
    .catch((e) => {
        console.error(e);
    });
