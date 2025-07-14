'use client';

import React, { useRef } from 'react';
import { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { useFocusManagement } from '@/hooks/useFocusManagement';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useFocusManagement({
    containerRef: modalRef,
    enabled: isOpen,
    trapFocus: true,
    restoreFocus: true,
    initialFocusRef: closeButtonRef,
  });

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryTitles = {
    navigation: 'Navigation',
    search: 'Search & Discovery',
    actions: 'Actions',
    view: 'View Controls',
  };

  const formatShortcutKeys = (shortcut: KeyboardShortcut): string => {
    const keys: string[] = [];
    
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.cmd) keys.push('⌘');
    if (shortcut.shift) keys.push('⇧');
    if (shortcut.alt) keys.push('⌥');
    
    // Format the key
    let key = shortcut.key;
    if (key === ' ') key = 'Space';
    if (key === 'ArrowUp') key = '↑';
    if (key === 'ArrowDown') key = '↓';
    if (key === 'ArrowLeft') key = '←';
    if (key === 'ArrowRight') key = '→';
    if (key === 'Enter') key = '↵';
    if (key === 'Escape') key = 'Esc';
    
    keys.push(key.charAt(0).toUpperCase() + key.slice(1));
    
    return keys.join(' + ');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 id="shortcuts-title" className="text-2xl font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close shortcuts modal"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Quick tips */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Tips</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Press <kbd className="px-2 py-0.5 bg-blue-100 rounded">?</kbd> anytime to view these shortcuts</li>
                <li>• Use <kbd className="px-2 py-0.5 bg-blue-100 rounded">⌘ K</kbd> to open the command palette</li>
                <li>• Navigation supports Vim-style keys (j/k/h/l)</li>
              </ul>
            </div>

            {/* Shortcuts by category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-gray-900 pb-2 border-b border-gray-200">
                    {categoryTitles[category as keyof typeof categoryTitles] || category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={`${category}-${index}`}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-gray-700">
                          {shortcut.description}
                        </span>
                        <kbd className="ml-2 px-2 py-1 text-xs font-mono bg-gray-100 rounded border border-gray-300">
                          {formatShortcutKeys(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Navigation Modes</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <strong>Normal Mode:</strong> Default mode for general navigation and actions
                </div>
                <div>
                  <strong>Search Mode:</strong> Activated when search input is focused (press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">/</kbd>)
                </div>
                <div>
                  <strong>Command Mode:</strong> Activated with <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">⌘ K</kbd> for quick actions
                </div>
                <div>
                  <strong>Vim Mode:</strong> Use j/k for up/down, h/l for left/right navigation in tables
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
              </div>
              <div>
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    // Open documentation
                  }}
                >
                  View Full Documentation →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};