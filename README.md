<div align="center">

![header](https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:1D9E75,100:378ADD&height=200&section=header&text=SWIM_SCORE_PRO&fontSize=48&fontColor=ffffff&fontAlignY=38&desc=v3.0.4-STABLE%20%C2%B7%20Professional%20Swim%20Timing%20System&descSize=18&descAlignY=58&descColor=b0c4de)

<br/>

![HTML5](https://img.shields.io/badge/HTML5-5.0-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-3.0-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-0078D7?style=for-the-badge)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

<br/>

**A professional web-based swim timing and scoring system with role-based access, live results feed, and comprehensive audit logging.**

[Features](#-features) · [Tech Stack](#-tech-stack) · [Installation](#-installation) · [Screens](#-screens) · [Usage](#-usage-guide)

</div>

---

## Features

<table>
<tr>
<td width="33%" valign="top">

### 🔐 Security
- Role-based access control (Admin/Timekeeper/Viewer)
- Multi-factor authentication (MFA/OTP)
- Account lockout after 3 failed attempts
- Session timeout with warnings
- IP change detection
- Comprehensive audit logs

</td>
<td width="33%" valign="top">

### ⏱️ Timing
- Manual time entry console
- Real-time validation checks
- Heat sheet management
- Lane configuration
- Duplicate time detection
- Verified entry workflow

</td>
<td width="33%" valign="top">

### 📊 Live Feed
- Public results feed (no auth required)
- Auto-refresh every 2 seconds
- Filterable by event/gender/category
- Export to CSV functionality
- Medal rankings with deltas
- Reaction time tracking

</td>
</tr>
</table>

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│    HTML5 · CSS3 · Vanilla JS · Inter Font · JetBrains Mono  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Modules                       │
│   SecurityManager · DataStorage · EventManager · WebServer  │
│                    LivePanelUI Module                       │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Browser (ES6+) | Client-side execution |
| Styling | CSS3 Custom Properties | Design tokens & theming |
| Fonts | Inter / JetBrains Mono | UI typography & data display |
| Icons | Material Symbols Outlined v1.12.0 | Icon library |
| Accessibility | WCAG 2.1 AA | Keyboard nav, ARIA, focus states |
| Architecture | Modular JavaScript | SecurityManager, DataStorage, EventManager, WebServer, LivePanelUI |

---

## Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for production deployment)
- No build tools or dependencies required

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-org/swim-score-pro.git
cd swim-score-pro

# 2. Open in browser (development)
# Option A: Open index.html directly
open index.html

# Option B: Use a local server
npx serve .

# Option C: Python simple server
python3 -m http.server 8000
```

Open **http://localhost:8000** (or your chosen port) in your browser.

---

## Project Structure

```
swim-score-pro/
├── index.html              # Landing/navigation page
├── pages/
│   ├── login.html          # Authentication with MFA
│   ├── dashboard.html      # Admin dashboard
│   ├── time-entry.html     # Timekeeper console
│   ├── live-feed.html      # Public live results
│   └── audit-logs.html     # System audit trail
├── src/
│   ├── css/
│   │   ├── tokens.css      # Design tokens (colors, typography, spacing)
│   │   ├── base.css        # Base styles & components
│   │   └── layout.css      # Screen layouts
│   └── js/
│       └── app.js          # Core modules (SecurityManager, DataStorage, etc.)
├── assets/
│   └── fonts/              # Inter & JetBrains Mono (if self-hosted)
├── package.json            # Project metadata
└── README.md               # This file
```

---

## Screens

### 1. Login Page — `secure.swimscore.pro/auth/login`
- Email/username + password authentication
- 6-digit OTP entry with auto-advance
- MFA with resend code functionality
- Account lockout after 3 failed attempts
- Session countdown timer

### 2. Admin Dashboard — `dashboard.swimscore.pro/admin`
- Bento grid layout with system cards
- Role-based visibility (Admin vs Timekeeper)
- System status widget with diagnostics
- Navigation: LIVE_FEEDS | MEET_MANAGER | ATHLETES | RECORDS

### 3. Time Entry Console — `local.timekeeper.console`
- Manual time entry form with validation
- Heat/lane/swimmer context display
- Real-time validation checks (format, range, duplicates)
- Recent submissions sidebar

### 4. Live Results Feed — `swim-score-pro.local/live`
- **PUBLIC ACCESS** (no authentication required)
- Auto-refresh every 2 seconds
- Filterable results table
- Export to CSV functionality
- Medal rankings with reaction times

### 5. Audit Logs — `admin.swimscorepro.com/system/audit-logs`
- Immutable system event log
- Filterable by time window, event type, entity
- Severity badges (HIGH/WARN/INFO)
- Expandable row details with JSON payload

### 6. Manage Access — `system.swim-score-pro/admin/manage-access`
- User management table
- Role assignment with permission preview
- Status toggles (active/disabled)
- Role permissions panel with locked admin features

### 7. System Settings — Tabbed Interface
- **General**: System name, timezone, language
- **Security**: Session policies, password requirements, 2FA enforcement
- **Notifications**: Email alerts, webhook configuration

### 8. Print/Export View — `swim-score-pro.local/print/event/121`
- Print-optimized layout
- Clean monospace times
- QR code linking to live results
- CSV export with UTF-8 encoding

---

## Design System

### Colors (Light Mode Default)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#f9f9f9` | Page background |
| `--surface` | `#FAFAFA` | Card backgrounds |
| `--border-primary` | `#D1D1D1` | Primary borders |
| `--text-primary` | `#1a1c1c` | Primary text |
| `--text-secondary` | `#4c4546` | Secondary text |
| `--status-success` | `#10B981` | Success states |
| `--status-warn` | `#F59E0B` | Warning states |
| `--status-error` | `#EF4444` | Error states |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Logo | Inter | 12px | 700 |
| Headings | Inter | 20-24px | 600 |
| Body | Inter | 14px | 400 |
| Labels | Inter | 12px | 700 |
| Data/Times | JetBrains Mono | 13px | 400 |

### Spacing

- Base unit: `4px`
- Grid gutter: `16px`
- Card padding: `24px`
- Row height minimum: `48px`
- Sidebar width: `220px`

---

## Usage Guide

### Login Flow
1. Navigate to `/pages/login.html`
2. Enter credentials: `admin.sys@swimscore.pro` / `password123`
3. Enter 6-digit OTP: `123456`
4. Click "VERIFY & LOGIN"

### Admin Dashboard
1. After login, access full admin features
2. Navigate via top tabs: LIVE_FEEDS, MEET_MANAGER, ATHLETES, RECORDS
3. Use sidebar for: Dashboard, Lane Config, Heat Sheets, Official Timer, System Logs
4. Run diagnostics from System Status widget

### Time Entry (Timekeeper Role)
1. Navigate to Official Timer from sidebar
2. Select event and lane from context dropdowns
3. Enter time in HH:MM:SS.MS format
4. Check "VERIFIED ENTRY" checkbox
5. Click "SUBMIT TIME"
6. View submission in Recent Submissions sidebar

### Live Feed (Public Access)
1. Navigate to `/pages/live-feed.html` (no login required)
2. Filter by event, category, gender
3. View real-time results with auto-refresh
4. Export results via "EXPORT CSV" button
5. Toggle auto-refresh on/off

### Audit Logs
1. Navigate to System Logs from admin sidebar
2. Filter by time window, event type, or entity
3. Click rows to expand full details
4. Export logs via "EXPORT CSV" button

### Manage Access
1. Navigate to Manage Access from admin panel
2. Add new users via "+ ADD NEW USER"
3. Change roles with permission preview
4. Configure role permissions in right sidebar
5. Save policy changes

---

## Accessibility

### WCAG 2.1 AA Compliance
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Keyboard navigation (Tab/Shift+Tab)
- ✅ Focus indicators (2px #000 outline)
- ✅ ARIA labels for icon-only buttons
- ✅ Skip-to-content link
- ✅ Live regions for dynamic content
- ✅ Form validation with error announcements

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Submit forms |
| `Ctrl+T` | Focus time input (Time Entry) |
| `Ctrl+S` | Submit time (Time Entry) |
| `Esc` | Close modals / Collapse panels |
| `Tab` | Navigate forward |
| `Shift+Tab` | Navigate backward |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 2 seconds |
| Live feed polling | < 500ms |
| API latency | < 100ms |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 100 |

---

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the **ISC License**. See [`LICENSE`](LICENSE) for details.

---

## Security Considerations

- All authentication is client-side demo (replace with backend for production)
- Session tokens should be stored securely (HttpOnly cookies in production)
- Audit logs provide immutable record of all system actions
- Role-based access prevents unauthorized operations
- MFA adds additional security layer for admin accounts

---

<div align="center">

![footer](https://capsule-render.vercel.app/api?type=waving&color=0:378ADD,50:1D9E75,100:0d1117&height=100&section=footer)

Built with ❤️ using HTML5, CSS3, and Vanilla JavaScript · WCAG 2.1 AA Compliant

</div>
