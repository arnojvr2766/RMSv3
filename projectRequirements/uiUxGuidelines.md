# UI/UX Guidelines Document

**Version:** 1.0  
**Date:** 15 Sep 2025  
**Owner:** Arno Jansen van Renesburg  

---

## 1. Design Principles

### 1.1 Core Principles

**Simplicity First**
- Clean, uncluttered interfaces
- Progressive disclosure of complex features
- Intuitive navigation patterns
- Minimal cognitive load

**Mobile-First Design**
- Touch-friendly interactions
- Responsive layouts for all devices
- Optimized for small screens
- Gesture-based navigation

**Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios

**Consistency**
- Unified design language
- Standardized components
- Consistent spacing and typography
- Predictable interaction patterns

---

## 2. Visual Design System

### 2.1 Color Palette

**Primary Colors (Electric Yellow)**
```css
:root {
  --primary-50: #fffef0;
  --primary-100: #fffce6;
  --primary-200: #fff8cc;
  --primary-300: #fff2b3;
  --primary-400: #ffec99;
  --primary-500: #FFD300;  /* Electric Yellow - Main brand color */
  --primary-600: #e6bd00;
  --primary-700: #cca700;
  --primary-800: #b39100;
  --primary-900: #997b00;
}
```

**Secondary Colors (Cool Grey)**
```css
:root {
  --secondary-50: #f5f5f5;
  --secondary-100: #e5e5e5;
  --secondary-200: #cccccc;
  --secondary-300: #b3b3b3;
  --secondary-400: #999999;
  --secondary-500: #808080;
  --secondary-600: #666666;
  --secondary-700: #4d4d4d;
  --secondary-800: #333333;
  --secondary-900: #1A1A1A;  /* Cool Grey - Main background */
}
```

**Accent Colors**
```css
:root {
  --accent-blue-50: #f0f9ff;
  --accent-blue-100: #e0f2fe;
  --accent-blue-500: #0ea5e9;  /* Neon Blue */
  --accent-blue-600: #0284c7;
  --accent-blue-700: #0369a1;
  
  --accent-green-50: #f0fdf4;
  --accent-green-100: #dcfce7;
  --accent-green-500: #22c55e;  /* Neon Green */
  --accent-green-600: #16a34a;
  --accent-green-700: #15803d;
}
```

**Neutral Colors (Extended Grey Scale)**
```css
:root {
  --gray-50: #fafafa;
  --gray-100: #f4f4f5;
  --gray-200: #e4e4e7;
  --gray-300: #d4d4d8;
  --gray-400: #a1a1aa;
  --gray-500: #71717a;
  --gray-600: #52525b;
  --gray-700: #3f3f46;
  --gray-800: #27272a;
  --gray-900: #18181b;
}
```

**Status Colors**
```css
:root {
  --success: #22c55e;    /* Neon Green */
  --warning: #FFD300;    /* Electric Yellow */
  --error: #ef4444;      /* Red */
  --info: #0ea5e9;       /* Neon Blue */
  --neutral: #71717a;    /* Grey */
}
```

**Background Colors**
```css
:root {
  --bg-primary: #1A1A1A;      /* Cool Grey - Main background */
  --bg-secondary: #27272a;    /* Dark grey for cards */
  --bg-tertiary: #3f3f46;     /* Lighter grey for elevated elements */
  --bg-surface: #ffffff;       /* White for light mode surfaces */
  --bg-overlay: rgba(26, 26, 26, 0.8); /* Dark overlay */
}
```

### 2.2 Typography

**Font Stack**
```css
/* Headings - Inter Bold / Poppins Bold */
font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;

/* Body Text - Roboto Regular */
font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font Weights**
```css
:root {
  --font-weight-light: 300;
  --font-weight-regular: 400;    /* Roboto Regular */
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;       /* Inter/Poppins Bold */
  --font-weight-extrabold: 800;
}
```

**Type Scale**
```css
:root {
  --text-xs: 0.75rem;    /* 12px - Captions, labels */
  --text-sm: 0.875rem;   /* 14px - Small body text */
  --text-base: 1rem;     /* 16px - Body text */
  --text-lg: 1.125rem;   /* 18px - Large body text */
  --text-xl: 1.25rem;    /* 20px - Small headings */
  --text-2xl: 1.5rem;    /* 24px - Medium headings */
  --text-3xl: 1.875rem;  /* 30px - Large headings */
  --text-4xl: 2.25rem;   /* 36px - Extra large headings */
  --text-5xl: 3rem;      /* 48px - Hero headings */
}
```

**Typography Classes**
```css
.heading-hero {
  font-family: 'Inter', 'Poppins', sans-serif;
  font-weight: 700;
  font-size: var(--text-5xl);
  line-height: 1.1;
  color: var(--primary-500);
}

.heading-primary {
  font-family: 'Inter', 'Poppins', sans-serif;
  font-weight: 700;
  font-size: var(--text-3xl);
  line-height: 1.2;
  color: var(--secondary-900);
}

.heading-secondary {
  font-family: 'Inter', 'Poppins', sans-serif;
  font-weight: 700;
  font-size: var(--text-2xl);
  line-height: 1.3;
  color: var(--secondary-800);
}

.body-text {
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--secondary-700);
}

.body-small {
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  font-size: var(--text-sm);
  line-height: 1.4;
  color: var(--secondary-600);
}
```

### 2.3 Spacing System

**Spacing Scale**
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */
}
```

---

## 3. Component Library

### 3.1 Button Components

**Primary Button (Electric Yellow)**
```tsx
<Button variant="primary" size="md">
  Create Payment
</Button>
```

**Secondary Button (Cool Grey)**
```tsx
<Button variant="secondary" size="md">
  Cancel
</Button>
```

**Accent Button (Neon Blue/Green)**
```tsx
<Button variant="accent" size="md">
  AI Actions
</Button>
```

**Button Variants**
- `primary`: Electric Yellow (#FFD300) - Main CTAs and highlights
- `secondary`: Cool Grey (#1A1A1A) - Secondary actions
- `accent`: Neon Blue (#0ea5e9) or Neon Green (#22c55e) - AI actions and alerts
- `outline`: Outlined version of primary
- `ghost`: Minimal actions with hover states
- `danger`: Red for destructive actions

**Button Styles**
```css
.btn-primary {
  background-color: var(--primary-500);
  color: var(--secondary-900);
  border: none;
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  background-color: var(--primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 211, 0, 0.3);
}

.btn-secondary {
  background-color: var(--secondary-900);
  color: var(--primary-500);
  border: 1px solid var(--secondary-700);
}

.btn-accent {
  background-color: var(--accent-blue-500);
  color: white;
  border: none;
}
```

---

## 4. Layout Patterns

### 4.1 Dashboard Layout

**Grid System**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <SummaryCard title="Total Income" value="R 45,230" />
  <SummaryCard title="Occupancy Rate" value="87%" />
  <SummaryCard title="Overdue Payments" value="3" />
  <SummaryCard title="Pending Approvals" value="7" />
</div>
```

**Quick Actions**
```tsx
<div className="flex flex-wrap gap-3">
  <QuickAction icon="plus" label="New Payment" />
  <QuickAction icon="user-plus" label="Add Tenant" />
  <QuickAction icon="alert-circle" label="New Complaint" />
  <QuickAction icon="check-circle" label="Approve" />
</div>
```

### 4.2 Form Layouts

**Single Column Form**
```tsx
<form className="max-w-md space-y-6">
  <Input label="Room Number" required />
  <Select label="Payment Method" required />
  <Input label="Amount" type="number" required />
  <Button type="submit">Create Payment</Button>
</form>
```

**Multi-Step Form**
```tsx
<Stepper currentStep={2} totalSteps={4}>
  <Step title="Basic Info" completed />
  <Step title="Payment Details" active />
  <Step title="Review" />
  <Step title="Confirm" />
</Stepper>
```

### 4.3 Data Display Layouts

**Table Layout**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Room</TableHead>
      <TableHead>Tenant</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {payments.map(payment => (
      <TableRow key={payment.id}>
        <TableCell>{payment.room}</TableCell>
        <TableCell>{payment.tenant}</TableCell>
        <TableCell>R {payment.amount}</TableCell>
        <TableCell>
          <StatusBadge status={payment.status} />
        </TableCell>
        <TableCell>
          <ActionMenu payment={payment} />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Card Grid Layout**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {tenants.map(tenant => (
    <TenantCard key={tenant.id} tenant={tenant} />
  ))}
</div>
```

---

## 5. Interaction Patterns

### 5.1 Touch Interactions

**Swipe Gestures**
- Swipe left on payment row → Quick actions menu
- Swipe right on tenant card → View details
- Pull to refresh on lists → Refresh data

**Tap Targets**
- Minimum 44px touch target size
- Adequate spacing between interactive elements
- Visual feedback on touch

### 5.2 Loading States

**Skeleton Screens**
```tsx
<CardSkeleton />
<TableSkeleton rows={5} />
<ListSkeleton items={3} />
```

**Loading Indicators**
```tsx
<Spinner size="sm" />
<ProgressBar value={75} />
<LoadingDots />
```

### 5.3 Empty States

**No Data States**
```tsx
<EmptyState
  icon="credit-card"
  title="No payments yet"
  description="Create your first payment to get started"
  action={<Button>Create Payment</Button>}
/>
```

**Error States**
```tsx
<ErrorState
  icon="alert-circle"
  title="Something went wrong"
  description="We couldn't load your payments"
  action={<Button>Try Again</Button>}
/>
```

---

## 6. Responsive Design

### 6.1 Breakpoints

```css
:root {
  --breakpoint-sm: 640px;   /* Small devices */
  --breakpoint-md: 768px;   /* Medium devices */
  --breakpoint-lg: 1024px;  /* Large devices */
  --breakpoint-xl: 1280px;  /* Extra large devices */
  --breakpoint-2xl: 1536px; /* 2X large devices */
}
```

### 6.2 Mobile Adaptations

**Navigation**
- Collapsible sidebar on mobile
- Bottom navigation bar
- Hamburger menu for secondary actions

**Forms**
- Full-width inputs on mobile
- Stacked form elements
- Larger touch targets

**Tables**
- Horizontal scroll on mobile
- Card view alternative
- Collapsible rows

---

## 7. Accessibility Guidelines

### 7.1 Keyboard Navigation

**Tab Order**
- Logical tab sequence
- Skip links for main content
- Focus indicators visible
- Escape key closes modals

**Keyboard Shortcuts**
- `Ctrl/Cmd + K`: Global search
- `Ctrl/Cmd + N`: New payment
- `Escape`: Close modal/dropdown
- `Enter`: Submit form/activate button

### 7.2 Screen Reader Support

**ARIA Labels**
```tsx
<button aria-label="Delete payment">
  <TrashIcon />
</button>
```

**Semantic HTML**
```tsx
<main>
  <section aria-labelledby="payments-heading">
    <h2 id="payments-heading">Recent Payments</h2>
    <table role="table" aria-label="Payment history">
      {/* table content */}
    </table>
  </section>
</main>
```

### 7.3 Color and Contrast

**Contrast Ratios**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum
- Status indicators: Color + text/icon

**Color Blindness**
- Don't rely on color alone
- Use icons and text labels
- Provide alternative indicators

---

## 8. Animation and Transitions

### 8.1 Micro-interactions

**Button States**
```css
.button {
  transition: all 0.2s ease-in-out;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
  transform: translateY(0);
}
```

**Form Validation**
```css
.input-error {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

### 8.2 Page Transitions

**Route Transitions**
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

**List Animations**
```tsx
<AnimatePresence>
  {payments.map(payment => (
    <motion.div
      key={payment.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <PaymentCard payment={payment} />
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 9. Icon System

### 9.1 Icon Library

**Lucide React Icons (Line-based, Modern)**
```tsx
import {
  Home,
  Building,
  CreditCard,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash,
  Check,
  X,
  AlertCircle,
  Info,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Settings,
  Bell,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  X as Close,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Sparkles
} from 'lucide-react';
```

**Icon Usage Guidelines**
- **Line-based icons**: Use stroke-width="1.5" for consistency
- **Minimal fill**: Only use fill for active states or special emphasis
- **Consistent sizing**: 24px for most icons, 16px for inline text, 32px for large buttons
- **Color application**: 
  - Default: `var(--secondary-600)` (medium grey)
  - Active: `var(--primary-500)` (electric yellow)
  - Accent: `var(--accent-blue-500)` (neon blue)
  - Success: `var(--accent-green-500)` (neon green)
  - Error: `var(--error)` (red)

**Icon Component Examples**
```tsx
// Standard icon
<Home className="w-6 h-6 text-gray-600" />

// Active state icon
<Home className="w-6 h-6 text-yellow-500" />

// Accent icon (AI actions)
<Zap className="w-5 h-5 text-blue-500" />

// Status icons
<CheckCircle className="w-5 h-5 text-green-500" />
<XCircle className="w-5 h-5 text-red-500" />
<AlertTriangle className="w-5 h-5 text-yellow-500" />
```

### 9.2 Custom Icons

**Facility Status Icons**
```tsx
<FacilityIcon 
  status="active" 
  className="w-6 h-6 text-green-500 stroke-1.5" 
/>
<FacilityIcon 
  status="maintenance" 
  className="w-6 h-6 text-yellow-500 stroke-1.5" 
/>
<FacilityIcon 
  status="inactive" 
  className="w-6 h-6 text-gray-500 stroke-1.5" 
/>
```

**Payment Method Icons**
```tsx
<PaymentIcon method="cash" className="w-5 h-5 text-gray-600" />
<PaymentIcon method="eft" className="w-5 h-5 text-blue-500" />
<PaymentIcon method="mobile" className="w-5 h-5 text-green-500" />
<PaymentIcon method="card" className="w-5 h-5 text-purple-500" />
```

**AI Action Icons**
```tsx
<Sparkles className="w-5 h-5 text-blue-500" />  {/* AI suggestions */}
<Zap className="w-5 h-5 text-blue-500" />       {/* Quick actions */}
<Brain className="w-5 h-5 text-blue-500" />    {/* Smart features */}
```

---

## 10. Dark/Light Mode Support

### 10.1 Color Scheme Variables

**Light Mode**
```css
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #1A1A1A;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --border-color: #e5e7eb;
}
```

**Dark Mode**
```css
[data-theme="dark"] {
  --bg-primary: #1A1A1A;
  --bg-secondary: #27272a;
  --bg-tertiary: #3f3f46;
  --text-primary: #ffffff;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-color: #4b5563;
}
```

### 10.2 Component Adaptations

**Cards in Dark Mode**
```css
.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.card:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--primary-500);
}
```

---

## 11. Brand Application Examples

### 11.1 Dashboard Cards

**Income Card**
```tsx
<Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-gray-900 dark:text-white font-bold">
      Total Income
    </CardTitle>
    <DollarSign className="w-6 h-6 text-yellow-500" />
  </CardHeader>
  <CardContent>
    <CardValue className="text-3xl font-bold text-gray-900 dark:text-white">
      R 45,230
    </CardValue>
    <CardChange className="text-green-500 font-medium">
      +12% from last month
    </CardChange>
  </CardContent>
</Card>
```

**Quick Action Button**
```tsx
<Button 
  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold 
             transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
>
  <Plus className="w-5 h-5 mr-2" />
  New Payment
</Button>
```

### 11.2 Navigation

**Active Navigation Item**
```tsx
<NavItem 
  className="bg-yellow-500 text-gray-900 font-semibold rounded-lg"
  icon="home" 
  label="Dashboard" 
  active 
/>
```

**Inactive Navigation Item**
```tsx
<NavItem 
  className="text-gray-600 dark:text-gray-400 hover:text-yellow-500 
             hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
  icon="building" 
  label="Facilities" 
/>
```

---

*End of Updated UI/UX Guidelines Document*