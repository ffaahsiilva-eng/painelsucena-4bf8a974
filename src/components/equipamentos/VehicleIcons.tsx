import React from "react";
import pipaTruckImg from "@/assets/pipa-truck.png";
import munkTruckImg from "@/assets/munk-truck.png";
import camioneteTruckImg from "@/assets/camionete-truck.png";
import onibusTruckImg from "@/assets/onibus-truck.png";

export type EquipmentType = "pipa" | "munk" | "camionete" | "onibus";

interface VehicleIconProps {
  type: EquipmentType;
  isStopped?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  imageUrl?: string | null;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ 
  type, 
  isStopped = false, 
  className = "",
  size = "md",
  imageUrl,
}) => {
  const sizeConfig = {
    xs: { width: 20, height: 12 },
    sm: { width: 32, height: 20 },
    md: { width: 40, height: 24 },
    lg: { width: 48, height: 28 },
  };

  const { width, height } = sizeConfig[size];
  const baseClass = `${isStopped ? 'opacity-60' : ''} ${className}`;

  if (imageUrl) {
    return (
      <img loading="lazy" decoding="async"
        src={imageUrl}
        alt="Equipamento"
        width={width * 3}
        height={height * 3}
        className={`${baseClass} object-contain`}
        style={{ imageRendering: 'auto', background: 'transparent' }}
      />
    );
  }

  switch (type) {
    case "pipa":
      return (
        <img loading="lazy" decoding="async"
          src={pipaTruckImg}
          alt="Caminhão Pipa"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );

    case "munk":
      return (
        <img loading="lazy" decoding="async"
          src={munkTruckImg}
          alt="Caminhão Munk"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );

    case "camionete":
      return (
        <img loading="lazy" decoding="async"
          src={camioneteTruckImg}
          alt="Camionete"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );

    case "onibus":
      return (
        <img loading="lazy" decoding="async"
          src={onibusTruckImg}
          alt="Ônibus"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );
  }
};

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  pipa: "Caminhão Pipa",
  munk: "Caminhão Munk",
  camionete: "Camionete",
  onibus: "Ônibus",
};

export const equipmentTypeColors: Record<EquipmentType, { bg: string; text: string; border: string; glow: string }> = {
  pipa: { 
    bg: "bg-blue-500/10", 
    text: "text-blue-600", 
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20"
  },
  munk: { 
    bg: "bg-orange-500/10", 
    text: "text-orange-600", 
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20"
  },
  camionete: { 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-600", 
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20"
  },
  onibus: { 
    bg: "bg-indigo-500/10", 
    text: "text-indigo-600", 
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/20"
  },
};
