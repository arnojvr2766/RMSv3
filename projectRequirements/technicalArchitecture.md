# Technical Architecture Document

**Version:** 1.0  
**Date:** 15 Sep 2025  
**Owner:** Arno Jansen van Renesburg  

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React PWA     │    │   Firebase      │    │   External      │
│   Frontend      │◄──►│   Backend       │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React 18      │    │ • Firestore     │    │ • SendGrid      │
│ • TypeScript    │    │ • Auth          │    │ • Twilio        │
│ • PWA Features  │    │ • Functions     │    │ • Payment APIs  │
│ • Offline Sync  │    │ • Storage       │    │ • SMS Gateway   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- React Query for data fetching
- React Hook Form + Zod for forms
- Workbox for PWA features

**Backend**
- Firebase Cloud Firestore (NoSQL database)
- Firebase Authentication
- Firebase Cloud Functions (Node.js)
- Firebase Storage (file uploads)
- Firebase Hosting (CDN)

**Development Tools**
- ESLint + Prettier for code quality
- Jest + React Testing Library for testing
- Cypress for E2E testing
- GitHub Actions for CI/CD

---

## 2. Frontend Architecture

### 2.1 Component Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI elements (Button, Input, etc.)
│   ├── forms/           # Form components
│   ├── charts/          # Data visualization
│   └── layout/          # Layout components
├── pages/               # Route components
│   ├── dashboard/
│   ├── facilities/
│   ├── payments/
│   └── reports/
├── hooks/               # Custom React hooks
├── services/            # API and business logic
├── store/               # 
 (Redux Toolkit)
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── assets/              # Static assets
```

### 2.2 State Management

**Redux Toolkit Structure**
```typescript
store/
├── index.ts             # Store configuration
├── slices/
│   ├── authSlice.ts     # Authentication state
│   ├── facilitySlice.ts # Facility management
│   ├── paymentSlice.ts  # Payment processing
│   └── uiSlice.ts       # UI state (modals, loading)
└── middleware/
    ├── authMiddleware.ts
    └── syncMiddleware.ts # Offline sync
```

### 2.3 PWA Architecture

**Service Worker Strategy**
- **Precaching**: App shell and critical assets
- **Runtime Caching**: API responses and images
- **Background Sync**: Queue offline actions
- **Push Notifications**: Real-time updates

**Offline Data Management**
```typescript
// Offline queue structure
interface OfflineAction {
  id: string;
  type: 'CREATE_PAYMENT' | 'UPDATE_RENTAL' | 'CREATE_COMPLAINT';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}
```

---

## 3. Backend Architecture

### 3.1 Firebase Services

**Cloud Firestore**
- Document-based NoSQL database
- Real-time listeners for live updates
- Security rules for access control
- Automatic scaling and backup

**Cloud Functions**
- Serverless Node.js functions
- Triggered by Firestore changes
- Handle business logic and integrations
- PDF generation and email sending

**Authentication**
- Email/password authentication
- Role-based access control
- Multi-factor authentication for admins
- Session management with refresh tokens

**Storage**
- File uploads (documents, images)
- Secure download URLs
- Automatic virus scanning
- CDN distribution

### 3.2 API Design

**RESTful Endpoints**
```typescript
// Base URL: https://us-central1-project.cloudfunctions.net/api

// Authentication
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/reset-password

// Facilities
GET    /facilities
GET    /facilities/{id}
POST   /facilities
PUT    /facilities/{id}
DELETE /facilities/{id}

// Payments
GET    /facilities/{facilityId}/payments
POST   /facilities/{facilityId}/payments
PUT    /payments/{id}
GET    /payments/{id}/receipt
```

**Real-time Subscriptions**
```typescript
// Firestore real-time listeners
const unsubscribe = onSnapshot(
  collection(db, 'payments'),
  (snapshot) => {
    // Handle real-time updates
  }
);
```

---

## 4. Data Architecture

### 4.1 Database Design

**Collection Relationships**
```
organizations (1) ── (many) facilities
facilities (1) ── (many) rooms
facilities (1) ── (many) tenants
facilities (1) ── (many) rentals
rentals (1) ── (many) payments
rentals (1) ── (many) complaints
```

**Indexing Strategy**
- Composite indexes for complex queries
- Single-field indexes for common filters
- Array-contains indexes for tag searches
- Geospatial indexes for location-based queries

### 4.2 Data Flow

**Payment Processing Flow**
```
1. User creates payment → Frontend validation
2. Payment proposal → Firestore (status: 'proposed')
3. Admin approval → Cloud Function trigger
4. Status update → 'posted'
5. Receipt generation → PDF creation
6. Notification → Email/SMS to tenant
7. Real-time update → Frontend refresh
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
1. User login → Firebase Auth
2. JWT token → Frontend storage
3. API requests → Token validation
4. Role verification → Firestore rules
5. Access granted/denied → Response
```

### 5.2 Security Layers

**Frontend Security**
- Input validation and sanitization
- XSS protection with CSP headers
- Secure token storage
- HTTPS enforcement

**Backend Security**
- Firestore security rules
- Cloud Function authentication
- Rate limiting and DDoS protection
- Data encryption at rest

**Network Security**
- HTTPS/TLS encryption
- CORS configuration
- API key management
- IP whitelisting (optional)

---

## 6. Performance Architecture

### 6.1 Frontend Optimization

**Code Splitting**
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
```

**Caching Strategy**
- React Query for API caching
- Service Worker for asset caching
- Local storage for user preferences
- IndexedDB for offline data

### 6.2 Backend Optimization

**Database Optimization**
- Pagination for large datasets
- Composite indexes for queries
- Connection pooling
- Query optimization

**Function Optimization**
- Cold start minimization
- Memory optimization
- Concurrent execution limits
- Timeout handling

---

## 7. Monitoring & Observability

### 7.1 Application Monitoring

**Frontend Monitoring**
- Error boundary for crash reporting
- Performance metrics (Core Web Vitals)
- User interaction tracking
- PWA installation tracking

**Backend Monitoring**
- Cloud Function execution metrics
- Firestore usage monitoring
- Authentication success/failure rates
- API response times

### 7.2 Logging Strategy

**Structured Logging**
```typescript
// Log format
{
  timestamp: '2025-09-15T10:30:00Z',
  level: 'info',
  service: 'payment-service',
  userId: 'user123',
  action: 'create-payment',
  facilityId: 'facility456',
  metadata: {
    amount: 1500,
    method: 'cash'
  }
}
```

**Log Levels**
- ERROR: System errors and exceptions
- WARN: Business rule violations
- INFO: User actions and system events
- DEBUG: Detailed debugging information

---

## 8. Deployment Architecture

### 8.1 Environment Strategy

**Development Environment**
- Local Firebase emulators
- Hot reloading and debugging
- Mock external services
- Development database

**Staging Environment**
- Production-like Firebase project
- Integration testing
- Performance testing
- User acceptance testing

**Production Environment**
- Multi-region deployment
- Auto-scaling configuration
- Backup and disaster recovery
- Monitoring and alerting

### 8.2 CI/CD Pipeline

**GitHub Actions Workflow**
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Firebase
        run: firebase deploy
```

---

## 9. Scalability Considerations

### 9.1 Horizontal Scaling

**Frontend Scaling**
- CDN distribution
- Static asset optimization
- Progressive loading
- Caching strategies

**Backend Scaling**
- Firebase auto-scaling
- Function concurrency limits
- Database sharding (if needed)
- Load balancing

### 9.2 Performance Targets

**Response Times**
- Dashboard load: < 2 seconds
- Payment creation: < 1 second
- Report generation: < 5 seconds
- File upload: < 10 seconds

**Throughput**
- Concurrent users: 1000+
- Payments per minute: 100+
- File uploads: 50MB per request
- Real-time updates: < 500ms latency

---

## 10. Disaster Recovery

### 10.1 Backup Strategy

**Database Backups**
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- Retention policy: 30 days

**File Storage Backups**
- Automatic replication
- Version history
- Geographic distribution
- Access logging

### 10.2 Recovery Procedures

**RTO/RPO Targets**
- Recovery Time Objective: 4 hours
- Recovery Point Objective: 1 hour
- Data loss tolerance: Zero
- Service availability: 99.9%

**Recovery Steps**
1. Assess damage and scope
2. Activate backup systems
3. Restore from latest backup
4. Verify data integrity
5. Resume normal operations
6. Post-incident review

---

*End of Technical Architecture Document*

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

**Primary Colors**
```css
:root {
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;  /* Main brand color */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-900: #1e3a8a;
}
```

**Secondary Colors**
```css
:root {
  --secondary-50: #f0fdf4;
  --secondary-100: #dcfce7;
  --secondary-500: #22c55e;  /* Success states */
  --secondary-600: #16a34a;
  --secondary-700: #15803d;
}
```

**Neutral Colors**
```css
:root {
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

**Status Colors**
```css
:root {
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### 2.2 Typography

**Font Stack**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Type Scale**
```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

**Font Weights**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

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
}
```

---

## 3. Component Library

### 3.1 Button Components

**Primary Button**
```tsx
<Button variant="primary" size="md">
  Create Payment
</Button>
```

**Secondary Button**
```tsx
<Button variant="secondary" size="md">
  Cancel
</Button>
```

**Button Variants**
- `primary`: Main actions
- `secondary`: Secondary actions
- `outline`: Subtle actions
- `ghost`: Minimal actions
- `danger`: Destructive actions

**Button Sizes**
- `sm`: Small (32px height)
- `md`: Medium (40px height)
- `lg`: Large (48px height)

### 3.2 Form Components

**Input Field**
```tsx
<Input
  label="Room Number"
  placeholder="Enter room number"
  error="Room number is required"
  required
/>
```

**Select Dropdown**
```tsx
<Select
  label="Payment Method"
  options={[
    { value: 'cash', label: 'Cash' },
    { value: 'eft', label: 'EFT' },
    { value: 'mobile', label: 'Mobile' }
  ]}
/>
```

**Date Picker**
```tsx
<DatePicker
  label="Payment Date"
  value={paymentDate}
  onChange={setPaymentDate}
/>
```

### 3.3 Card Components

**Summary Card**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Total Income</CardTitle>
    <CardIcon icon="dollar-sign" />
  </CardHeader>
  <CardContent>
    <CardValue>R 45,230</CardValue>
    <CardChange positive>+12% from last month</CardChange>
  </CardContent>
</Card>
```

**Data Card**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Payments</CardTitle>
    <CardAction>
      <Button variant="ghost" size="sm">View All</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <PaymentList payments={recentPayments} />
  </CardContent>
</Card>
```

### 3.4 Navigation Components

**Sidebar Navigation**
```tsx
<Sidebar>
  <NavItem icon="home" label="Dashboard" active />
  <NavItem icon="building" label="Facilities" />
  <NavItem icon="credit-card" label="Payments" />
  <NavItem icon="users" label="Tenants" />
  <NavItem icon="file-text" label="Reports" />
</Sidebar>
```

**Breadcrumb Navigation**
```tsx
<Breadcrumb>
  <BreadcrumbItem>Dashboard</BreadcrumbItem>
  <BreadcrumbItem>Facilities</BreadcrumbItem>
  <BreadcrumbItem>Sunset Manor</BreadcrumbItem>
  <BreadcrumbItem>Room 101</BreadcrumbItem>
</Breadcrumb>
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

**Lucide React Icons**
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
  MapPin
} from 'lucide-react';
```

**Icon Usage Guidelines**
- Consistent 24px size for most icons
- 16px for inline text icons
- 32px for large action buttons
- Use filled variants for active states
- Use outlined variants for inactive states

### 9.2 Custom Icons

**Facility Status Icons**
```tsx
<FacilityIcon status="active" />
<FacilityIcon status="maintenance" />
<FacilityIcon status="inactive" />
```

**Payment Method Icons**
```tsx
<PaymentIcon method="cash" />
<PaymentIcon method="eft" />
<PaymentIcon method="mobile" />
<PaymentIcon method="card" />
```

---

## 10. PWA-Specific Guidelines

### 10.1 Install Prompts

**Install Banner**
```tsx
<InstallPrompt
  title="Install Rental Manager"
  description="Get quick access to your rental management tools"
  icon="/icons/icon-192x192.png"
/>
```

**Add to Home Screen**
- Custom splash screen
- App icon with facility branding
- Theme color matching brand

### 10.2 Offline States

**Offline Indicator**
```tsx
<OfflineIndicator>
  <WifiOff className="w-4 h-4" />
  <span>You're offline</span>
</OfflineIndicator>
```

**Offline Actions**
```tsx
<OfflineAction>
  <Clock className="w-4 h-4" />
  <span>Will sync when online</span>
</OfflineAction>
```

### 10.3 Push Notifications

**Notification Design**
- Clear, actionable messages
- Consistent with app branding
- Appropriate urgency levels
- Action buttons when relevant

**Permission Flow**
```tsx
<NotificationPermission
  title="Stay Updated"
  description="Get notified about new payments and approvals"
  onAllow={() => requestNotificationPermission()}
  onDeny={() => setNotificationPreference(false)}
/>
```

---

## 11. Performance Guidelines

### 11.1 Image Optimization

**Responsive Images**
```tsx
<Image
  src="/images/facility.jpg"
  alt="Facility exterior"
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, 400px"
  loading="lazy"
/>
```

**Icon Optimization**
- SVG icons for scalability
- Optimized file sizes
- Proper caching headers

### 11.2 Loading Performance

**Critical Path**
- Above-the-fold content first
- Lazy load non-critical components
- Preload important resources
- Minimize render-blocking resources

**Progressive Enhancement**
- Core functionality works without JS
- Enhanced experience with JavaScript
- Graceful degradation for older browsers

---

*End of Technical Architecture Document*

## 🏗️ **Home Page Architecture Plan**

### **File Structure for Home Page:**

```
<code_block_to_apply_changes_from>
```

### **Key Components to Create:**

#### **1. AuthContext.tsx** - Role Management
- Manages user authentication state
- Handles role switching for debugging
- Provides facilities access
- Mock data for development

#### **2. Header.tsx** - Top Navigation
- Role toggle for debugging (temporary)
- User menu with profile
- Notifications
- Search functionality

#### **3. RoleToggle.tsx** - Debug Component
- Dropdown to switch between roles
- Visual indicator of current role
- Temporary component for development

#### **4. HomePage.tsx** - Main Container
- Combines header, sidebar, and dashboard
- Responsive layout
- Handles routing logic

#### **5. Dashboard.tsx** - Content Area
- Statistics cards
- Recent activity
- Quick actions
- Charts and graphs

### **Role-Based Features:**

#### **Super Admin:**
- Access to all facilities
- User management
- System configuration
- Global reports

#### **Facility Admin:**
- Access to assigned facilities
- Approve/reject proposals
- Manage facility settings
- Generate reports

#### **Standard User:**
- Create proposals
- View assigned facilities
- Basic reporting
- Limited access

#### **Read-Only User:**
- View-only access
- Generate reports
- No modifications

### **Design Considerations:**

1. **Modular Components**: Each component has a single responsibility
2. **Reusable UI**: Components can be used across different pages
3. **Type Safety**: Full TypeScript support
4. **Responsive Design**: Mobile-first approach
5. **Accessibility**: WCAG 2.1 AA compliance
6. **Performance**: Lazy loading and code splitting

### **State Management:**

- **AuthContext**: Global authentication state
- **Local State**: Component-specific state
- **Future**: Redux Toolkit for complex state

Would you like me to help you create any specific component from this architecture? I can guide you through the implementation of each piece while maintaining clean, maintainable code structure.
