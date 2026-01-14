# Test Cases - Admin Role

## Document Information
- **Project**: LXP-Enterprise (Magnetix LMS)
- **Role**: Admin
- **Version**: 1.0
- **Last Updated**: 2026-01-10

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Dashboard](#dashboard)
3. [Marketing & Notifications](#marketing--notifications)
4. [Settings](#settings)
5. [Dark Mode](#dark-mode)
6. [UI/UX Elements](#uiux-elements)

---

## Authentication & Authorization

### TC-ADMIN-AUTH-001
**Test Case**: Admin Login
- **Description**: Verify admin user can successfully log in to the system
- **Pre-conditions**:
  - Admin account exists in the system
  - User is on the login page
- **Test Steps**:
  1. Enter valid admin credentials
  2. Click "Login" button
  3. Verify redirection to admin dashboard
- **Expected Result**: Admin is successfully logged in and redirected to dashboard
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-AUTH-002
**Test Case**: Admin Logout
- **Description**: Verify admin can successfully log out from the system
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Click on user profile/header dropdown
  2. Click "Sign Out" button
  3. Verify loading spinner appears on logout button
  4. Verify redirection to login page
- **Expected Result**:
  - Loading spinner appears for minimum time
  - Admin is logged out successfully
  - Redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-AUTH-003
**Test Case**: Prevent Access to Logged-in Pages After Logout
- **Description**: Verify browser back button cannot access logged-in pages after logout
- **Pre-conditions**: Admin has logged out
- **Test Steps**:
  1. After logout, click browser back button
  2. Attempt to access any admin dashboard page
- **Expected Result**: User remains on login page or is redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-AUTH-004
**Test Case**: Prevent Access to Public Pages When Logged In
- **Description**: Verify logged-in admin cannot navigate back to landing/login pages
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Click browser back button
  2. Try to manually navigate to /login or landing page
- **Expected Result**: Admin remains within logged-in pages, cannot access public pages
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-AUTH-005
**Test Case**: Navigate to Landing Page After Logout
- **Description**: Verify clicking back button on login page (after logout) goes to landing page
- **Pre-conditions**:
  - Admin has logged out
  - Currently on login page
- **Test Steps**:
  1. From login page, click browser back button
- **Expected Result**: User is redirected to landing page
- **Priority**: Medium
- **Status**: To Be Tested

---

## Dashboard

### TC-ADMIN-DASH-001
**Test Case**: Dashboard Loading
- **Description**: Verify admin dashboard loads with all components
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Navigate to admin dashboard
  2. Verify all sections load: stats cards, learning hours chart, top courses, tasks
- **Expected Result**: Dashboard displays all sections with correct data
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-DASH-002
**Test Case**: Learning Hours Chart Display
- **Description**: Verify learning hours line chart displays correctly
- **Pre-conditions**:
  - Admin is on dashboard
  - Learning hours data exists
- **Test Steps**:
  1. Locate Learning Hours section
  2. Verify line chart is visible
  3. Verify chart has data points
  4. Verify X-axis and Y-axis labels
- **Expected Result**: Chart displays with proper data visualization
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-DASH-003
**Test Case**: Chart Tooltip on Hover
- **Description**: Verify tooltip appears on hovering over chart data points
- **Pre-conditions**: Admin is on dashboard with learning hours chart visible
- **Test Steps**:
  1. Hover mouse over any data point on the line chart
  2. Verify tooltip appears showing hours and week information
  3. Move mouse away from data point
  4. Verify tooltip disappears
- **Expected Result**:
  - Tooltip appears on hover with correct data (hours, week)
  - Tooltip disappears when mouse moves away
  - Data point scales up on hover
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-DASH-004
**Test Case**: Chart Tooltip Dark Mode
- **Description**: Verify tooltip styling in dark mode
- **Pre-conditions**:
  - Admin is on dashboard
  - Dark mode is enabled
- **Test Steps**:
  1. Enable dark mode
  2. Hover over chart data points
  3. Verify tooltip background and text colors match dark theme
- **Expected Result**: Tooltip has proper dark mode styling with appropriate colors
- **Priority**: Low
- **Status**: To Be Tested

### TC-ADMIN-DASH-005
**Test Case**: Statistics Cards Display
- **Description**: Verify all statistics cards display correct information
- **Pre-conditions**: Admin is on dashboard
- **Test Steps**:
  1. Verify all stat cards are visible
  2. Check card titles, values, and icons
  3. Verify percentage changes display correctly
- **Expected Result**: All statistics cards show correct data with proper formatting
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-DASH-006
**Test Case**: Top Courses Section
- **Description**: Verify top courses section displays correctly
- **Pre-conditions**: Course data exists in system
- **Test Steps**:
  1. Locate Top Courses section
  2. Verify course names, learner counts, and progress bars
  3. Check if courses are sorted by enrollment/completion
- **Expected Result**: Top courses display with progress bars and accurate statistics
- **Priority**: Medium
- **Status**: To Be Tested

---

## Marketing & Notifications

### TC-ADMIN-NOTIF-001
**Test Case**: Access Marketing & Notification Page
- **Description**: Verify admin can access marketing/notification creation page
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Navigate to Marketing/Notification section
  2. Click on "Compose Notification" or similar option
- **Expected Result**: Notification composition page loads successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-002
**Test Case**: Notification Form Input Fields
- **Description**: Verify all input fields are functional and properly styled
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Click on "Notification Title" input field
  2. Verify background color is appropriate (not black)
  3. Click on "Message" text area
  4. Verify background color is appropriate (not black)
  5. Test in both light and dark modes
- **Expected Result**: Input fields have proper background colors in both light and dark modes
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-003
**Test Case**: Send Notification Button
- **Description**: Verify "Send Notification" button is present and functional
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Scroll to bottom of the form
  2. Verify "Send Notification" button is visible
  3. Fill in notification title and message
  4. Click "Send Notification" button
  5. Verify loading spinner appears
  6. Verify success/error feedback message
- **Expected Result**:
  - Button is visible at bottom of form
  - Loading state displays during submission
  - Appropriate feedback message appears
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-004
**Test Case**: Save as Draft Button
- **Description**: Verify "Save as Draft" button is present and functional
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Scroll to bottom of the form
  2. Verify "Save as Draft" button is visible beside "Send Notification"
  3. Fill in notification title (minimum)
  4. Click "Save as Draft" button
  5. Verify loading spinner appears on button
  6. Verify success/error feedback message
- **Expected Result**:
  - Button is visible at bottom of form
  - Loading state displays with spinner and "Saving Draft..." text
  - Draft is saved successfully
  - Feedback message appears
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-005
**Test Case**: Notification Title Validation
- **Description**: Verify validation when notification title is empty
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Leave notification title empty
  2. Fill in message content
  3. Click "Send Notification" or "Save as Draft"
- **Expected Result**: Error message displays: "Please enter a notification title"
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-006
**Test Case**: Notification Message Validation
- **Description**: Verify validation when notification message is empty
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Fill in notification title
  2. Leave message content empty
  3. Click "Send Notification"
- **Expected Result**: Error message displays requesting message content
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-007
**Test Case**: Button Disabled States
- **Description**: Verify buttons are disabled during submission
- **Pre-conditions**: Admin is on notification composition page with valid data
- **Test Steps**:
  1. Click "Send Notification" button
  2. Verify both buttons are disabled during processing
  3. Repeat for "Save as Draft" button
- **Expected Result**: Both buttons disabled during any submission to prevent duplicate requests
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-NOTIF-008
**Test Case**: Schedule Notification
- **Description**: Verify admin can schedule a notification for future date
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Fill in notification title and message
  2. Select "Scheduled" option
  3. Choose a future date and time
  4. Click "Send Notification"
  5. Verify notification is saved with scheduled status
- **Expected Result**: Notification is saved with scheduled date and time
- **Priority**: Medium
- **Status**: To Be Tested
- **Note**: Automatic sending requires backend cron job implementation

### TC-ADMIN-NOTIF-009
**Test Case**: Notification Feedback Messages
- **Description**: Verify success and error feedback messages display correctly
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Submit valid notification
  2. Verify success message appears with green checkmark
  3. Trigger error scenario (e.g., network issue)
  4. Verify error message appears with alert icon
  5. Verify messages auto-hide after timeout
- **Expected Result**: Feedback messages display appropriately and auto-hide
- **Priority**: Medium
- **Status**: To Be Tested

---

## Settings

### TC-ADMIN-SETT-001
**Test Case**: Access Settings Page
- **Description**: Verify admin can access settings page
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Navigate to Settings section
  2. Verify settings page loads
- **Expected Result**: Settings page displays successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-ADMIN-SETT-002
**Test Case**: Profile Picture Display
- **Description**: Verify profile picture displays with proper styling
- **Pre-conditions**:
  - Admin is on settings page
  - Profile picture exists
- **Test Steps**:
  1. Locate Profile Picture section
  2. Verify image displays correctly
  3. Verify no background color (only border)
  4. Verify greyish border is present and appropriate thickness
- **Expected Result**:
  - Profile picture displays with greyish border
  - No background color
  - Border thickness is appropriate (not too thick)
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-SETT-003
**Test Case**: Profile Picture Dark Mode
- **Description**: Verify profile picture styling in dark mode
- **Pre-conditions**:
  - Admin is on settings page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check profile picture section
  3. Verify no background color in dark mode
  4. Verify border color is visible in dark mode
- **Expected Result**: Profile picture has no background color and appropriate border in dark mode
- **Priority**: Low
- **Status**: To Be Tested

### TC-ADMIN-SETT-004
**Test Case**: Account Settings Cancel Button
- **Description**: Verify Cancel button has proper size and styling
- **Pre-conditions**: Admin is on AccountSettings page
- **Test Steps**:
  1. Locate Cancel button
  2. Compare height with adjacent button
  3. Verify button dimensions are consistent
- **Expected Result**: Cancel button height matches other buttons, not oversized
- **Priority**: Low
- **Status**: To Be Tested

---

## Dark Mode

### TC-ADMIN-DARK-001
**Test Case**: Toggle Dark Mode
- **Description**: Verify admin can toggle dark mode on/off
- **Pre-conditions**: Admin is logged in
- **Test Steps**:
  1. Locate dark mode toggle switch
  2. Click to enable dark mode
  3. Verify entire interface switches to dark theme
  4. Click again to disable dark mode
  5. Verify interface returns to light theme
- **Expected Result**: Dark mode toggles successfully with all UI elements updating
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-DARK-002
**Test Case**: Dashboard Dark Mode Colors
- **Description**: Verify all dashboard elements have proper dark mode colors
- **Pre-conditions**:
  - Admin is on dashboard
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check background colors of cards, charts, tables
  3. Verify text colors are readable
  4. Check border colors
- **Expected Result**: All elements have appropriate dark mode styling with good contrast
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-DARK-003
**Test Case**: Notification Form Dark Mode
- **Description**: Verify notification form elements in dark mode
- **Pre-conditions**:
  - Admin is on notification composition page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check input field backgrounds (should not be pure black)
  3. Verify text visibility
  4. Check button colors
- **Expected Result**: Form elements have proper dark mode colors with good visibility
- **Priority**: Medium
- **Status**: To Be Tested

---

## UI/UX Elements

### TC-ADMIN-UI-001
**Test Case**: Course Cards Display
- **Description**: Verify course cards display correctly with all elements
- **Pre-conditions**: Admin can view course listings
- **Test Steps**:
  1. Navigate to page with course cards
  2. Verify circular image displays properly
  3. Check that content doesn't overflow the circular boundary
  4. Verify "Online" status text is visible
- **Expected Result**:
  - Course images fit within circular boundary
  - No content overflow
  - "Online" text visible in current theme
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-UI-002
**Test Case**: Course Cards Dark Mode
- **Description**: Verify course card elements in dark mode
- **Pre-conditions**: Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. View course cards
  3. Verify "Online" status text color is visible
  4. Check card border colors (should be light border ~0.5px)
- **Expected Result**:
  - "Online" text has appropriate color for dark mode
  - Card borders are visible with light color (~0.5px)
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-UI-003
**Test Case**: Responsive Design - Dashboard
- **Description**: Verify dashboard is responsive on different screen sizes
- **Pre-conditions**: Admin is on dashboard
- **Test Steps**:
  1. Resize browser to tablet size (768-1200px)
  2. Verify stats grid adjusts to 2 columns
  3. Resize to mobile size (<768px)
  4. Verify stats grid adjusts to 1 column
  5. Check chart displays properly on all sizes
- **Expected Result**: Dashboard layout adapts appropriately to screen size
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-UI-004
**Test Case**: Chart Hover Animation
- **Description**: Verify smooth animations on chart data point hover
- **Pre-conditions**: Admin is on dashboard
- **Test Steps**:
  1. Hover over chart data points
  2. Verify smooth scale-up animation
  3. Verify drop shadow effect
  4. Check transition smoothness
- **Expected Result**: Data points scale smoothly with drop shadow on hover
- **Priority**: Low
- **Status**: To Be Tested

---

## Performance & Edge Cases

### TC-ADMIN-PERF-001
**Test Case**: Large Dataset Handling
- **Description**: Verify system handles large amounts of data efficiently
- **Pre-conditions**: System has extensive data (users, courses, notifications)
- **Test Steps**:
  1. Load dashboard with large dataset
  2. Measure page load time
  3. Check chart rendering performance
  4. Verify smooth interactions
- **Expected Result**: Page loads within acceptable time (<3 seconds), smooth interactions
- **Priority**: Medium
- **Status**: To Be Tested

### TC-ADMIN-PERF-002
**Test Case**: Concurrent Notification Submissions
- **Description**: Verify system handles rapid button clicks appropriately
- **Pre-conditions**: Admin is on notification composition page
- **Test Steps**:
  1. Fill notification form
  2. Rapidly click "Send Notification" multiple times
  3. Verify only one request is processed (buttons disabled)
- **Expected Result**: Buttons disable immediately, preventing duplicate submissions
- **Priority**: High
- **Status**: To Be Tested

---

## Summary Statistics
- **Total Test Cases**: 35
- **High Priority**: 14
- **Medium Priority**: 17
- **Low Priority**: 4
- **Status**: All To Be Tested

---

## Notes
- All test cases should be executed in both light and dark modes where applicable
- Cross-browser testing recommended: Chrome, Firefox, Safari, Edge
- Mobile responsiveness should be verified for all critical features
- Automated testing scripts can be developed based on these test cases
