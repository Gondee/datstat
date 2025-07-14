# Keyboard Navigation Components

This directory contains all the components and utilities for the DAT Analytics Platform's keyboard navigation system.

## Components

### CommandPalette
A powerful command palette (⌘K) for quick navigation and actions.

```tsx
import { CommandPalette } from '@/components/keyboard';

<CommandPalette
  isOpen={isOpen}
  onClose={handleClose}
  companies={companies}
  onCompanySelect={handleCompanySelect}
  recentCommands={recentCommands}
/>
```

### KeyboardShortcutsModal
A help modal that displays all available keyboard shortcuts.

```tsx
import { KeyboardShortcutsModal } from '@/components/keyboard';

<KeyboardShortcutsModal
  isOpen={isOpen}
  onClose={handleClose}
  shortcuts={shortcuts}
/>
```

### NavigableTable
A table component with built-in keyboard navigation support.

```tsx
import { NavigableTable } from '@/components/keyboard';

<NavigableTable
  data={data}
  columns={columns}
  onRowClick={handleRowClick}
  onRowSelect={handleRowSelect}
  selectedRows={selectedRows}
/>
```

### SearchInput
A search input with keyboard navigation for suggestions.

```tsx
import { SearchInput } from '@/components/keyboard';

<SearchInput
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search..."
  suggestions={suggestions}
  onSuggestionSelect={handleSuggestionSelect}
/>
```

## Hooks

### useKeyboardShortcuts
Main hook for registering and handling keyboard shortcuts.

```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const shortcuts = [
  {
    key: 's',
    ctrl: true,
    description: 'Save',
    category: 'actions',
    handler: () => save(),
  },
];

useKeyboardShortcuts({ shortcuts, enabled: true });
```

### useFocusManagement
Utilities for managing focus in complex UI components.

```tsx
import { useFocusManagement } from '@/hooks/useFocusManagement';

const { focusNext, focusPrevious, focusFirst, focusLast } = useFocusManagement({
  containerRef: containerRef,
  enabled: true,
  trapFocus: true,
});
```

## Context

### KeyboardNavigationProvider
The main provider that manages keyboard navigation state.

```tsx
import { KeyboardNavigationProvider } from '@/contexts/KeyboardNavigationContext';

<KeyboardNavigationProvider
  companies={companies}
  onCompanySelect={handleCompanySelect}
>
  <App />
</KeyboardNavigationProvider>
```

## Features

- **Multiple Navigation Modes**: Normal, Search, Command, and Vim modes
- **Context-Aware Shortcuts**: Different shortcuts for different UI contexts
- **Vim-Style Navigation**: j/k/h/l movement in tables
- **Command Palette**: Quick access to commands and navigation
- **Focus Management**: Proper focus trapping and restoration
- **Accessibility**: Full ARIA support and screen reader compatibility
- **Visual Indicators**: Clear focus states and mode indicators

## Usage Example

See the demo page at `/demo/keyboard-navigation` for a complete example of all features.