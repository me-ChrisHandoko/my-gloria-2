"use client";

import React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const frameworks = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "satu", label: "Satu" },
  { value: "dua", label: "Dua" },
  { value: "tiga", label: "Tiga" },
  { value: "empat", label: "Empat" },
  { value: "lima", label: "Lima" },
  { value: "enam", label: "Enam" },
  { value: "tujuh", label: "Tujuh" },
  { value: "delapan", label: "Delapan" },
  { value: "sembilan", label: "Sembilan" },
  { value: "sepuluh", label: "Sepuluh" },
  { value: "sebelas", label: "Sepuluh" },
  { value: "duabelas", label: "Sepuluh" },
  { value: "tigabelas", label: "Sepuluh" },
  { value: "empatbelas", label: "Sepuluh" },
  { value: "limabelas", label: "Sepuluh" },
  { value: "enambelas", label: "Sepuluh" },
  { value: "tujuhbelas", label: "Sepuluh" },
  { value: "delapanbelas", label: "Sepuluh" },
  { value: "sembilanbelas", label: "Sepuluh" },
  { value: "duapuluh", label: "Sepuluh" },
];

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface CustomComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

function CustomCombobox({ value, onChange }: CustomComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredFrameworks = frameworks.filter((framework) =>
    framework.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFramework = frameworks.find((f) => f.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        {selectedFramework ? selectedFramework.label : "Select framework..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Input
                placeholder="Cari framework..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div
            className="max-h-[250px] overflow-y-auto overflow-x-hidden p-1"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filteredFrameworks.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Tidak ditemukan.
              </div>
            ) : (
              filteredFrameworks.map((framework) => (
                <button
                  key={framework.value}
                  onClick={() => {
                    onChange(framework.value === value ? "" : framework.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-gray-100 flex items-center cursor-pointer transition-colors",
                    value === framework.value && "bg-gray-100"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {framework.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComboboxDemo() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="lg">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pilih Framework</DialogTitle>
            <DialogDescription>
              Custom combobox dengan scroll yang berfungsi penuh
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Framework Favorit
              </label>
              <CustomCombobox value={value} onChange={setValue} />
            </div>

            {value && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>
                    Terpilih:{" "}
                    <span className="font-semibold">
                      {frameworks.find((f) => f.value === value)?.label}
                    </span>
                  </span>
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 Combobox ini menggunakan dropdown custom tanpa Popover,
                sehingga scroll berfungsi sempurna di dalam Dialog
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
