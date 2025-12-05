# NanoFashion Studio - AI Agent Documentation

## Project Overview

NanoFashion Studio is a generative AI-powered fashion design platform that enables users to create clothing designs through natural language prompts, generate technical CAD sketches, and publish their creations to a marketplace. The application is built with React, TypeScript, and integrates with Google's Gemini 2.5 Flash Image model for AI-powered design generation.

**Key Features:**

- Text-to-image fashion concept generation
- Interactive image editing with natural language instructions
- Technical CAD/engineering sketch generation with annotations
- Real-time fashion trend analysis using Google Search grounding
- Bill of Materials (BOM) generation for manufacturing
- Design sharing and marketplace functionality
- Responsive design with mobile-first approach
- Client-side rate limiting for API protection
- Error tracking and monitoring infrastructure
- Cloud authentication (Supabase) and payments (Stripe) ready

## Technology Stack

- **Frontend Framework:** React 19.2.0 with TypeScript
- **Build Tool:** Vite 6.2.0
- **AI Integration:** Google Gemini 2.5 Flash Image (@google/genai 1.30.0)
- **Styling:** Tailwind CSS (via CDN)
- **Fonts:** Inter (UI) and JetBrains Mono (monospace)
- **State Management:** React hooks (useState, useEffect)
- **Local Storage:** For design drafts and sharing functionality
- **Testing:** Vitest with 1101 passing tests
- **Deployment:** Vercel/Netlify ready with security headers

## Project Structure

```plaintext
/Users/benjaminwilliams/_stylish_nanobanana/Stylish/
├── App.tsx                    # Main application component with navigation
├── index.tsx                  # React entry point
├── index.html                 # HTML template with Tailwind and fonts
├── types.ts                   # TypeScript type definitions
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── vercel.json                # Vercel deployment config
├── netlify.toml               # Netlify deployment config
├── .env.example               # Environment variable template
├── metadata.json              # AI Studio app metadata
├── components/                # React components
│   ├── Studio.tsx            # Main design studio interface (1028 lines)
│   ├── Marketplace.tsx       # Product marketplace view
│   ├── GenerationOptionsPanel.tsx # AI generation options UI
│   ├── BomParser.tsx         # Bill of Materials parser/display
│   ├── CompareSlider.tsx     # Before/after image comparison
│   ├── ErrorBoundary.tsx     # Error boundary with tracking
│   ├── LazyImage.tsx         # Optimized image loading
│   ├── LoadingOverlay.tsx    # Loading states with animations
│   ├── ProductDetailModal.tsx# Product detail view
│   └── Toast.tsx             # Notification system
├── services/
│   └── geminiService.ts      # Legacy Gemini API integration
└── src/
    ├── ai/                   # AI router and providers
    │   ├── router.ts         # Multi-provider AI router with rate limiting
    │   ├── providers/        # AI provider implementations (Gemini)
    │   ├── style-consistency.ts
    │   └── color-palette.ts
    ├── cloud/                # Cloud platform (Supabase)
    │   ├── auth.ts           # Authentication service
    │   ├── hooks.ts          # React hooks for cloud features
    │   └── supabase.ts       # Supabase client
    ├── core/                 # Core utilities
    │   ├── rate-limiter.ts   # Client-side rate limiting
    │   ├── error-tracking.ts # Error monitoring
    │   ├── validation.ts     # Input validation
    │   └── errors.ts         # Error categorization
    ├── ecommerce/            # E-commerce (Stripe)
    │   ├── stripe.ts         # Stripe Connect integration
    │   └── marketplace.ts    # Marketplace service
    ├── hooks/                # React hooks
    │   └── useAI.ts          # AI operations hook
    └── __tests__/            # Test files (34 files, 1101 tests)
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

The application requires a `GEMINI_API_KEY` environment variable to function. This should be set in an `.env.local` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

The Vite configuration automatically injects this into the application as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

## Core Architecture

### State Management

- **App Level:** Current view (Studio/Marketplace), products list, notifications, user menu state
- **Studio Level:** Design drafts, loading states, view modes, zoom/pan settings, trend search results
- **Local Storage:** Saved drafts, shared designs

### Key Interfaces (types.ts)

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  cadImageUrl?: string;
  materials?: string[];
  creator: string;
  likes: number;
}

interface DesignDraft {
  conceptImage: string | null; // Base64
  cadImage: string | null; // Base64
  materials: string;
  history: string[];
}

enum AppView {
  STUDIO = 'STUDIO',
  MARKETPLACE = 'MARKETPLACE'
}
```

### AI Service Integration

The `geminiService.ts` provides three main AI functions:

1. **generateConcept(prompt):** Creates initial fashion concept images
2. **editConcept(imageBase64, instruction):** Modifies existing designs
3. **generateEngineeringPack(imageBase64):** Creates technical CAD drawings with BOM
4. **getFashionTrends(topic):** Searches real-time fashion trends

## Development Guidelines

### Code Style

- **TypeScript:** Strict typing with interfaces for all data structures
- **React:** Functional components with hooks, no class components
- **Styling:** Tailwind CSS classes with custom animations defined in index.html
- **Naming:** PascalCase for components, camelCase for functions/variables
- **File Organization:** One component per file, co-located utilities

### Component Patterns

- Props interfaces defined at component level
- Loading states managed with dedicated LoadingOverlay component
- Error handling through toast notifications
- Image optimization with LazyImage component
- Responsive design with mobile-first approach

### State Management Patterns

- Local component state for UI interactions
- Props drilling for parent-child communication
- LocalStorage for persistent data (drafts, shares)
- URL parameters for sharing functionality

## Testing Strategy

The project includes a comprehensive test suite with **1101 tests across 34 test files**:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

Testing focuses on:

- AI service integration and error handling
- Rate limiting functionality
- Error tracking services
- Cloud authentication flows
- E-commerce and marketplace logic
- React hooks and component logic

## Security Considerations

- API keys are injected at build time through Vite configuration
- **Rate limiting** protects against API abuse (token bucket algorithm)
- **Error tracking** captures and reports issues securely
- Security headers configured for Vercel/Netlify deployments (CSP, X-Frame-Options, etc.)
- No server-side components - all processing happens client-side
- Local storage used for drafts and sharing - sensitive data should be minimized
- Image data handled as Base64 strings

## Deployment Process

The application is designed for static hosting with pre-configured deployment options:

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configuration in `vercel.json` includes security headers, cache settings, and SPA rewrites.

### Netlify Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

Configuration in `netlify.toml` includes CSP headers and security settings.

### Manual Deployment

1. Build with `npm run build`
2. Deploy the `dist/` folder to any static hosting service
3. Ensure `GEMINI_API_KEY` is available as environment variable
4. No server requirements - client-side only application

## AI Studio Integration

This project is configured for Google AI Studio with:

- Import map configuration in index.html for CDN dependencies
- Metadata.json for app store information
- Request frame permissions handled at platform level

## Key Features Implementation

### Design Studio

- Multi-stage workflow: Concept → Edit → Engineering → Publish
- Canvas with zoom/pan functionality
- Quick edit suggestions and example prompts
- Design sharing via URL parameters
- Draft saving/loading system

### Marketplace

- Product grid with filtering
- Detailed product modals
- Mock data for demonstration
- Integration with design studio for publishing

### Trend Analysis

- Real-time fashion trend search
- Google Search grounding for current information
- Source attribution for trend data
- Integration with design prompts

## Performance Considerations

- Lazy loading for images
- Optimized re-renders with React.memo where needed
- Efficient state updates using functional setState
- CDN-hosted dependencies for faster loading
- Minimal bundle size with tree shaking

## Browser Compatibility

- Modern browsers supporting ES2022
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers with touch support
- Progressive enhancement approach
