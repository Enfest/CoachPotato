import React, { useEffect, useRef, useState } from "react";
import "./FlappyBirdGame.css";

const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_WIDTH = 50;
const PIPE_GAP = 150;
const BIRD_RADIUS = 20;

function FlappyBirdGame() {
  const canvasRef = useRef(null);
  const [birdY, setBirdY] = useState(200);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);

  const baseline = 10;
  const jumpThreshold = baseline * 0.6;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let lastTime = performance.now();

    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "start_game" }));
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.force && data.force > jumpThreshold) {
        setVelocity(JUMP_STRENGTH);
      }
    };

    const spawnPipe = () => {
      const topHeight = Math.random() * (canvas.height - PIPE_GAP - 100);
      setPipes((prev) => [...prev, { x: canvas.width, topHeight }]);
    };

    const gameLoop = (timestamp) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setVelocity((v) => {
        const newV = v + GRAVITY;
        setBirdY((y) => y + newV);
        return newV;
      });

      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(100, birdY, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "green";
      setPipes((prev) => {
        const updated = prev
          .map((pipe) => ({ ...pipe, x: pipe.x - 2 }))
          .filter((pipe) => pipe.x + PIPE_WIDTH > 0);

        updated.forEach((pipe) => {
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
          ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height);
        });

        return updated;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    spawnPipe();
    const pipeInterval = setInterval(spawnPipe, 2000);
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(pipeInterval);
      ws.close();
    };
  }, [birdY]);

  return (
    <div className="flappy-container">
      <h2>🎮 張力版 Flappy Bird</h2>
      <canvas ref={canvasRef} width={800} height={500} />
      <p>分數：{score}</p>
    </div>
  );
}

export default FlappyBirdGame;
