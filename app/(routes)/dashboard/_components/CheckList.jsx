import React from "react";

export default function Checklist({ checklist = [], onToggle }) {
  const total = checklist.length;
  const completed = checklist.filter(c => c.isCompleted).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="mb-6 rounded-md p-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Checklist</h3>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {progress}% completed
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-5 overflow-hidden">
        <div
          className="bg-blue-600 h-3 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          role="progressbar"
        />
      </div>

      {total === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">No checklist items added.</p>
      ) : (
        <ul className="space-y-3">
          {checklist.map(({ _id, item, isCompleted }) => (
            <li
              key={_id}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2"
              onClick={() => onToggle(_id, !isCompleted)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onToggle(_id, !isCompleted);
              }}
              role="checkbox"
              tabIndex={0}
              aria-checked={isCompleted}
            >
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={e => onToggle(_id, e.target.checked)}
                className="h-6 w-6 text-blue-600 rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500"
                onClick={e => e.stopPropagation()}
                aria-label={`Mark checklist item "${item}" as ${isCompleted ? 'incomplete' : 'complete'}`}
              />
              <span
                className={`select-none text-gray-900 dark:text-gray-100 ${
                  isCompleted ? "line-through opacity-60" : ""
                }`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
