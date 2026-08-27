import React from "react";
import { Circle, Square, Triangle, Heart, Star, Hexagon, Diamond } from "lucide-react";

const shapes = [
  { id: "circle", label: "Circle", icon: Circle },
  { id: "square", label: "Square", icon: Square },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "heart", label: "Heart", icon: Heart },
  { id: "star", label: "Star", icon: Star },
  { id: "hexagon", label: "Hexagon", icon: Hexagon },
];

export default function ShapeSelector({ selectedShape, setSelectedShape }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {shapes.map(({ id, label, icon: Icon }) => {
        const isSelected = selectedShape === id;
        return (
          <button
            key={id}
            onClick={() => setSelectedShape(id)}
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
              isSelected
                ? "border-black bg-black text-white shadow-sm"
                : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}