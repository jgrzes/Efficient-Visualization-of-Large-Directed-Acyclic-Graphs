// import React, { useState, useEffect } from "react";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (field: string, query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim() === "") return;
    onSearch(field, query);
  };

  return (
    <div className="flex items-center w-full gap-2">
      <select
        value={field}
        onChange={(e) => setField(e.target.value)}
        className="w-25 h-8 px-2 py-1 text-center rounded-md text-gray-200 border border-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm cursor-pointer"
        >
        <option value="all">All</option>
        <option value="id">ID</option>
        <option value="name">Name</option>
        <option value="namespace">Namespace</option>
        <option value="def">Definition</option>
        <option value="synonym">Synonym</option>
        <option value="is_a">Is_a</option>
      </select>

      <input
        type="text"
        value={query}
        onChange={(e) => {
            setQuery(e.target.value);
        }}
        placeholder="Search..."
        className="w-20 h-8 flex-grow px-3 py-1 rounded-md text-gray-200 border border-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm cursor-text"
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
    </div>
  );
}
