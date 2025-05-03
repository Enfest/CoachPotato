import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="title">🥔 Coach Potato - 智慧健身彈力帶</h1>
      <h2>選擇模式</h2>
      <div className="button-group">
        <button className="mode-button" onClick={() => navigate("/training")}>
          🏋️ 健身模式
        </button>
        <button className="mode-button" onClick={() => navigate("/game")}>
          🎮 遊戲模式
        </button>
      </div>
    </div>
  );
};

export default Home;
