// components/GameStartScreen.js
import React from "react";
import "./GameStartScreen.css";

function GameStartScreen({ onStart }) {
  return (
    <div className="game-start-screen">
      <h2>🎮 張力版 Flappy Bird</h2>
      <p>請準備好您的裝置，點擊下方按鈕開始測量基準值。</p>
      <button onClick={onStart}>開始遊戲</button>
    </div>
  );
}

export default GameStartScreen;
