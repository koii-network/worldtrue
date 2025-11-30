# Mobile UX Implementation Plan

## Current Codebase Analysis

### Patterns Observed
1. **Modals**: Full-screen overlays with `fixed inset-0 z-[100]`, backdrop blur
2. **Side Panels**: `fixed right-0 top-0 bottom-0 w-96 z-50` (ChatPanel)
3. **Popovers**: Absolute positioning (EventListPopover)
4. **Styling**: Glass effect (`bg-gray-900/80 backdrop-blur-sm`), purple accents
5. **No responsive classes**: Everything uses fixed widths

### Key Files to Modify
- `app/page.tsx` - Main layout, header, bottom controls
- `components/ChatPanel.tsx` - AI panel (fixed 384px width)
- `components/AuthButton.tsx` - Login button
- `components/EventListPopover.tsx` - Events list (fixed 320px width)

---

## Implementation Plan

### Phase 1: Mobile Bottom Navigation

**Create `components/MobileNav.tsx`**

A fixed bottom navigation bar visible only on mobile (`md:hidden`):

```
┌─────────────────────────────────────────────┐
│  🔍        📋        ✨         ➕          │
│ Search   Events      AI       Add           │
└─────────────────────────────────────────────┘
```

**Props:**
```typescript
interface MobileNavProps {
  onSearchClick: () => void;
  onEventsClick: () => void;
  onAIClick: () => void;
  onAddClick: () => void;
  eventCount: number;
  pendingCount: number;
  isAIOpen: boolean;
}
```

**Styling:**
- `fixed bottom-0 left-0 right-0 z-30 md:hidden`
- `bg-gray-900/95 backdrop-blur-sm border-t border-gray-800`
- Height: `h-16` (64px) - good for thumb reach
- Safe area padding: `pb-safe` for iPhone notch

---

### Phase 2: Responsive Header

**Modify `app/page.tsx` header section**

**Desktop (md and up):** Keep current layout
```
[Logo] [----Search----] [Filters] [AI] [Auth]
```

**Mobile (< md):** Simplified
```
[Logo centered] [Auth button]
```

**Changes:**
1. Wrap search, filters, AI button in `hidden md:flex`
2. Add `flex md:hidden` for mobile-only logo centering
3. Keep AuthButton visible on both

---

### Phase 3: Responsive ChatPanel

**Modify `components/ChatPanel.tsx`**

Current: `w-96` (fixed 384px)

New responsive classes:
```
w-full h-full md:w-96 md:h-auto md:top-0 md:bottom-0
```

**Mobile behavior:**
- Full screen overlay (`fixed inset-0 z-50`)
- Add close gesture area at top (swipe indicator)
- Larger touch targets for buttons

**Desktop behavior:**
- Keep current side panel

---

### Phase 4: Responsive EventListPopover

**Modify `components/EventListPopover.tsx`**

Current: `w-80` (fixed 320px), `absolute bottom-6 left-6`

**Mobile:**
- Full width: `w-full md:w-80`
- Bottom sheet: `fixed bottom-16 left-0 right-0 md:absolute md:bottom-6 md:left-6`
- Max height: `max-h-[60vh]`
- Rounded top only on mobile: `rounded-t-2xl md:rounded-xl`

---

### Phase 5: Mobile Search Overlay

**Create `components/MobileSearch.tsx`**

A full-screen search overlay for mobile:

```typescript
interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
}
```

**Features:**
- Full screen with autofocus input
- Type filters as horizontal scroll chips
- Results count
- Clear button

---

### Phase 6: Hide Desktop-Only Elements

**Elements to hide on mobile:**
1. Legend (bottom right) - `hidden md:block`
2. "Add Event" button (moved to bottom nav) - `hidden md:flex`
3. Event count pill (replaced by bottom nav) - `hidden md:block`

---

## File-by-File Changes

### 1. `components/MobileNav.tsx` (NEW)
```typescript
// Fixed bottom nav with 4 actions
// Uses lucide icons: Search, List, Sparkles, Plus
// Badge for event count
// Active state for AI button
```

### 2. `components/MobileSearch.tsx` (NEW)
```typescript
// Full-screen search overlay
// Input with autofocus
// Type filter chips
// Close button
```

### 3. `app/page.tsx`
```diff
+ import MobileNav from "@/components/MobileNav";
+ import MobileSearch from "@/components/MobileSearch";
+ const [showMobileSearch, setShowMobileSearch] = useState(false);

// Header changes
- <div className="flex items-center gap-4">
+ <div className="flex items-center justify-between md:gap-4">
+   {/* Mobile: centered logo */}
+   <div className="flex-1 md:flex-none flex justify-center md:justify-start">
      <div className="flex items-center gap-2 ...">
        <Globe />
        <span>WorldTrue</span>
      </div>
+   </div>

-   {/* Search - hide on mobile */}
+   <div className="hidden md:block flex-1 max-w-md">
      ...search...
    </div>

-   {/* Filters, AI - hide on mobile */}
+   <div className="hidden md:flex items-center gap-2">
      ...filters and AI button...
    </div>

    <AuthButton />
  </div>

// Add mobile nav before closing </main>
+ <MobileNav
+   onSearchClick={() => setShowMobileSearch(true)}
+   onEventsClick={() => setShowEventsList(true)}
+   onAIClick={() => setShowChat(true)}
+   onAddClick={handleAddEvent}
+   eventCount={filteredEvents.length}
+   pendingCount={pendingEvents.length}
+   isAIOpen={showChat}
+ />

+ <MobileSearch
+   isOpen={showMobileSearch}
+   onClose={() => setShowMobileSearch(false)}
+   searchQuery={searchQuery}
+   onSearchChange={setSearchQuery}
+   selectedTypes={selectedTypes}
+   onTypeToggle={toggleType}
+ />

// Hide desktop-only elements
- <div className="absolute bottom-20 left-6">
+ <div className="absolute bottom-20 left-6 hidden md:flex">
    ...Add Event button...

- <div className="absolute bottom-6 left-6">
+ <div className="absolute bottom-6 left-6 hidden md:block">
    ...Event count...

- <div className="absolute bottom-6 right-20">
+ <div className="absolute bottom-6 right-20 hidden md:block">
    ...Legend...
```

### 4. `components/ChatPanel.tsx`
```diff
- <div className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 ...">
+ <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-96 bg-gray-900 ...">

// Add mobile swipe indicator
+ {/* Mobile close indicator */}
+ <div className="md:hidden flex justify-center py-2">
+   <div className="w-12 h-1 bg-gray-700 rounded-full" />
+ </div>
```

### 5. `components/EventListPopover.tsx`
```diff
- <div className="absolute bottom-6 left-6 z-20">
-   <div className="bg-gray-900/95 ... w-80 max-h-[70vh]">
+ <div className="fixed bottom-16 left-0 right-0 md:absolute md:bottom-6 md:left-6 md:right-auto z-20">
+   <div className="bg-gray-900/95 ... w-full md:w-80 max-h-[60vh] md:max-h-[70vh] rounded-t-2xl md:rounded-xl">
```

### 6. `components/AuthButton.tsx`
```diff
// Compact on mobile
- <span className="text-sm">Sign in</span>
+ <span className="text-sm hidden sm:inline">Sign in</span>

// Logged in state - hide name on mobile
- <span className="text-sm max-w-[100px] truncate">{session.user.name}</span>
+ <span className="text-sm max-w-[100px] truncate hidden sm:inline">{session.user.name}</span>
```

---

## CSS/Tailwind Additions

Add to `globals.css` for iOS safe areas:
```css
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## Testing Checklist

- [ ] iPhone SE (375px) - smallest common mobile
- [ ] iPhone 14 Pro (393px) - modern iPhone
- [ ] iPad Mini (768px) - tablet/breakpoint boundary
- [ ] Desktop (1024px+)

---

## Implementation Order

1. **MobileNav.tsx** - Create bottom navigation
2. **page.tsx header** - Make responsive
3. **ChatPanel.tsx** - Full screen on mobile
4. **EventListPopover.tsx** - Bottom sheet on mobile
5. **MobileSearch.tsx** - Search overlay
6. **AuthButton.tsx** - Compact variant
7. **Hide desktop elements** - Legend, counters
8. **Testing & polish**

---

## Notes

- Use `md:` breakpoint (768px) as mobile/desktop boundary
- All changes are additive (use responsive classes, not JS)
- Preserve all desktop functionality
- Mobile nav accounts for 64px bottom bar height
