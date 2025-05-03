import React, { useState } from "react";
import "./BaselineMeasurementPanel.css";

function BaselineMeasurementPanel({ socket, onBaselineReceived, onBack }) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [maxValues, setMaxValues] = useState([]);
  const [message, setMessage] = useState("尚未開始測量");
  const [spokenMessage, setSpokenMessage] = useState("");

  const startBaseline = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMessage("WebSocket 尚未連線");
      return;
    }

    setIsMeasuring(true);
    setMaxValues([]);
    setMessage("倒數 5 秒，請準備...");

    socket.send(JSON.stringify({ action: "measure_baseline" }));

    // 前端提示（實際語音來自伺服器）
    setTimeout(() => {
      setMessage("正在測量中...");
    }, 5000);

    const collector = [];
    const handleMessage = (event) => {
    //   console.log("baseline measurement: ", event.data);
      const data = JSON.parse(event.data);
      if (data.say) setSpokenMessage(data.say);
      if (data.action === "baseline_done") {
        setIsMeasuring(false);
        setMessage("✅ 測量完成");
        onBaselineReceived(data.baseline);
        socket.removeEventListener("message", handleMessage);
      } else if (data.sample !== undefined) {
        collector.push(data.sample);
      }
    };

    socket.addEventListener("message", handleMessage);
  };

  return (
    <div className="baseline-panel">
      <h2>🎯 測量最大張力</h2>
      {spokenMessage && <p className="spoken">🎧 {spokenMessage}</p>}

      {!isMeasuring && (
        <div className="baseline-buttons">
          <button onClick={onBack}>← 回上一步</button>
          <button onClick={startBaseline}>開始測量</button>
        </div>
      )}
    </div>
  );
}

export default BaselineMeasurementPanel;
