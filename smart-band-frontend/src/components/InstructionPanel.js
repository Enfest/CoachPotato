import React from "react";
import "./InstructionPanel.css";

function InstructionPanel({ exercise, onBack, onNext }) {
  if (!exercise) return null;

  return (
    <div className="instruction-panel">
      <h2>動作教學：{exercise.name}</h2>
      <div className="instruction-images">
        <div>
          <h4>彈力帶使用方式</h4>
          <img src={exercise.bandImage} alt="band usage" />
        </div>
        {exercise.sensorImage && (
          <div>
            <h4>感測器穿戴建議</h4>
            <img src={exercise.sensorImage} alt="sensor placement" />
          </div>
        )}
      </div>
      <div className="instruction-buttons">
        <button onClick={onBack}>← 回到上一頁</button>
        <button onClick={onNext}>下一步 →</button>
      </div>
    </div>
  );
}

export default InstructionPanel;