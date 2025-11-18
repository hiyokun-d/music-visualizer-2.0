let isFirstBeat = true;
let currentAnimation;

function makeAbeat() {
  requestAnimationFrame(makeAbeat);

  if (beatDetected) {
    if (isFirstBeat) {
      gsap.to(videoPlayer, {
        filter: "brightness(150%) contrast(145%) blur(12px) saturate(122%)",
        scale: 1.2,
        duration: 0.7,
        // ease: "power4.out",
        delay: 0,
        onComplete: () =>
          gsap.to(videoPlayer, {
            filter: "brightness(100%) contrast(100%) blur(0px) saturate(50%)",
            scale: 1.05,
            duration: 1.3,
            yoyo: true,
            delay: 0,
          }),
      });

      isFirstBeat = false;
    } else {
      const directionX = Math.random() < 0.5 ? "+=100" : "-=100";
      const directionY = Math.random() < 0.5 ? "+=100" : "-=100";
      gsap.to(videoPlayer, {
        filter: "brightness(130%) contrast(135%) saturate(70%)",
        y: directionY, // Move down by 15 pixels
        x: directionX,
        scale: 1.2,
        duration: 0.3,
        yoyo: true,
        delay: 0,
        onComplete: () => {
          gsap.to(videoPlayer, {
            y: 0, // Move back up to the original position
            x: 0,
            filter: "brightness(100%) contrast(100%)",
            scale: 1.05,
            duration: 0.5,
            delay: 0,
          });
        },
      });
    }
  }
}

// Start beat detection
makeAbeat();
