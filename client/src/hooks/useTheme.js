import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("pc-theme") || "dark");

  useEffect(() => {
    const root = document.documentElement;
    function apply(t) {
      if (t === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", t);
      }
    }
    apply(theme);
    localStorage.setItem("pc-theme", theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => apply("system");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [theme]);

  return [theme, setTheme];
}
