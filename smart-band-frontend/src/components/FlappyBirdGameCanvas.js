// FlappyBirdGameCanvas.js
import React, { useEffect, useRef, useState } from "react";
import "./FlappyBirdGame.css";

function FlappyBirdGameCanvas({ socket, baseline, onGameOver }) {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const birdY = useRef(150);
  const birdVelocity = useRef(0);
  const pipes = useRef([]);
  const animationRef = useRef(null);

  // 🎮 遊戲參數（較慢速度）
  const gravity = 0.3;
  const lift = -6;
  const pipeWidth = 40;
  const gapHeight = 140;
  const pipeSpeed = 1;

  // 通知後端開始遊戲
  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "start_game_mode" }));
    }

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.force !== undefined) {
        const ratio = data.force / baseline;
        if (!running && ratio > 0.5) {
          setRunning(true);
          initializeGame();
        }

        if (running) {
          if (ratio > 0.5) {
            birdVelocity.current = lift;
          }
        }
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.send(JSON.stringify({ action: "stop_game_mode" }));
      cancelAnimationFrame(animationRef.current);
    };
  }, [socket, baseline, running]);

  const initializeGame = () => {
    pipes.current = [
      { x: 400, height: randomHeight() },
      { x: 650, height: randomHeight() }
    ];
    birdY.current = 150;
    birdVelocity.current = 0;
    setScore(0);

    // 等待 DOM 渲染完成再開始畫
    setTimeout(() => {
      if (canvasRef.current) {
        animationRef.current = requestAnimationFrame(updateGame);
      }
    }, 50);
  };

  const randomHeight = () => Math.floor(Math.random() * 150) + 50;

  const updateGame = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 300);

    // Bird movement
    birdVelocity.current += gravity;
    birdY.current += birdVelocity.current;

    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(80, birdY.current, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Pipes
    ctx.fillStyle = "#6c9ba1";
    pipes.current.forEach((pipe) => {
      pipe.x -= pipeSpeed;

      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
      ctx.fillRect(pipe.x, pipe.height + gapHeight, pipeWidth, 300 - pipe.height - gapHeight);

      const birdTop = birdY.current - 10;
      const birdBottom = birdY.current + 10;
      const inPipeX = 80 + 10 > pipe.x && 80 - 10 < pipe.x + pipeWidth;

      if (
        inPipeX &&
        (birdTop < pipe.height || birdBottom > pipe.height + gapHeight)
      ) {
        endGame();
        return;
      }
    });

    // Remove passed pipes
    if (pipes.current.length && pipes.current[0].x + pipeWidth < 0) {
      pipes.current.shift();
      pipes.current.push({ x: 400, height: randomHeight() });
      setScore((prev) => prev + 1);
    }

    // Check ground/ceiling collision
    if (birdY.current > 300 || birdY.current < 0) {
      endGame();
      return;
    }

    animationRef.current = requestAnimationFrame(updateGame);
  };

  const endGame = () => {
    cancelAnimationFrame(animationRef.current);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "stop_game_mode" }));
    }
    onGameOver(score);
  };

  return (
    <div className="game-canvas-container">
      <h2>🐤 Flappy Force</h2>
      <canvas ref={canvasRef} width={400} height={300} className="game-canvas" />
      <p>🏅 分數：{score}</p>
    </div>
  );
}

export default FlappyBirdGameCanvas;
