# Personal Library Manager - Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from Literal (modern book tracking), Goodreads (library management), and Notion (clean organization). Focus on visual book covers as primary UI element with sophisticated, magazine-like layout.

## Typography System
- **Primary Font**: Inter or DM Sans (Google Fonts) - clean, modern sans-serif
- **Display Font**: Playfair Display or Crimson Pro for book titles and elegant headers
- **Hierarchy**:
  - Hero headlines: Display font, text-5xl to text-7xl, font-semibold
  - Section headers: Sans-serif, text-3xl to text-4xl, font-bold
  - Book titles: Display font, text-xl, font-medium
  - Body text: Sans-serif, text-base, font-normal
  - Metadata (author, pages): text-sm, opacity-70

## Layout System
**Spacing primitives**: Tailwind units of 3, 4, 6, 8, 12, 16, 24
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24
- Card gaps: gap-6 to gap-8
- Container: max-w-7xl with px-6

## Core Components

### Navigation
Top bar with logo left, primary actions (Search, Add Book, Profile) right. Sticky on scroll. Height h-16, backdrop blur effect.

### Hero Section
**Full-width visual hero** (h-[70vh]) featuring:
- Large hero image: Atmospheric library/reading scene with warm lighting
- Centered overlay content with blurred background container
- Headline: "Your Personal Reading Sanctuary"
- Subheadline explaining AI summaries and quiz features
- Primary CTA button with backdrop blur
- Stats bar below hero (Books Read, Hours Saved, Quizzes Completed)

### Library Grid
**Masonry/Pinterest-style layout** for book covers:
- Grid: grid-cols-2 md:grid-cols-4 lg:grid-cols-6
- Book cards: Cover image with hover overlay showing title, author, reading status
- Aspect ratio: 2:3 (standard book proportion)
- Filters sidebar (left): Genre, Status, Rating with collapsible sections

### Book Detail Modal
Full-screen overlay with two-column layout:
- Left: Large cover image (40% width)
- Right: Book details, AI summary preview, quiz access, notes section
- Tabbed interface for Summary/Quiz/Notes
- Reading progress indicator

### Quiz Interface
Card-based layout with:
- Question counter at top
- Large question text (text-2xl)
- Answer options as full-width buttons with letter indicators (A, B, C, D)
- Progress bar showing quiz completion
- Score display with celebratory micro-animation

### AI Summary Display
Article-style layout:
- Book cover thumbnail floating right
- Summary text in readable column (max-w-prose)
- Key points highlighted in accent containers
- "Regenerate Summary" action button

## Component Patterns

**Book Cards**: Rounded corners (rounded-lg), subtle shadow on hover, smooth transitions. Cover fills entire card with gradient overlay on hover revealing metadata.

**Action Buttons**: Primary actions use solid backgrounds, secondary use outlined style. Icon + text combination for clarity.

**Input Fields**: Book search with autocomplete dropdown, cover selection gallery (grid of options), form inputs for manual entry.

**Stats Cards**: Metrics displayed in 3-column grid (Books, Pages, Time), large numbers with labels, icon accompaniment.

## Images Section

1. **Hero Image**: Wide atmospheric shot of cozy library or reading nook with warm lighting, bookshelves visible. Dimensions: 1920x1080. Placement: Full-width background for hero section with dark gradient overlay for text readability.

2. **Empty States**: Illustration of open book or bookshelf when library is empty. Dimensions: 400x300. Placement: Center of main content area.

3. **Category Icons**: Use Heroicons CDN for interface icons (book, quiz, summary, plus, search, filter icons).

## Layout Variations

**Dashboard View**: 
- Recent books carousel (horizontal scroll)
- Reading statistics section
- Quick actions grid
- Recommended quizzes based on library

**List View Alternative**: Table layout option with sortable columns (Title, Author, Status, Rating, Date Added).

## Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation for modals and dropdowns
- Focus states with visible outlines
- Alt text for all book covers

## Animation Guidelines
Minimal, purposeful motion:
- Page transitions: Smooth fade-in
- Card hover: Scale 1.02 with shadow increase
- Modal entry: Slide-up with backdrop fade
- No distracting scroll animations