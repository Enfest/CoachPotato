// components/GameMain.js
import React, { useState, useEffect } from "react";
import GameStartScreen from "./GameStartScreen";
import BaselineMeasurementPanel from "./BaselineMeasurementPanel";
import FlappyBirdGameCanvas from "./FlappyBirdGameCanvas";
import GameLeaderboard from "./GameLeaderboard";

function GameMain({ socket }) {
  const [step, setStep] = useState("start"); // start | baseline | play | leaderboard
  const [baseline, setBaseline] = useState(null);
  const [score, setScore] = useState(0);
  const [topScores, setTopScores] = useState([]);

  // 初始化 topScores（從 localStorage）
  useEffect(() => {
    const saved = localStorage.getItem("flappy_top_scores");
    if (saved) setTopScores(JSON.parse(saved));
  }, []);

  // 遊戲結束後更新排行榜
  const handleGameOver = (finalScore) => {
    console.log("Game Over! Final Score:", finalScore);
    setScore(finalScore);
    const updatedScores = [...topScores, finalScore].sort((a, b) => b - a).slice(0, 3);
    setTopScores(updatedScores);
    localStorage.setItem("flappy_top_scores", JSON.stringify(updatedScores));
    setStep("leaderboard");
  };

  return (
    <div className="flappy-container">
      {step === "start" && (
        <GameStartScreen onStart={() => setStep("baseline")} />
      )}

      {step === "baseline" && (
        <BaselineMeasurementPanel
          socket={socket}
          onBaselineReceived={(value) => {
            setBaseline(value);
            setStep("play");
          }}
          onBack={() => setStep("start")}
        />
      )}

      {step === "play" && (
        <FlappyBirdGameCanvas
          socket={socket}
          baseline={baseline}
          onGameOver={handleGameOver}
        />
      )}

      {step === "leaderboard" && (
        <GameLeaderboard
          socket={socket}
          score={score}
          onRestart={() => setStep("play")}
        />
      )}
    </div>
  );
}

export default GameMain;
