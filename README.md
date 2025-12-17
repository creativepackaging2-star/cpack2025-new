# CPack 2025 - Print Manufacturing Management System

A Next.js application for managing print manufacturing products and orders, built with Supabase backend.

## Features

- **Product Management**: Add, edit, view, and delete products with comprehensive details
- **Order Tracking**: Manage orders linked to products
- **File Management**: Upload and download PDF/CDR artwork files (stored locally)
- **Advanced Search**: Filter products by name, dimensions, specs, and more
- **Auto-Generated SKUs**: Automatic SKU generation for new products
- **Dynamic Specs**: Auto-generated specifications based on product attributes

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account with database configured
- Environment variables (see below)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run these SQL scripts in your Supabase SQL Editor (in order):

1. `fix_sku_and_delete.sql` - Sets up auto-SKU generation and cascade deletes
2. `fix_specs_size.sql` - Configures dynamic specs generation

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

This project is configured for automatic deployment via Vercel + GitHub.

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable React components
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utility functions and Supabase client
- `/public/uploads` - Local file storage for artwork files

## License

Private project for internal use.
