import { useState } from "react";
import { SearchIcon, XIcon } from "../UI/Icons.jsx";

export default function SearchBar({ onSearch, onClose }) {
  const [query, setQuery] = useState("");

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    onSearch(q);
  }

  return (
    <div className="search-bar">
      <SearchIcon size={16} className="search-icon-inside" />
      <input autoFocus value={query} onChange={handleChange} placeholder="Search messages in this room…" aria-label="Search messages" />
      <button className="icon-btn tiny" aria-label="Close search" onClick={onClose}>
        <XIcon size={14} />
      </button>
    </div>
  );
}
