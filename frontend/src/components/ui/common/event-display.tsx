"use client";

import { DisplayType } from "@/services/event/event.api";
import { ChristmasTree } from "./event-display-parts/ChristmasTree";
import { PeachBlossom } from "./event-display-parts/PeachBlossom";
import { ApricotBlossom } from "./event-display-parts/ApricotBlossom";
import { BothTetTrees } from "./event-display-parts/BothTetTrees";
import { VietnamFlag } from "./event-display-parts/VietnamFlag";
import { HalloweenPumpkin } from "./event-display-parts/HalloweenPumpkin";

interface EventDisplayProps {
  displayType: DisplayType;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const sizeMultiplier = {
  sm: 0.6,
  md: 1,
  lg: 1.5,
};

export default function EventDisplay({
  displayType,
  size = "md",
  animated = true,
}: EventDisplayProps) {
  const multiplier = sizeMultiplier[size];
  const baseSize = 200 * multiplier;

  if (displayType === "none") return null;

  return (
    <div
      className="relative inline-block"
      style={{ width: `${baseSize}px`, height: `${baseSize * 1.4}px` }}
    >
      <svg
        viewBox="0 0 200 280"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.3))" }}
      >
        {displayType === "christmas-tree" && (
          <ChristmasTree sizeMultiplier={multiplier} animated={animated} />
        )}
        {displayType === "peach-blossom" && (
          <PeachBlossom animated={animated} />
        )}
        {displayType === "apricot-blossom" && (
          <ApricotBlossom animated={animated} />
        )}
        {displayType === "both-tet-trees" && <BothTetTrees />}
        {displayType === "vietnam-flag" && <VietnamFlag animated={animated} />}
        {displayType === "halloween-pumpkin" && <HalloweenPumpkin />}
      </svg>

      {/* Lì xì dưới gốc cho Tết */}
      {(displayType === "peach-blossom" ||
        displayType === "apricot-blossom" ||
        displayType === "both-tet-trees") && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          <div
            className="text-3xl animate-bounce"
            style={{ animationDelay: "0.2s" }}
          >
            🧧
          </div>
          <div
            className="text-3xl animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            🧧
          </div>
          <div
            className="text-3xl animate-bounce"
            style={{ animationDelay: "0.8s" }}
          >
            🧧
          </div>
        </div>
      )}

      {/* Quà dưới cây thông */}
      {displayType === "christmas-tree" && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
          <div
            className="text-2xl animate-bounce"
            style={{ animationDelay: "0.1s" }}
          >
            🎁
          </div>
          <div
            className="text-2xl animate-bounce"
            style={{ animationDelay: "0.3s" }}
          >
            🎁
          </div>
          <div
            className="text-2xl animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            🎁
          </div>
        </div>
      )}
    </div>
  );
}
