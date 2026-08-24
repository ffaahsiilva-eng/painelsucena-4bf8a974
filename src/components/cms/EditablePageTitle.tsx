import { useEditMode } from "@/contexts/EditModeContext";
import { EditableText } from "@/components/cms/EditableText";

interface EditablePageTitleProps {
  pageKey: string;
  defaultValue: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export const EditablePageTitle = ({
  pageKey,
  defaultValue,
  className,
  as = "h1",
}: EditablePageTitleProps) => {
  const { isEditMode } = useEditMode();

  return (
    <EditableText
      pageKey={pageKey}
      elementKey={`${pageKey}-title`}
      defaultValue={defaultValue}
      className={className}
      as={as}
      canEdit={isEditMode}
    />
  );
};
