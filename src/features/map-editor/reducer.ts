
import { DEFAULT_LAYERS, EditorState, MapObject, LayerId, Pt } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export type Action =
  | { type: "ADD"; objects: MapObject[] }
  | { type: "UPDATE"; id: string; patch: Partial<MapObject> }
  | { type: "UPDATE_MANY"; ids: string[]; patch: Partial<MapObject> }
  | { type: "DELETE"; ids: string[] }
  | { type: "SELECT"; ids: string[] }
  | { type: "TOGGLE_LAYER"; id: string; field: "visible" | "locked" }
  | { type: "RENAME_LAYER"; id: string; label: string }
  | { type: "REPLACE"; state: EditorState }
  | { type: "CLEAR" };

export const initialState: EditorState = {
  objects: [],
  layers: DEFAULT_LAYERS,
  selection: [],
};

export function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "ADD":
      return { 
        ...state, 
        objects: [...state.objects, ...action.objects], 
        selection: action.objects.map((o) => o.id) 
      };
    case "UPDATE":
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? ({ ...o, ...action.patch, updatedAt: Date.now() } as MapObject) : o
        ),
      };
    case "UPDATE_MANY": {
      const ids = (action as any).ids || [];
      return {
        ...state,
        objects: state.objects.map((o) =>
          ids.includes(o.id)
            ? ({ ...o, ...action.patch, updatedAt: Date.now() } as MapObject)
            : o
        ),
      };
    }
    case "DELETE": {
      const deleteIds = (action as any).ids || [];
      return {
        ...state,
        objects: state.objects.filter((o) => !deleteIds.includes(o.id)),
        selection: state.selection.filter((id) => !deleteIds.includes(id)),
      };
    }
    case "SELECT": {
      const selectIds = (action as any).ids || [];
      return { ...state, selection: selectIds };
    }
    case "TOGGLE_LAYER":
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, [action.field]: !l[action.field] } : l)),
      };
    case "RENAME_LAYER":
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, label: action.label } : l)),
      };
    case "REPLACE":
      return action.state;
    case "CLEAR":
      return { ...state, objects: [], selection: [] };
    default:
      return state;
  }
}

// History helper
export function makeHistory<T>() {
  const past: T[] = [];
  const future: T[] = [];
  return {
    push(prev: T) {
      past.push(JSON.parse(JSON.stringify(prev)));
      if (past.length > 50) past.shift();
      future.length = 0;
    },
    undo(current: T): T | null {
      const p = past.pop();
      if (!p) return null;
      future.push(JSON.parse(JSON.stringify(current)));
      return p;
    },
    redo(current: T): T | null {
      const n = future.pop();
      if (!n) return null;
      past.push(JSON.parse(JSON.stringify(current)));
      return n;
    },
    reset() {
      past.length = 0;
      future.length = 0;
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; }
  };
}
