# Company Profiles - Auto-Scrolling Carousel Setup

## What's New

The Company Profiles page now features:

1. **Auto-scrolling carousel** - Small company cards that continuously float from left to right
2. **Expandable details** - Click any card to expand full details directly below the carousel
3. **Smooth animations** - Framer Motion powered transitions
4. **Pause on hover** - Scrolling pauses when you hover over the carousel

## Installation

### Step 1: Install Framer Motion

```bash
cd client
npm install framer-motion
```

### Step 2: Run the Development Server

```bash
npm run dev
```

### Step 3: Navigate to Companies Page

Open your browser and go to: `http://localhost:3000/companies`

## How It Works

### Auto-Scrolling Carousel
- Cards automatically scroll from left to right at 0.5 pixels per frame
- Companies are duplicated to create an infinite loop effect
- Hover over the carousel to pause scrolling
- Move your mouse away to resume scrolling

### Expandable Details
- Click any card in the carousel to expand its details below
- The carousel remains visible and continues scrolling
- Selected card is highlighted with a ring
- Click the X button to close the detail view
- Click another card to switch companies

### Visual Feedback
- Selected card has a ring highlight
- Hover effects on cards (scale up)
- Smooth expand/collapse animations
- Delete button appears on hover

## Components Structure

```
client/components/companies/
├── CompanyCarousel.tsx      # Auto-scrolling carousel with small cards
├── CompanyDetail.tsx        # Expandable detail view below carousel
└── README.md               # Component documentation
```

## Customization

### Adjust Scroll Speed

In `CompanyCarousel.tsx`, modify the `scrollSpeed` variable:

```tsx
const scrollSpeed = 0.5 // Change this value (higher = faster)
```

### Adjust Card Width

In `CompanyCarousel.tsx`, modify the `min-w-[200px]` class:

```tsx
className="... min-w-[200px] ..." // Change 200px to your desired width
```

### Disable Auto-Scroll

Comment out the auto-scroll effect in `CompanyCarousel.tsx`:

```tsx
// useEffect(() => {
//   // Auto-scroll code here
// }, [companies])
```

## Features

✅ Auto-scrolling carousel with infinite loop
✅ Pause on hover
✅ Expandable detail view below carousel
✅ Smooth Framer Motion animations
✅ Visual feedback for selected card
✅ Delete functionality in both views
✅ Responsive design
✅ Glassmorphism styling

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Touch-friendly

## Performance

- Uses `requestAnimationFrame` for smooth 60fps scrolling
- Efficient re-renders with React hooks
- Optimized animations with Framer Motion
- No layout shifts or jank

## Troubleshooting

### Carousel not scrolling?
- Make sure you have at least 2 companies added
- Check browser console for errors
- Verify framer-motion is installed

### Cards not expanding?
- Check that framer-motion is installed
- Verify no console errors
- Try refreshing the page

### Scrolling too fast/slow?
- Adjust the `scrollSpeed` variable in CompanyCarousel.tsx
- Values between 0.3 and 1.0 work best
