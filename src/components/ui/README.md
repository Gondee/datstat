# Terminal UI Component Library

A comprehensive collection of terminal-style UI components for the DAT Analytics Platform, designed following Bloomberg Terminal best practices.

## Components

### Core Components

#### TerminalCard
Container component with terminal-style borders and optional title.

```tsx
<TerminalCard title="Market Data" variant="default" padding="md">
  <p>Content goes here</p>
</TerminalCard>
```

Props:
- `title` - Optional header title
- `actions` - Optional actions for header
- `variant` - 'default' | 'compact' | 'bordered'
- `padding` - 'none' | 'sm' | 'md' | 'lg'

#### DataTable
High-performance data table with keyboard navigation and real-time updates.

```tsx
<DataTable
  data={securities}
  columns={[
    { key: 'symbol', header: 'Symbol', align: 'left' },
    { key: 'yield', header: 'Yield', align: 'right', sortable: true }
  ]}
  flashOnUpdate
  stickyHeader
/>
```

Features:
- Keyboard navigation (j/k, arrows, g/G)
- Sortable columns
- Flash animations on value changes
- Sticky headers and columns
- Row selection

#### MetricCard
Display KPIs with real-time indicators and change values.

```tsx
<MetricCard
  label="Total Volume"
  value="$2.5B"
  change={5.2}
  status="positive"
  isRealtime
/>
```

### Form Components

#### TerminalButton
Styled buttons with multiple variants.

```tsx
<TerminalButton variant="primary" size="md" loading={false}>
  Execute Trade
</TerminalButton>
```

Variants: primary, secondary, danger, ghost

#### TerminalInput
Terminal-styled input fields with validation.

```tsx
<TerminalInput
  label="Security Code"
  placeholder="Enter code..."
  prefix="$"
  error="Invalid format"
/>
```

### Layout Components

#### TerminalLayout
Main application layout with navigation and sidebar.

```tsx
<TerminalLayout
  sidebarContent={<Navigation />}
  onSearch={handleSearch}
  onCommand={handleCommand}
>
  {children}
</TerminalLayout>
```

Features:
- Integrated navigation bar with search
- Collapsible sidebar
- Status bar
- Command palette support

### Animation Components

#### PulseIndicator
Real-time status indicator.

```tsx
<PulseIndicator color="green" size="sm" />
```

#### FlashValue
Animate value changes with color coding.

```tsx
<FlashValue value={price} formatValue={(v) => v.toFixed(2)} />
```

#### LoadingTerminal
Terminal-style loading animation.

```tsx
<LoadingTerminal
  steps={[
    'Connecting to server...',
    'Loading data...',
    'Initializing...'
  ]}
/>
```

## Keyboard Shortcuts

Global shortcuts supported by the component library:

- `/` - Focus search
- `Ctrl/Cmd + K` - Open command palette
- `Escape` - Clear/exit current mode
- `?` - Show help

DataTable shortcuts:
- `j/k` or `↓/↑` - Navigate rows
- `g/G` - Jump to top/bottom
- `Enter/Space` - Select row

## Styling Guidelines

The components follow these terminal UI principles:

1. **Colors**: Green primary (#10b981), amber alerts (#f59e0b), red errors (#ef4444)
2. **Typography**: Monospace fonts for all data
3. **Spacing**: Compact layouts with minimal padding
4. **Borders**: Subtle borders using green-500/30 opacity
5. **Animation**: Brief flash animations for updates (200-500ms)

## Usage Example

```tsx
import { TerminalLayout, DataTable, MetricCard } from '@/components/ui';

export default function Dashboard() {
  return (
    <TerminalLayout>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Volume" value="$1.2B" change={3.5} />
      </div>
      
      <DataTable
        data={marketData}
        columns={columns}
        flashOnUpdate
      />
    </TerminalLayout>
  );
}
```

## Performance Considerations

- DataTable uses virtualization for large datasets
- Flash animations are GPU-accelerated
- Real-time updates are debounced to prevent excessive re-renders
- Components use React.memo where appropriate

## Accessibility

All components support:
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader announcements
- High contrast mode