import { SunIcon, MoonIcon, MonitorIcon } from "./Icons.jsx";

export default function ThemeToggle({ theme, setTheme, floating }) {
  const themes = [
    { id: "dark", label: "Midnight Dark", icon: <MoonIcon size={18} /> },
    { id: "oled", label: "Cyber OLED", icon: <span className="theme-dot-oled" /> },
    { id: "emerald", label: "Emerald Night", icon: <span className="theme-dot-emerald" /> },
    { id: "light", label: "Minimal Light", icon: <SunIcon size={18} /> },
  ];

  const currentIndex = themes.findIndex((t) => t.id === theme);
  const nextTheme = themes[(currentIndex + 1) % themes.length] || themes[0];
  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  return (
    <button
      className={"theme-toggle-btn" + (floating ? " theme-toggle-floating" : "")}
      title={`Current: ${currentTheme.label}. Click to switch to ${nextTheme.label}`}
      aria-label={`Switch theme to ${nextTheme.label}`}
      onClick={() => setTheme(nextTheme.id)}
    >
      {currentTheme.icon}
      <span className="theme-btn-label">{currentTheme.label.split(" ")[0]}</span>
    </button>
  );
}
