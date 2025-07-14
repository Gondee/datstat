# Keyboard Navigation Documentation

## Overview

The DAT Analytics Platform includes a comprehensive keyboard navigation system designed for power users and accessibility. The system supports multiple navigation modes, context-aware shortcuts, and vim-style navigation patterns.

## Navigation Modes

### 1. Normal Mode (Default)
The default mode for general navigation and actions.

### 2. Search Mode
Activated when the search input is focused. Press `/` to enter search mode.

### 3. Command Mode
Activated with `⌘K` (Mac) or `Ctrl+K` (Windows/Linux). Provides quick access to commands and navigation.

### 4. Vim Mode
Press `i` to enter vim mode for table navigation. Supports j/k/h/l movement keys.

## Global Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `/` | Focus Search | Focuses the main search input |
| `⌘K` / `Ctrl+K` | Command Palette | Opens the command palette |
| `?` | Help | Shows keyboard shortcuts modal |
| `C` | Compare | Enter company comparison mode |
| `E` | Export | Export current data view |
| `Esc` | Exit/Cancel | Exit current mode or close modals |

## Table Navigation (Vim Mode)

| Shortcut | Action |
|----------|--------|
| `j` | Move down |
| `k` | Move up |
| `h` | Move left |
| `l` | Move right |
| `gg` | Go to first row (press g twice) |
| `G` | Go to last row |
| `Enter` | Select row |
| `Space` | Toggle row selection |

## Command Palette

The command palette (`⌘K`) provides quick access to:

- **Company Search**: Search by ticker or company name
- **Navigation**: Quick jump to different views
- **Actions**: Export, compare, settings
- **Recent Commands**: Quick access to recently used commands

### Command Palette Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate items |
| `Enter` | Select item |
| `Tab` | Auto-complete |
| `Esc` | Close palette |

## Search Navigation

When the search input is focused:

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate suggestions |
| `Enter` | Submit search |
| `Tab` | Accept suggestion |
| `Esc` | Clear search or unfocus |

## Implementation Guide

### Using the Keyboard Navigation Provider

Wrap your application with the `KeyboardNavigationProvider`:

```tsx
import { KeyboardNavigationProvider } from '@/contexts/KeyboardNavigationContext';

function App() {
  return (
    <KeyboardNavigationProvider
      companies={companies}
      onCompanySelect={handleCompanySelect}
    >
      {/* Your app content */}
    </KeyboardNavigationProvider>
  );
}
```

### Registering Custom Shortcuts

```tsx
import { useKeyboardNavigation } from '@/contexts/KeyboardNavigationContext';

function MyComponent() {
  const { registerShortcut } = useKeyboardNavigation();

  useEffect(() => {
    registerShortcut({
      key: 'r',
      ctrl: true,
      description: 'Refresh data',
      category: 'actions',
      handler: () => refreshData(),
    });
  }, []);
}
```

### Using the Navigable Table

```tsx
import { NavigableTable } from '@/components/keyboard/NavigableTable';

function CompanyList() {
  return (
    <NavigableTable
      data={companies}
      columns={columns}
      onRowClick={handleRowClick}
      onRowSelect={handleRowSelect}
      selectedRows={selectedRows}
    />
  );
}
```

### Focus Management

The system includes utilities for managing focus in complex UI components:

```tsx
import { useFocusManagement } from '@/hooks/useFocusManagement';

function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  
  useFocusManagement({
    containerRef: modalRef,
    enabled: isOpen,
    trapFocus: true,
    restoreFocus: true,
  });

  return (
    <div ref={modalRef}>
      {/* Modal content */}
    </div>
  );
}
```

## Accessibility Features

1. **Focus Indicators**: All focusable elements have clear visual indicators
2. **Focus Trapping**: Modals and dialogs trap focus for better navigation
3. **ARIA Labels**: All interactive elements include proper ARIA labels
4. **Tab Order**: Logical tab order throughout the application
5. **Screen Reader Support**: Announcements for mode changes and actions

## Best Practices

1. **Consistent Shortcuts**: Use standard shortcuts where possible (⌘K for command, / for search)
2. **Context Awareness**: Disable shortcuts that don't apply to the current context
3. **Visual Feedback**: Always show which mode is active
4. **Discoverable**: Include hints and help text for keyboard shortcuts
5. **Escape Hatch**: Always provide Escape as a way to exit modes

## Customization

The keyboard navigation system can be customized through:

1. **Custom Shortcuts**: Register application-specific shortcuts
2. **Mode Extensions**: Add custom navigation modes
3. **Context Providers**: Create context-specific shortcut sets
4. **Theme Integration**: Customize visual indicators to match your theme