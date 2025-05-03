// GameLeaderboard.js
import React, { useEffect, useState } from "react";
import "./GameLeaderboard.css";

function GameLeaderboard({ socket, score, onRestart }) {
  const [topScores, setTopScores] = useState([]);

  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // 先送出目前得分，要求後端判斷是否需要更新排行榜
      socket.send(JSON.stringify({
        action: "submit_score",
        score: score
      }));

      // 然後請求最新 leaderboard
      socket.send(JSON.stringify({ action: "get_leaderboard" }));

      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Leaderboard message received:", data);
        if (data.action === "leaderboard") {
          setTopScores(data.top_scores);
        }
      };

      socket.addEventListener("message", handleMessage);
      return () => socket.removeEventListener("message", handleMessage);
    }
  }, [socket, score]);

  return (
    <div className="leaderboard">
      <h2>🎉 本次分數：{score}</h2>
      <h3>🏆 排行榜 Top 3</h3>
      <ol>
        {topScores.map((s, idx) => (
          <li key={idx}>第 {idx+1} 名：{s}</li>
        ))}
      </ol>
      <button onClick={onRestart}>🔄 再玩一次</button>
    </div>
  );
}

export default GameLeaderboard;
