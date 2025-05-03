import React from "react";
import "./TrainingSummaryPanel.css";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from "recharts";

function TrainingSummaryPanel({ data, onNextSet, onBackHome, onViewHistory }) {
  const correctCount = data.filter(d => !d.outOfRange && !d.kneeMoved).length;
  const errorCount = data.filter(d => d.outOfRange).length;
  const kneeCount = data.filter(d => d.kneeMoved).length;
  const navigate = useNavigate();
  const handleBackHome = () => {
    onBackHome();
    navigate("/");
  }

  return (
    <div className="summary-panel">
      <h2>🏁 訓練總結</h2>
      <div className="summary-info">
        <p>✅ 正確次數：{correctCount}</p>
        <p>⚠️ 張力異常次數：{errorCount}</p>
        <p>🦵 姿勢錯誤次數：{kneeCount}</p>
      </div>

      <div className="summary-chart">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="force" stroke="#8884d8" dot={false} strokeWidth={2} />
            {
              data.map((entry, idx) => (
                (entry.outOfRange || entry.kneeMoved) && (
                  <ReferenceDot
                    key={idx}
                    x={entry.time}
                    y={entry.force}
                    r={5}
                    fill={entry.outOfRange ? "red" : "orange"}
                    stroke="black"
                    strokeWidth={1}
                  />
                )
              ))
            }
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="summary-buttons">
        <button onClick={onNextSet}>▶️ 開始下一組</button>
        <button onClick={onBackHome}>🏋️ 回到健身模式</button>
        <button onClick={handleBackHome}>🔙 回到主畫面</button>
      </div>
    </div>
  );
}

export default TrainingSummaryPanel;