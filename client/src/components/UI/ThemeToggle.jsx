export default function ThemeToggle({ theme, setTheme, floating }) {
  const next = { light: "dark", dark: "system", system: "light" };
  const icon = { light: "☀️", dark: "🌙", system: "💻" };
  const label = { light: "Light mode", dark: "Dark mode", system: "System theme" };

  return (
    <button
      className={"theme-toggle-btn" + (floating ? " theme-toggle-floating" : "")}
      title={`Switch theme (${label[theme]})`}
      aria-label={`Switch theme. Currently: ${label[theme]}`}
      onClick={() => setTheme(next[theme])}
    >
      {icon[theme]}
    </button>
  );
}
