import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const emojiCategories = {
  "😀 Smileys": [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
    "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
    "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
    "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁",
    "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣",
    "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹",
    "👺", "👻", "👽", "👾", "🤖"
  ],
  "👋 Gestos": [
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
    "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️",
    "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀",
    "👁️", "👅", "👄"
  ],
  "❤️ Corações": [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
    "💘", "💝", "💟", "♥️"
  ],
  "🎉 Objetos": [
    "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉",
    "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊",
    "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂"
  ],
  "🚗 Transporte": [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽",
    "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋",
    "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️",
    "🚀", "🛸"
  ],
  "🔧 Ferramentas": [
    "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪓", "🔩", "⚙️", "🗜️", "⛓️", "🪝", "🧰", "🧲", "🪜", "⚗️", "🧪",
    "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", "💊", "🩹", "🩺", "🚪", "🛏️", "🛋️", "🪑", "🚽", "🪠",
    "🚿", "🛁", "🪤", "🪒", "🧴", "🧷", "🧹", "🧺", "🧻", "🪣", "🧼", "🫧", "🪥", "🧽", "🧯", "🛒"
  ],
  "☀️ Natureza": [
    "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧",
    "💦", "☔", "☂️", "🌊", "🌫️", "🌈", "⭐", "🌟", "💫", "✨", "☄️", "🌙", "🌛", "🌜", "🌚", "🌝",
    "🌞", "🪐", "🌍", "🌎", "🌏", "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘", "🌐"
  ],
  "✅ Símbolos": [
    "✅", "❌", "❓", "❔", "❗", "❕", "⭕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤",
    "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧",
    "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "💯", "🔢", "🔣", "🔤", "🔡", "🔠", "ℹ️", "🆗", "🆕"
  ]
};

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(emojiCategories)[0]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          type="button"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" side="top">
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {Object.keys(emojiCategories).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0 text-xs px-2"
              onClick={() => setSelectedCategory(category)}
            >
              {category.split(" ")[0]}
            </Button>
          ))}
        </div>
        <ScrollArea className="h-48">
          <div className="grid grid-cols-8 gap-1">
            {emojiCategories[selectedCategory as keyof typeof emojiCategories].map(
              (emoji, index) => (
                <button
                  key={index}
                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-secondary rounded transition-colors"
                  onClick={() => handleEmojiClick(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              )
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
