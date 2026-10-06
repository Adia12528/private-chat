import { useState } from "react";

export default function SearchBar({ onSearch, onClose }) {
  const [query, setQuery] = useState("");

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    onSearch(q);
  }

  return (
    <div className="search-bar">
      <input autoFocus value={query} onChange={handleChange} placeholder="Search messages in this room…" aria-label="Search messages" />
      <button className="icon-btn tiny" aria-label="Close search" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
