import { useCallback, useState } from "react";
import { generateId } from "../utils/helpers.js";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, duration = 3500) => {
    const id = generateId();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);
  return { toasts, push };
}
