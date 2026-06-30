import { SearchIcon } from "@/components/app/ui/icons";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <SearchIcon
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#1a1a1a] placeholder:text-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/[0.06]"
      />
    </div>
  );
}
