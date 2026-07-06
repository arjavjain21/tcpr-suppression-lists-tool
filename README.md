# TCPR Suppression Lists Tool

A clean, professional internal tool for lead suppression and lead-status intake.

## Features

- **Authentication**: Secure login/signup with Supabase Auth
- **Intake Form**: Paste emails or domains for batch processing
- **Smart Parsing**: Handles multiple separators (commas, semicolons, newlines)
- **Validation**: Email and domain validation with duplicate detection
- **Preview**: See parsed items before submission
- **Records View**: View all records with filters and search
- **CSV Export**: Export filtered records to CSV
- **Premium UX**: Smooth transitions, toast notifications, and loading states

## Tech Stack

- **Frontend**: React 18.3.1 with TypeScript 5.6.2
- **Build Tool**: Vite 5.4.11
- **Styling**: Tailwind CSS 3.4.0
- **Backend**: Supabase (PostgreSQL database with RLS)
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 20+
- npm or bun
- Supabase project with the following tables:
  - `lead_entities` (id, entity_type, email, domain, created_at)
  - `lead_events` (id, lead_entity_id, lead_type_id, setter_id, raw_input, notes, source, created_by, created_at)
  - `lead_types` (id, label, active, sort_order, created_at)
  - `setters` (id, name, email, active, created_at)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your Supabase credentials:
# VITE_SUPABASE_URL=your-project-url
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

### lead_entities
Stores emails and domains that are being suppressed.

### lead_events
Tracks each suppression event with metadata.

### lead_types
Defines categories for lead types (e.g., "Complaint", "Unsubscribe", "Blocklist").

### setters
Defines who set the suppression (e.g., "Support Team", "Compliance").

## Deployment

The app is configured for Netlify deployment with Node 20.

```bash
# Deploy to Netlify
npm run build
netlify deploy --prod
```

## License

Internal use only.
