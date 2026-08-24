import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  canEdit: boolean; // true if user is admin or preposto
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: false,
  toggleEditMode: () => {},
  canEdit: false,
});

export const useEditMode = () => useContext(EditModeContext);

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const isPreposto = profile?.cargo === "preposto";
  const canEdit = isAdmin || isPreposto;
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = useCallback(() => {
    if (canEdit) setIsEditMode((prev) => !prev);
  }, [canEdit]);

  const value = useMemo(
    () => ({
      isEditMode: canEdit && isEditMode,
      toggleEditMode,
      canEdit,
    }),
    [canEdit, isEditMode, toggleEditMode]
  );

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
};

