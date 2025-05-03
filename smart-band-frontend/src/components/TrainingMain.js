import React, { useState, useEffect } from "react";
import "../App.css";
import CategorySelector from "./CategorySelector";
import InstructionPanel from "./InstructionPanel";
import BaselineMeasurementPanel from "./BaselineMeasurementPanel";
import TrainingSessionPanel from "./TrainingSessionPanel";
import TrainingSummaryPanel from "./TrainingSummaryPanel";

function TrainingMain({socket, setSocket}) {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [step, setStep] = useState("select");
  const [baseline, setBaseline] = useState(null);
  
  const [forceHistory, setForceHistory] = useState([]);
  const [subtitle, setSubtitle] = useState("");

  

  const handleConfirm = () => {
    if (selectedExercise) {
      setStep("instruction");
    }
  };

  return (
    <div className="app">
      <h1 className="title">🥔 Coach Potato - 智慧健身彈力帶</h1>

      {step === "select" && (
        <>
          <div className="categories">
            <CategorySelector
              title="穿戴姿勢感測器＋彈力帶的健身動作"
              categoryKey="sensor_band"
              onSelect={setSelectedExercise}
            />
            <CategorySelector
              title="僅需彈力帶的健身動作"
              categoryKey="band_only"
              onSelect={setSelectedExercise}
            />
          </div>
          <button className="confirm-button" onClick={handleConfirm}>
            確認選擇
          </button>
        </>
      )}

      {step === "instruction" && (
        <InstructionPanel
          exercise={selectedExercise}
          onBack={() => setStep("select")}
          onNext={() => setStep("baseline")}
        />
      )}

      {step === "baseline" && (
        <>
          <BaselineMeasurementPanel
            socket={socket}
            onBaselineReceived={(value) => {
              setBaseline(value);
              console.log("Baseline set to:", value);
            }}
            onBack={() => setStep("instruction")}
          />
          {baseline && (
            <button className="confirm-button" onClick={() => setStep("training")}>
              進入訓練階段 →
            </button>
          )}
        </>
      )}

      {step === "training" && (
        <TrainingSessionPanel
          socket={socket}
          baseline={baseline}
          onBack={() => setStep("baseline")}
          onComplete={(data) => {
            setForceHistory(data);
            setStep("summary");
            console.log("summary data: ", data);
          }}
        />
      )}

      {step === "summary" && (
        <TrainingSummaryPanel
          data={forceHistory}
          onNextSet={() => {
            setStep("training");
            setForceHistory([]);
          }}
          onBackHome={() => {
            setStep("select");
            setForceHistory([]);
          }}
          onViewHistory={() => alert("功能建構中")}
        />
      )}

      {subtitle && <div className="subtitle-box">{subtitle}</div>}
    </div>
  );
}

export default TrainingMain;
