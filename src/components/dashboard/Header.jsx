export default function Header({ theme, onToggleTheme }) {
  return <header className="dashboard-header">
    <button className="theme-toggle data-value" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <span>{theme === 'dark' ? '☼' : '☾'}</span>{theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  </header>;
}
