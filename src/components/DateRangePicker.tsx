"use client";

import { useState } from "react";
import { format } from "date-fns";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (range: { startDate: Date; endDate: Date }) => void;
}

const PRESET_RANGES = [
  {
    label: "Jan 2024 - Dec 2024",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  },
  {
    label: "Jul 2023 - Dec 2023",
    startDate: new Date("2023-07-01"),
    endDate: new Date("2023-12-31"),
  },
  {
    label: "Jan 2023 - Jun 2023",
    startDate: new Date("2023-01-01"),
    endDate: new Date("2023-06-30"),
  },
  {
    label: "Jul 2022 - Dec 2022",
    startDate: new Date("2022-07-01"),
    endDate: new Date("2022-12-31"),
  },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (start: Date, end: Date) => {
    onChange({ startDate: start, endDate: end });
    setIsCustom(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESET_RANGES.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetSelect(preset.startDate, preset.endDate)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              startDate.getTime() === preset.startDate.getTime() &&
              endDate.getTime() === preset.endDate.getTime()
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(!isCustom)}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            isCustom
              ? "bg-blue-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Custom Range
        </button>
      </div>

      {isCustom && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={format(startDate, "yyyy-MM-dd")}
              onChange={(e) =>
                onChange({ startDate: new Date(e.target.value), endDate })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={format(endDate, "yyyy-MM-dd")}
              onChange={(e) =>
                onChange({ startDate, endDate: new Date(e.target.value) })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
