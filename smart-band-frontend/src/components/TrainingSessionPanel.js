import React, { useState, useEffect } from "react";
import "./TrainingSessionPanel.css";
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

function TrainingSessionPanel({ socket, baseline, onBack, onComplete }) {
  const [settings, setSettings] = useState({
    pull: 3,
    hold: 2,
    relax: 3,
    reps: 6,
  });

  const [spokenMessage, setSpokenMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [forceData, setForceData] = useState([]);
  const [repCount, setRepCount] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Training message received:", data);
      if (data.say) setSpokenMessage(data.say);
      if (data.force !== undefined) {
        const newEntry = {
          time: new Date().toLocaleTimeString().split(" ")[0].slice(-8),
          force: data.force,
          outOfRange: data.force_ok,
          imu: data.imu,

        };
        setForceData((prev) => [...prev.slice(-99), newEntry]);
        setRepCount(data.reps);

        
      }
      if (data.status === "done") {
        setStatus("done");
        onComplete([...forceData]);
        }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, repCount, settings.reps, forceData, onComplete]);

  const sendTrainingConfig = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "start_training",
        config: {
          ...settings,
          baseline
        }
      }));
      setStatus("running");
    }
  };

  return (
    <div className="training-panel">
      <h2>💪 開始訓練</h2>

      {status === "idle" && (
        <>
          <div className="training-settings">
            <label>拉起秒數：
              <input type="number" value={settings.pull} onChange={(e) => setSettings({ ...settings, pull: Number(e.target.value) })} />
            </label>
            <label>穩定秒數：
              <input type="number" value={settings.hold} onChange={(e) => setSettings({ ...settings, hold: Number(e.target.value) })} />
            </label>
            <label>放鬆秒數：
              <input type="number" value={settings.relax} onChange={(e) => setSettings({ ...settings, relax: Number(e.target.value) })} />
            </label>
            <label>每組次數：
              <input type="number" value={settings.reps} onChange={(e) => setSettings({ ...settings, reps: Number(e.target.value) })} />
            </label>
          </div>

          <div className="training-buttons">
            <button onClick={onBack}>← 回上一步</button>
            <button onClick={sendTrainingConfig}>開始訓練</button>
          </div>
        </>
      )}

      {status === "running" && (
        <>
          <div className="training-status">
            <p>訓練中...（完成 {repCount} / {settings.reps} 次）</p>
            {spokenMessage && <p className="spoken">🎧 {spokenMessage}</p>}
          </div>

          <div className="chart-area">
            <h4>📈 張力圖表</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={forceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="force"
                  stroke="#8884d8"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                {
                  forceData.map((entry, idx) => (
                    (entry.outOfRange || entry.imu) && (
                      <ReferenceDot
                        key={idx}
                        x={entry.time}
                        y={entry.force}
                        r={5}
                        fill={entry.outOfRange ? "#f44336" : "orange"}
                        stroke={entry.outOfRange ? "#f44336" : "orange"}
                        strokeWidth={1}
                        label={{
                          value: entry.imu ? "膝蓋動" : "力道錯誤",
                          position: "top",
                          fontSize: 10,
                          fill: "#555"
                        }}
                      />
                    )
                  ))
                }
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default TrainingSessionPanel;
