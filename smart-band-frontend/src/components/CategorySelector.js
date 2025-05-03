import React, { useState } from "react";
import "./CategorySelector.css";

const exerciseSamples = {
    sensor_band: [
        {
            name: "二頭肌",
            image: "/images/resistenceBandBiceps_1.png",
            bandImage: "images/resistenceBandBiceps_1.png",
            sensorImage: "/images/biceps_marked.png"
        },
        {
            name: "踢腿練臀",
            image: "/images/resistenceBandGlutes_1.png",
            bandImage: "/images/resistenceBandGlutes_1.png",
            sensorImage: "/images/glutes_marked.png"
        },
    {
            name: "羅馬尼亞硬舉",
            image: "/images/resistenceBandRomaniaDeadlift_1.png",
            bandImage: "/images/resistenceBandRomaniaDeadlift_1.png",
            sensorImage: "/images/deadlift_marked.png"
        },
      {
            name: "划船練背",
            image: "/images/resistenceBandBack_1.png",
            bandImage: "/images/resistenceBandBack_1.png",
            sensorImage: "/images/back_marked.png"
        }
    ],


    band_only: [
        {
            name: "飛鳥夾胸",
            image: "/images/resistenceBandFlyinyBird_2.png",
            bandImage: "/images/resistenceBandFlyinyBird_2.png",
            sensorImage: null
        },
        {
            name: "深蹲",
            image: "/images/resistenceBandSquat_2.png",
            bandImage: "/images/resistenceBandSquat_2.png",
            sensorImage: null
        },
    
    ],

  coach_potato: [
        {
            name: "coach_Potato_logo",
            image: "/images/coachPotatoWithName.png",
        },

        {
            name: "coach_Potato",
            image: "/images/coachPotatoWithoutName.png",
        },
        {
            name: "sexy_potato",
            image: "/images/sexyPotato.png",
        },
        {
            name: "standing_potato",
            image: "/images/standingPotato.png",
        }

    ]

}
// {
//   sensor_band: [
//     {
//       name: "深蹲與感測器",
//       image: "/images/sensor_squat.png",
//       bandImage: "/images/band_usage_squat.png",
//       sensorImage: "/images/sensor_position_squat.png"
//     },
//     {
//       name: "背部拉伸與感測器",
//       image: "/images/sensor_back.png",
//       bandImage: "/images/band_usage_back.png",
//       sensorImage: "/images/sensor_position_back.png"
//     }
//   ],
//   band_only: [
//     {
//       name: "彈力帶側平舉",
//       image: "/images/band_side_raise.png",
//       bandImage: "/images/band_usage_side_raise.png",
//       sensorImage: null
//     },
//     {
//       name: "彈力帶蹲舉",
//       image: "/images/band_squat.png",
//       bandImage: "/images/band_usage_squat_only.png",
//       sensorImage: null
//     }
//   ]
// };

function CategorySelector({ title, categoryKey, onSelect }) {
  const [index, setIndex] = useState(0);
  const exercises = exerciseSamples[categoryKey];

  const next = () => setIndex((prev) => (prev + 1) % exercises.length);
  const prev = () => setIndex((prev) => (prev - 1 + exercises.length) % exercises.length);

  const selected = exercises[index];

  return (
    <div className="category-panel">
      <h2>{title}</h2>
      <div className="carousel">
        <button onClick={prev}>←</button>
        <div className="preview">
          <img src={selected.image} alt={selected.name} />
          <p>{selected.name}</p>
        </div>
        <button onClick={next}>→</button>
      </div>
      <button onClick={() => onSelect(selected)}>選擇此動作</button>
    </div>
  );
}

export default CategorySelector;