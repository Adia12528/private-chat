export default function ThemeToggle({ theme, setTheme, floating }) {
  const next = { light: "dark", dark: "system", system: "light" };
  const icon = { light: "☀️", dark: "🌙", system: "🖥️" };
  return (
    <button
      className={"icon-btn" + (floating ? " theme-toggle-floating" : "")}
      title={`Theme: ${theme}`}
      aria-label={`Switch theme (currently ${theme})`}
      onClick={() => setTheme(next[theme])}
    >
      {icon[theme]}
    </button>
  );
}
