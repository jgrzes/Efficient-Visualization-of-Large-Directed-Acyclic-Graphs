

export interface SearchFieldSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchFieldSelect({ value, onChange }: SearchFieldSelectProps) {
  return (
    <>
      <label className="sr-only" htmlFor="search-field-select">Field</label>
      <select
        id="search-field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black text-gray-200 border border-gray-700 rounded-md px-3 py-2 text-sm cursor-pointer
                   focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200"
      >
        <option value="all">All</option>
        <option value="id">ID</option>
        <option value="name">Name</option>
        <option value="namespace">Namespace</option>
        <option value="def">Definition</option>
        <option value="synonym">Synonym</option>
        <option value="is_a">Is_a</option>
      </select>
    </>
  );
}
