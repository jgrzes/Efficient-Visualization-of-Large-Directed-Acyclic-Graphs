import React from "react";
import { Search, Star } from "lucide-react";

interface EmptyStateProps {
  type: "search" | "favorites";
}

const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const Icon = type === "search" ? Search : Star;
  const title = type === "search" ? "Brak wyników" : "Brak ulubionych";
  const subtitle = type === "search" 
    ? "Spróbuj innego zapytania" 
    : "Dodaj elementy z zakładki Szukaj";

  return (
    <div className="text-center mt-10 text-gray-500">
      <div className="mx-auto w-10 h-10 rounded-2xl border border-dashed border-white/20 flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <p className="text-sm">{title}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
};

export default EmptyState;