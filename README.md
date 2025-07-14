# DAT Analytics Platform

A sophisticated terminal-style analytics platform for tracking and analyzing corporate digital asset treasuries. Monitor Bitcoin, Ethereum, and other cryptocurrency holdings of public companies in real-time.

## Overview

DAT (Digital Asset Treasury) Analytics Platform provides comprehensive insights into how public companies are managing their cryptocurrency holdings. Built with a retro terminal aesthetic, it offers powerful data visualization, real-time updates, and advanced analytics capabilities.

## Features

### Core Analytics
- **Company Dashboard**: Track individual company treasury holdings, financial metrics, and performance
- **Real-time Data**: Live price updates and market data integration
- **Treasury Analytics**: Detailed breakdown of crypto holdings by company
- **Premium to NAV Calculations**: Advanced metrics showing treasury value relative to market cap
- **Historical Performance**: Track treasury performance over time with interactive charts

### Data Management
- **Export Functionality**: Export data in CSV or JSON formats
- **News Integration**: Curated news feed for crypto and company-specific events
- **Advanced Search**: Filter and search companies by various criteria
- **Watchlist**: Create personalized watchlists for quick access

### User Experience
- **Terminal UI**: Authentic terminal-style interface with green phosphor aesthetic
- **Keyboard Navigation**: Full keyboard shortcut support for power users
- **Command Palette**: Quick access to all features via command interface (Cmd/Ctrl + K)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Optimized for extended viewing sessions

### Performance
- **React.memo Optimization**: Efficient re-rendering for large datasets
- **Error Boundaries**: Graceful error handling
- **Loading States**: Smooth transitions and loading indicators
- **Data Caching**: Intelligent caching for improved performance

## Technology Stack

- **Framework**: Next.js 15.3.5 with App Router
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **State Management**: Zustand
- **Data Fetching**: Custom hooks with real-time simulation
- **Build Tool**: Turbopack

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/datstat.git
cd datstat

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
datstat/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── company/        # Individual company pages
│   │   ├── compare/        # Company comparison tool
│   │   ├── news/           # News and events feed
│   │   ├── rankings/       # Company rankings
│   │   ├── settings/       # User preferences
│   │   └── help/           # Help and documentation
│   ├── components/         # React components
│   │   ├── ui/            # UI components library
│   │   └── keyboard/      # Keyboard navigation components
│   ├── contexts/          # React contexts
│   ├── data/              # Mock data and constants
│   ├── hooks/             # Custom React hooks
│   ├── state/             # Zustand store
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
└── docs/                  # Documentation

```

## Key Components

### Terminal UI Components
- `TerminalCard`: Base card component with terminal styling
- `TerminalButton`: Styled button with hover effects
- `TerminalInput`: Input field with terminal aesthetics
- `MetricCard`: Display key metrics with trend indicators
- `DataTable`: Sortable data table with terminal styling

### Data Visualization
- `LineChart`: Performance tracking over time
- `PieChart`: Holdings distribution
- `BarChart`: Volume and transaction analysis

### Navigation
- `CommandPalette`: Quick command interface
- `NavigationBar`: Main navigation with search
- `KeyboardShortcuts`: Comprehensive keyboard navigation

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `C` | Navigate to company comparison |
| `R` | View rankings |
| `N` | Open news feed |
| `S` | Open settings |
| `?` | Show help |
| `G` | Toggle grid/list view |
| `W` | Add/remove from watchlist |
| `Arrow Keys` | Navigate through lists |
| `Enter` | Select item |
| `Esc` | Close modals/go back |

## API Integration

The platform is designed to integrate with various data sources:

```typescript
// Example API endpoint structure
/api/companies          // List all companies
/api/companies/:ticker  // Get company details
/api/treasury/:ticker   // Get treasury holdings
/api/news              // Get news feed
/api/market            // Get crypto market data
```

## Configuration

User preferences are stored in localStorage and include:
- Default view mode (grid/list)
- Data refresh intervals
- Favorite metrics
- Notification preferences

## Performance Considerations

- Components use React.memo for optimization
- Large datasets are paginated
- Charts render progressively
- Export operations are handled asynchronously
- Error boundaries prevent app crashes

## Future Enhancements

### Planned Features
1. **Real-time WebSocket Integration**: Live price updates
2. **Advanced Charting**: More chart types and indicators
3. **Portfolio Tracking**: Create and track custom portfolios
4. **AI Insights**: ML-powered predictions and analysis
5. **Mobile App**: Native mobile applications
6. **API Access**: Public API for developers
7. **Multi-language Support**: Internationalization
8. **Theme Customization**: Multiple terminal themes

### Technical Improvements
- Server-side rendering optimization
- WebWorker integration for heavy calculations
- Progressive Web App capabilities
- Offline support with service workers
- GraphQL API integration

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Terminal UI inspired by classic computer terminals
- Financial data calculations based on industry standards
- Built with modern web technologies for optimal performance

---

For more information, visit the help section within the application or contact the development team.