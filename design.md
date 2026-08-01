# CampusIQ – Production-Grade UI/UX Design System Specification

**Product Name:** CampusIQ – AI-Powered College Knowledge Assistant  
**Design Engine:** UI/UX Pro Max Intelligence System  
**Document Type:** System-Level Design Specification  
**Version:** 3.0 (Enhanced with `ui-ux-pro-max` High-Production Standard)  
**Target Stack:** Next.js 15 (App Router) + Tailwind CSS + Shadcn UI + Framer Motion (Frontend) | FastAPI + ChromaDB + Supabase + Gemini 2.5 Flash (Backend)  
**Master Design System Source:** [MASTER.md](file:///c:/Users/HP/Downloads/custom_rag_chatbot/design-system/campusiq/MASTER.md)  

---

## 1. Overall UI Style & Aesthetic Intelligence

### 1.1 Aesthetic Identity & Design System Rules
The interface follows a **High-Production Modern AI SaaS** aesthetic engineered for trust, readability, and zero visual clutter. It combines structured typography with precise component spacing tokens.

- **Design Style:** Clean, high-density Modern Flat SaaS with subtle depth cards (`#FAF5FF` surface tints).
- **Iconography Rule (Strict Anti-Pattern):** **Zero Emojis as Icons.** Use vector SVG icons exclusively from **Lucide React** (`lucide-react`).
- **Interactive Affordances:** All clickable elements (buttons, cards, links, tags) MUST explicitly enforce `cursor: pointer` with 150ms–200ms smooth state transitions.
- **Lighting & Surfaces:** Surface elevation layers (`--color-background`, `--color-card`, `--color-muted`) with crisp border tokens (`#EFE7FC`) and soft shadow depths (`--shadow-sm` through `--shadow-xl`).

### 1.2 Color Token Architecture

| Token Name | Hex Value | CSS Variable | Usage Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | `#7C3AED` | `--color-primary` | Main brand color, active navigation tabs, active state accents |
| **On Primary** | `#FFFFFF` | `--color-on-primary` | High contrast text on primary backgrounds |
| **Secondary** | `#6366F1` | `--color-secondary` | Secondary action buttons, highlights, metadata tags |
| **Accent / CTA** | `#EC4899` | `--color-accent` | High-priority CTAs, AI generation badges, key interaction highlights |
| **Background** | `#FAF5FF` | `--color-background` | Primary application canvas background |
| **Foreground** | `#0F172A` | `--color-foreground` | High-emphasis body text (WCAG AAA compliant) |
| **Muted** | `#F7F3FD` | `--color-muted` | Code block backgrounds, inactive tab tracks, secondary card surfaces |
| **Border** | `#EFE7FC` | `--color-border` | Component edges, data table grid lines, card borders |
| **Destructive** | `#DC2626` | `--color-destructive` | Warning alerts, file deletion confirmation, error toasts |
| **Ring** | `#7C3AED` | `--color-ring` | Keyboard focus indicator ring (2px with 20% opacity alpha) |

### 1.3 Typography System (`Space Grotesk` + `DM Sans`)
- **Heading Font:** `Space Grotesk`, sans-serif (Futuristic, clean, tech-first academic feel)
- **Body Font:** `DM Sans`, sans-serif (Optimized for maximum body legibility and long-form reading)
- **Monospace Font:** `JetBrains Mono` (For citation metadata, vector chunk IDs, and code blocks)

```html
<!-- Google Fonts Import -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Scale Definition:**
  - **Display / Hero Header:** `3.5rem` (`56px`), Line-Height: `1.1`, Weight: `700`, Tracking: `-0.02em` (`Space Grotesk`)
  - **Heading 1 (H1 - Page Titles):** `2.25rem` (`36px`), Line-Height: `1.2`, Weight: `700`, Tracking: `-0.01em` (`Space Grotesk`)
  - **Heading 2 (H2 - Section Headers):** `1.5rem` (`24px`), Line-Height: `1.3`, Weight: `600` (`Space Grotesk`)
  - **Heading 3 (H3 - Card Headers):** `1.125rem` (`18px`), Line-Height: `1.4`, Weight: `600` (`Space Grotesk`)
  - **Body Base (Chat & UI Text):** `0.9375rem` (`15px`), Line-Height: `1.6`, Weight: `400` (`DM Sans`)
  - **Body Small (Captions & Badges):** `0.8125rem` (`13px`), Line-Height: `1.5`, Weight: `400` (`DM Sans`)

### 1.4 Spacing & Shadow Token System

| Token | Pixel Value | Usage |
| :--- | :--- | :--- |
| `--space-xs` | `4px` | Tight internal element gaps |
| `--space-sm` | `8px` | Icon-to-text inline gaps |
| `--space-md` | `16px` | Standard card and input padding |
| `--space-lg` | `24px` | Section padding and container gaps |
| `--space-xl` | `32px` | Large workspace pane gaps |
| `--space-2xl` | `48px` | Major section margins |
| `--space-3xl` | `64px` | Hero container vertical padding |

| Shadow Level | Value | Usage |
| :--- | :--- | :--- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Interactive buttons, standard cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Slide-over drawers, dropdown menus |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Modals, hero showcase containers |

---

## 2. Layout Structure & Page Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CampusIQ Header & Persona Navigation                 │
├─────────────────┬──────────────────────────────────┬───────────────────┤
│                 │                                  │                   │
│                 │                                  │                   │
│    Left Sidebar │        Main Workspace Canvas     │   Right Inspector │
│  (Chat History  │   (Chat Stream / Upload Drop /   │   (Citation Drawer│
│  / Admin Menu)  │       Analytics Charts)          │   / Chunk Viewer) │
│                 │                                  │                   │
│                 │                                  │                   │
├─────────────────┴──────────────────────────────────┴───────────────────┤
│                  Campus Query Input Pod & Action Bar                   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Landing Page Architecture (`/`)
- **Header:** Brand Logo (CampusIQ Crest with glowing green status dot), Links (Features, Pipeline, Demo, FAQ), Auth Buttons ("Sign In", "Access Assistant").
- **Hero Section:**
  - Badge: `"Instant Answers from Official College Documents"`.
  - Title: Dual-color gradient text (*"Your AI Campus Knowledge Assistant"*).
  - Interactive Micro-Demo: Sample query chips (*"Hostel Fee Rules"*, *"Academic Calendar 2026"*).
- **Module Showcase:** 3x3 grid showcasing major modules (Auth, Chat, Memory, Ingestion, Knowledge Base, Vector Search RAG Engine, Analytics, Governance).
- **RAG Architecture Pipeline:** Animated visual diagram depicting document ingestion to Gemini 2.5 response generation.

### 2.2 Chat Workspace Architecture (`/chat`)
- **Left Sidebar (260px Fixed):** "New Chat" primary button (`⌘K`), quick history search input, chronologically grouped conversation list.
- **Main Chat Canvas (Centered 800px Max Content Bounds):**
  - Top Bar: Conversation Title, Active Knowledge Index (*"48 Official Documents"*), Model Identifier (*"Gemini 2.5 Flash"*).
  - Stream Timeline: User message bubbles (Right-aligned, `#7C3AED` background) and AI answer blocks (Left-aligned, Markdown formatted, formatted citations).
  - Sticky Bottom Input Pod: Auto-expanding textarea, file launcher, send button.
- **Right Citation Drawer (360px Slide-Over):** Slides in when a citation tag is clicked, showing verbatim chunk text extracted from ChromaDB, page numbers, and similarity scores.

### 2.3 Admin Dashboard Architecture (`/dashboard`)
- **Top Metrics Ribbon:** 4 summary KPI cards (Total Documents, Indexed Chunks, Total Queries, Avg Latency).
- **Tabbed Management Interface:** Ingestion & Uploads (`/dashboard/upload`), Knowledge Base Directory (`/dashboard/knowledge`), Analytics Charts (`/dashboard/analytics`).

---

## 3. Component Design System Specs

### 3.1 Buttons & Action Triggers
```css
/* Primary Action Button (Pink/Violet CTA) */
.btn-primary {
  background-color: #EC4899;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background-color: transparent;
  color: #7C3AED;
  border: 2px solid #7C3AED;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-secondary:hover {
  background-color: #7C3AED10;
}
```

### 3.2 Cards & Elevated Containers
```css
.card {
  background-color: #FAF5FF;
  border: 1px solid #EFE7FC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: all 200ms ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

### 3.3 Inputs & Chat Box
```css
.input {
  padding: 12px 16px;
  border: 1px solid #EFE7FC;
  border-radius: 8px;
  font-size: 15px;
  font-family: 'DM Sans', sans-serif;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.input:focus {
  border-color: #7C3AED;
  outline: none;
  box-shadow: 0 0 0 3px #7C3AED20;
}
```

---

## 4. Responsiveness Rules & Breakpoint Grid

The layout enforces strict responsive rules across 4 key viewports:

| Breakpoint | Pixel Range | Layout Adaptation |
| :--- | :--- | :--- |
| **Mobile (`sm`)** | `375px - 767px` | Single-column layout. Left sidebar converts to slide-in drawer. Citation panel converts to a **Bottom Sheet Drawer**. |
| **Tablet (`md`)** | `768px - 1023px` | Sidebar collapses to a 64px icon rail. Dashboard switches to 2-column grid (`grid-cols-2`). |
| **Desktop (`lg`)** | `1024px - 1439px` | Fixed 260px left sidebar, centered chat canvas (max 768px), 3-column dashboard. |
| **Ultra-Wide (`xl`)** | `1440px+` | Full Tri-Pane view enabled (Sidebar + Canvas + Right Citation Drawer). |

---

## 5. Micro-Animations & Interaction Feedback

- **Transitions:** State changes strictly use 150ms–200ms `ease` curves. Instant (0ms) state shifts are forbidden.
- **Hover Affordances:** Hover states must scale subtly (`translateY(-1px)`) without causing layout thrashing or parent container reflow.
- **Streaming Response Feedback:** Token-by-token opacity fade-in (`opacity: 0 -> 1` over `50ms`) with a pulsing green indicator dot.
- **Reduced Motion:** All Framer Motion and CSS transitions respect `@media (prefers-reduced-motion: reduce)`.

---

## 6. Pre-Delivery Quality Control Checklist

Before delivering any UI code or component implementations, verify against this canonical list:

- [x] **No Emojis as Icons:** Use Lucide React SVG icons exclusively.
- [x] **Mandatory `cursor: pointer`:** Enforced on all buttons, links, tags, cards, and interactive rows.
- [x] **Smooth State Transitions:** All hover/focus states use 150ms–300ms transitions.
- [x] **WCAG AAA Text Contrast:** Minimum 4.5:1 ratio for body text against backgrounds.
- [x] **Visible Focus Rings:** Keyboard navigation highlights active element with 2px ring (`#7C3AED`).
- [x] **Responsive Breakpoint Compliance:** Validated across 375px, 768px, 1024px, and 1440px viewports.
- [x] **No Layout Thrashing:** No fixed container widths that cause horizontal scrollbars on mobile.

---
