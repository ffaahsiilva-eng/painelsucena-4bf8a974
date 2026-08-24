import React, { useState } from "react";
import { Trash2, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmationProps {
  onConfirm: () => void;
  onCancel?: () => void;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  confirmText?: string;
  cancelText?: string;
  questionText?: string;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  onConfirm,
  onCancel,
  className,
  icon = <Trash2 className="h-4 w-4" />,
  label,
  confirmText = "Sim",
  cancelText = "Não",
  questionText = "Excluir?",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onConfirm();
    setIsOpen(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onCancel) onCancel();
    setIsOpen(false);
  };

  return (
    <div className={cn("delete-confirm-container", className)}>
      <div className={cn("delete-confirm-btn", isOpen && "is-open")}>
        <div className="delete-confirm-btn-front" onClick={handleOpen}>
          {icon}
          {label && <span className="ml-2">{label}</span>}
        </div>
        <div className="delete-confirm-btn-back">
          <p className="text-gray-800">{questionText}</p>
          <div className="actions">
            <button className="yes" onClick={handleConfirm}>
              {confirmText}
            </button>
            <button className="no" onClick={handleCancel}>
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
