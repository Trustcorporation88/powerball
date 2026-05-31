# Análise Planilha – Financial Data Analysis Platform

A modern React + TypeScript application for analyzing, parsing, and visualizing financial spreadsheet data with automatic column detection and intelligent financial role mapping.

## 🎯 Features

- **Excel/CSV File Import**: Upload `.xlsx`, `.xlsm`, or `.csv` files
- **Intelligent Column Detection**: Automatic detection of data types (date, currency, numeric, text)
- **Financial Role Mapping**: Automatically infers financial columns (amount, date, category, cost center, etc.)
- **Transaction Builder**: Converts spreadsheet rows into structured financial transactions
- **Dashboard Visualization**: View KPIs, trends, and detailed analytics
- **Project Management**: Create and manage multiple analysis projects
- **Responsive Design**: Built with shadcn/ui components and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Framework**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: React Context API
- **Data Fetching**: TanStack Query
- **Excel Parsing**: XLSX library
- **Charts**: Recharts
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ (or 20.x recommended)
- pnpm 8+ (package manager)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Copy Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your API endpoints and feature flags.

### 3. Development Server

```bash
pnpm dev
```

The app will start on `http://localhost:8080`

### 4. Build for Production

```bash
pnpm build
```

Optimized bundle created in `dist/`

## 📝 Available Scripts

| Command | Purpose |
|---------|----------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint code quality checks |
| `pnpm preview` | Preview production build locally |

## 📁 Project Structure

```
src/
├── components/         # React components (UI + custom)
│   ├── layout/        # Layout components (Sidebar, AppLayout)
│   ├── ui/            # shadcn/ui components (auto-generated)
│   └── *.tsx          # Feature components
├── contexts/          # React Context (Auth, App state)
├── hooks/             # Custom React hooks
├── pages/             # Route pages
├── utils/             # Utility functions (Excel parser, etc.)
├── data/              # Mock data and constants
├── lib/               # Library utilities (cn, etc.)
├── App.tsx            # Main app with routing
├── main.tsx           # App entry point
└── globals.css        # Global styles
```

## 🔑 Key Features Explained

### Excel Parsing (`src/utils/excelParser.ts`)

Automatically detects:
- **Column Types**: Dates, currency, numbers, text
- **Financial Roles**: Value, date, category, cost center, account, unit, etc.
- Handles multiple sheets, empty rows, and missing data

### Authentication (`src/contexts/AuthContext.tsx`)

Mock authentication system with:
- Login/Register validation
- User state persistence via localStorage
- Private route protection

*Note: For production, integrate with real backend API*

### Project Management (`src/contexts/AppContext.tsx`)

Global state for:
- Projects (CRUD operations)
- File uploads and parsing state
- Column mappings and transactions

## 🧪 Code Quality

Project uses ESLint with TypeScript support. All errors must pass before deployment:

```bash
pnpm lint          # Check for issues
pnpm lint --fix    # Auto-fix formatting issues
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel auto-deploys on push
4. Configure environment variables in Vercel dashboard

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist"]
```

## 📊 Browser Support

Modern browsers (2023+):
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Port 8080 already in use?

```bash
# Use custom port
pnpm dev -- --port 3000
```

### Build file too large?

Consider:
- Code splitting with dynamic imports
- Lazy loading routes
- Tree-shaking unused dependencies

### Types errors after dependency update?

```bash
pnpm install
pnpm typecheck  # If available
```

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [XLSX Library](https://sheetjs.com/)

## 👥 Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with reproduction steps
3. Include environment details (OS, Node version, etc.)
