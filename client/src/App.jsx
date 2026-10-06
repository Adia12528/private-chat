import { useState } from "react";
import Login from "./pages/Login.jsx";
import ChatRoom from "./pages/ChatRoom.jsx";
import ThemeToggle from "./components/UI/ThemeToggle.jsx";
import { useTheme } from "./hooks/useTheme.js";
import "./index.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useTheme();

  if (!session) {
    return (
      <>
        <ThemeToggle theme={theme} setTheme={setTheme} floating />
        <Login onJoined={setSession} />
      </>
    );
  }

  return <ChatRoom session={session} theme={theme} setTheme={setTheme} onLeave={() => setSession(null)} />;
}
