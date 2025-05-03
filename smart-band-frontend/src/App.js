import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import FlappyBirdGame from "./components/FlappyBirdGame"; // 剛剛新增的
import Home from "./components/Home";
import React, { useState, useEffect } from "react";
import TrainingMain from "./components/TrainingMain";

function App() {
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    console.log("Connecting to WebSocket...");
    const ws = new WebSocket("ws://localhost:8000/ws");
    setSocket(ws);

    // 可根據需要打開字幕顯示
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.say) {
    //     setSubtitle(data.say);
    //     setTimeout(() => setSubtitle(""), 4000);
    //   }
    // };

    return () => ws.close();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/training" element={<TrainingMain socket={socket} setSocket={setSocket}/>} />
        <Route path="/game" element={<FlappyBirdGame />} />
      </Routes>
    </Router>
  );
}

export default App;
