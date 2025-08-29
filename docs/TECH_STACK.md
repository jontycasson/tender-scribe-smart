# Tech Stack (Detailed)

This document lists the technologies used in this project and their current versions.

## Core Framework
- **React**: ^18.3.1
- **Vite**: Build tool and dev server
- **TypeScript**: Type-safe JavaScript

## Routing & State Management
- **react-router-dom**: ^6.26.2 - Client-side routing
- **@tanstack/react-query**: ^5.56.2 - Server state management

## Styling & UI Components
- **Tailwind CSS**: ^3.4.11 - Utility-first CSS framework
- **tailwindcss-animate**: ^1.0.7 - Animation utilities
- **shadcn/ui**: Local component library built on Radix UI primitives
- **class-variance-authority**: ^0.7.1 - Component variant management
- **tailwind-merge**: ^2.5.2 - Tailwind class merging utility
- **clsx**: ^2.1.1 - Conditional CSS classes

### Radix UI Primitives
- **@radix-ui/react-accordion**: ^1.2.0
- **@radix-ui/react-alert-dialog**: ^1.1.1
- **@radix-ui/react-aspect-ratio**: ^1.1.0
- **@radix-ui/react-avatar**: ^1.1.0
- **@radix-ui/react-checkbox**: ^1.1.1
- **@radix-ui/react-collapsible**: ^1.1.0
- **@radix-ui/react-context-menu**: ^2.2.1
- **@radix-ui/react-dialog**: ^1.1.2
- **@radix-ui/react-dropdown-menu**: ^2.1.1
- **@radix-ui/react-hover-card**: ^1.1.1
- **@radix-ui/react-icons**: ^1.3.2
- **@radix-ui/react-label**: ^2.1.0
- **@radix-ui/react-menubar**: ^1.1.1
- **@radix-ui/react-navigation-menu**: ^1.2.0
- **@radix-ui/react-popover**: ^1.1.1
- **@radix-ui/react-progress**: ^1.1.0
- **@radix-ui/react-radio-group**: ^1.2.0
- **@radix-ui/react-scroll-area**: ^1.1.0
- **@radix-ui/react-select**: ^2.1.1
- **@radix-ui/react-separator**: ^1.1.0
- **@radix-ui/react-slider**: ^1.2.0
- **@radix-ui/react-slot**: ^1.1.0
- **@radix-ui/react-switch**: ^1.1.0
- **@radix-ui/react-tabs**: ^1.1.0
- **@radix-ui/react-toast**: ^1.2.1
- **@radix-ui/react-toggle**: ^1.1.0
- **@radix-ui/react-toggle-group**: ^1.1.0
- **@radix-ui/react-tooltip**: ^1.1.4

### Icons & Interactive Elements
- **lucide-react**: ^0.462.0 - Icon library
- **cmdk**: ^1.0.0 - Command palette component
- **embla-carousel-react**: ^8.3.0 - Carousel component
- **vaul**: ^0.9.3 - Drawer/sheet components
- **input-otp**: ^1.2.4 - OTP input component
- **react-resizable-panels**: ^2.1.3 - Resizable panel layouts

## Forms & Validation
- **react-hook-form**: ^7.53.0 - Form state management
- **@hookform/resolvers**: ^3.9.0 - Form validation resolvers
- **zod**: ^3.23.8 - Schema validation

## Date & Time
- **date-fns**: ^3.6.0 - Date utility library
- **react-day-picker**: ^8.10.1 - Date picker component

## Data Visualization
- **recharts**: ^2.12.7 - Chart library for React

## File Handling & Export
- **xlsx**: ^0.18.5 - Excel file handling
- **docx**: ^9.5.1 - Word document generation
- **jspdf**: ^3.0.1 - PDF generation
- **mammoth**: ^1.10.0 - Document conversion

## Notifications & Theming
- **sonner**: ^1.5.0 - Toast notifications
- **next-themes**: ^0.3.0 - Theme management (dark/light mode)

## Backend Integration
- **@supabase/supabase-js**: ^2.53.0 - Supabase client library

### Supabase Edge Functions
Located in `supabase/functions/`:
- **process-tender** - AI-powered tender document processing
- **export-tender** - Document export functionality
- **regenerate-response** - Response regeneration
- **rewrite-response** - Response editing
- **upsert-memory** - Memory management for AI context

## Development & Build Tools
- **Vite**: ^5.x - Build tool and development server
- **ESLint**: ^9.9.0 - Code linting
- **TypeScript**: ^5.x - Type checking
- **Tailwind CSS**: ^3.4.11 - CSS framework
- **PostCSS**: ^8.4.47 - CSS processing
- **Autoprefixer**: ^10.4.20 - CSS vendor prefixing

## Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── homepage/       # Homepage-specific components
│   ├── dashboard/      # Dashboard components
│   └── onboarding/     # Onboarding flow
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── integrations/       # Third-party integrations
    └── supabase/       # Supabase configuration
```

## Key Features
- **Authentication**: Supabase Auth with session management
- **Database**: PostgreSQL with Row Level Security (RLS)
- **File Storage**: Supabase Storage for document uploads
- **AI Processing**: Edge Functions for intelligent document analysis
- **Export Capabilities**: Multiple format support (PDF, DOCX, XLSX)
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: Automatic theme switching
- **Type Safety**: Full TypeScript coverage