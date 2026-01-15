# Test Cases - Trainer/Instructor Role

## Document Information
- **Project**: LXP-Enterprise (Magnetix LMS)
- **Role**: Trainer/Instructor
- **Version**: 1.0
- **Last Updated**: 2026-01-10

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Dashboard](#dashboard)
3. [Marketing & Notifications](#marketing--notifications)
4. [Learning Assignment Tool](#learning-assignment-tool)
5. [Settings](#settings)
6. [Dark Mode](#dark-mode)
7. [UI/UX Elements](#uiux-elements)

---

## Authentication & Authorization

### TC-TRAINER-AUTH-001
**Test Case**: Trainer Login
- **Description**: Verify trainer user can successfully log in to the system
- **Pre-conditions**:
  - Trainer account exists in the system
  - User is on the login page
- **Test Steps**:
  1. Enter valid trainer credentials
  2. Click "Login" button
  3. Verify redirection to trainer dashboard
- **Expected Result**: Trainer is successfully logged in and redirected to dashboard
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-AUTH-002
**Test Case**: Trainer Logout
- **Description**: Verify trainer can successfully log out from the system
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Click on user profile/header dropdown
  2. Click "Sign Out" button
  3. Verify loading spinner appears on logout button
  4. Verify redirection to login page
- **Expected Result**:
  - Loading spinner appears for minimum time
  - Trainer is logged out successfully
  - Redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-AUTH-003
**Test Case**: Prevent Access to Logged-in Pages After Logout
- **Description**: Verify browser back button cannot access logged-in pages after logout
- **Pre-conditions**: Trainer has logged out
- **Test Steps**:
  1. After logout, click browser back button
  2. Attempt to access any trainer dashboard page
- **Expected Result**: User remains on login page or is redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-AUTH-004
**Test Case**: Prevent Access to Public Pages When Logged In
- **Description**: Verify logged-in trainer cannot navigate back to landing/login pages
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Click browser back button
  2. Try to manually navigate to /login or landing page
- **Expected Result**: Trainer remains within logged-in pages, cannot access public pages
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-AUTH-005
**Test Case**: Navigate to Landing Page After Logout
- **Description**: Verify clicking back button on login page (after logout) goes to landing page
- **Pre-conditions**:
  - Trainer has logged out
  - Currently on login page
- **Test Steps**:
  1. From login page, click browser back button
- **Expected Result**: User is redirected to landing page
- **Priority**: Medium
- **Status**: To Be Tested

---

## Dashboard

### TC-TRAINER-DASH-001
**Test Case**: Dashboard Loading
- **Description**: Verify trainer dashboard loads with all components
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Navigate to trainer dashboard
  2. Verify all sections load: stats cards, learning hours chart, top courses, tasks
- **Expected Result**: Dashboard displays all sections with correct data
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-DASH-002
**Test Case**: Statistics Cards Display
- **Description**: Verify all statistics cards display trainer-specific information
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Verify all stat cards are visible
  2. Check metrics like assigned courses, active learners, etc.
  3. Verify percentage changes display correctly
- **Expected Result**: All statistics cards show correct trainer-specific data
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-DASH-003
**Test Case**: Learning Hours Chart Display
- **Description**: Verify learning hours line chart displays correctly
- **Pre-conditions**:
  - Trainer is on dashboard
  - Learning hours data exists
- **Test Steps**:
  1. Locate Learning Hours section
  2. Verify line chart is visible
  3. Verify chart has data points
  4. Verify X-axis and Y-axis labels
- **Expected Result**: Chart displays with proper data visualization
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-DASH-004
**Test Case**: Chart Tooltip on Hover
- **Description**: Verify tooltip appears on hovering over chart data points
- **Pre-conditions**: Trainer is on dashboard with learning hours chart visible
- **Test Steps**:
  1. Hover mouse over any data point on the line chart
  2. Verify tooltip appears showing hours and week information
  3. Move mouse away from data point
  4. Verify tooltip disappears
- **Expected Result**:
  - Tooltip appears on hover with correct data (hours, week)
  - Tooltip disappears when mouse moves away
  - Data point scales up on hover with smooth animation
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DASH-005
**Test Case**: Chart Tooltip Dark Mode
- **Description**: Verify tooltip styling in dark mode
- **Pre-conditions**:
  - Trainer is on dashboard
  - Dark mode is enabled
- **Test Steps**:
  1. Enable dark mode
  2. Hover over chart data points
  3. Verify tooltip background and text colors match dark theme
- **Expected Result**: Tooltip has proper dark mode styling with appropriate colors
- **Priority**: Low
- **Status**: To Be Tested

### TC-TRAINER-DASH-006
**Test Case**: Date Selector Display
- **Description**: Verify date selector at top right displays correctly
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Locate "Showing date" selector at top right
  2. Verify it displays current date range
  3. Verify styling is appropriate for current theme
- **Expected Result**: Date selector displays with proper colors in light mode
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DASH-007
**Test Case**: Date Selector Dark Mode
- **Description**: Verify date selector has proper dark mode colors
- **Pre-conditions**:
  - Trainer is on dashboard
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check date selector styling
  3. Verify text and background colors are appropriate
  4. Click on date selector
  5. Verify popup has proper dark mode colors
- **Expected Result**: Date selector and popup have appropriate dark mode colors matching page theme
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DASH-008
**Test Case**: Top Courses Section
- **Description**: Verify top courses section displays trainer's courses
- **Pre-conditions**: Trainer has assigned courses
- **Test Steps**:
  1. Locate Top Courses section
  2. Verify course names, learner counts, and progress bars
  3. Check if courses are trainer's assigned courses
- **Expected Result**: Top courses display with progress bars and accurate statistics
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DASH-009
**Test Case**: My Tasks Section Display
- **Description**: Verify My Tasks section displays trainer's tasks
- **Pre-conditions**: Trainer has assigned tasks
- **Test Steps**:
  1. Locate "My Tasks" section
  2. Verify tasks are displayed in table format
  3. Check task details: type, description, due date, status
  4. Verify task status badges (Pending, Urgent, etc.)
- **Expected Result**: Tasks display correctly with all details and status indicators
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-DASH-010
**Test Case**: My Tasks - View in Details Button
- **Description**: Verify "View in Details" button navigates to Learning Assignment Tool
- **Pre-conditions**:
  - Trainer is on dashboard
  - My Tasks section is visible
- **Test Steps**:
  1. Locate "View in Details" button in My Tasks section header
  2. Click the button
  3. Verify navigation to Learning Assignment Tool page
- **Expected Result**: Button navigates to Learning Assignment Tool page successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-DASH-011
**Test Case**: Task Action Buttons
- **Description**: Verify action buttons for individual tasks work correctly
- **Pre-conditions**: Tasks exist in My Tasks section
- **Test Steps**:
  1. Locate action buttons for each task
  2. Click action button (e.g., "Review Assignment")
  3. Verify appropriate action is taken
- **Expected Result**: Action buttons navigate to correct pages or trigger correct actions
- **Priority**: Medium
- **Status**: To Be Tested

---

## Marketing & Notifications

### TC-TRAINER-NOTIF-001
**Test Case**: Access Marketing & Notification Page
- **Description**: Verify trainer can access marketing/notification creation page
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Navigate to Marketing/Notification section
  2. Click on "Compose Notification" or similar option
- **Expected Result**: Notification composition page loads successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-002
**Test Case**: Notification Form Input Fields
- **Description**: Verify all input fields are functional and properly styled
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Click on "Notification Title" input field
  2. Verify background color is appropriate (not black)
  3. Click on "Message" text area
  4. Verify background color is appropriate (not black)
  5. Test in both light and dark modes
- **Expected Result**: Input fields have proper background colors in both light and dark modes
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-003
**Test Case**: Send Notification Button
- **Description**: Verify "Send Notification" button is present and functional
- **Pre-conditions**: Trainer is on notification composition page
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

### TC-TRAINER-NOTIF-004
**Test Case**: Save as Draft Button
- **Description**: Verify "Save as Draft" button is present and functional
- **Pre-conditions**: Trainer is on notification composition page
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

### TC-TRAINER-NOTIF-005
**Test Case**: Notification Title Validation
- **Description**: Verify validation when notification title is empty
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Leave notification title empty
  2. Fill in message content
  3. Click "Send Notification" or "Save as Draft"
- **Expected Result**: Error message displays: "Please enter a notification title"
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-006
**Test Case**: Notification Message Validation
- **Description**: Verify validation when notification message is empty
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Fill in notification title
  2. Leave message content empty
  3. Click "Send Notification"
- **Expected Result**: Error message displays requesting message content
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-007
**Test Case**: Button Disabled States
- **Description**: Verify buttons are disabled during submission
- **Pre-conditions**: Trainer is on notification composition page with valid data
- **Test Steps**:
  1. Click "Send Notification" button
  2. Verify both buttons are disabled during processing
  3. Repeat for "Save as Draft" button
- **Expected Result**: Both buttons disabled during any submission to prevent duplicate requests
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-008
**Test Case**: Schedule Notification
- **Description**: Verify trainer can schedule a notification for future date
- **Pre-conditions**: Trainer is on notification composition page
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

### TC-TRAINER-NOTIF-009
**Test Case**: Target Audience Selection
- **Description**: Verify trainer can select target audience for notifications
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Locate audience selection section
  2. Select specific learners/groups
  3. Verify selections are saved
  4. Submit notification
- **Expected Result**: Notifications are sent to selected audience only
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-NOTIF-010
**Test Case**: Notification Feedback Messages
- **Description**: Verify success and error feedback messages display correctly
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Submit valid notification
  2. Verify success message appears with green checkmark
  3. Trigger error scenario
  4. Verify error message appears with alert icon
  5. Verify messages auto-hide after timeout
- **Expected Result**: Feedback messages display appropriately and auto-hide
- **Priority**: Medium
- **Status**: To Be Tested

---

## Learning Assignment Tool

### TC-TRAINER-ASSIGN-001
**Test Case**: Access Learning Assignment Tool
- **Description**: Verify trainer can access Learning Assignment Tool page
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Navigate to Learning Assignment Tool via menu or dashboard button
  2. Verify page loads successfully
- **Expected Result**: Learning Assignment Tool page displays
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-ASSIGN-002
**Test Case**: View Assignments List
- **Description**: Verify trainer can view list of assignments
- **Pre-conditions**: Trainer is on Learning Assignment Tool page
- **Test Steps**:
  1. View assignments list
  2. Verify assignment details are displayed
  3. Check filters and sorting options
- **Expected Result**: Assignments display with all relevant details
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-ASSIGN-003
**Test Case**: Create New Assignment
- **Description**: Verify trainer can create new assignment
- **Pre-conditions**: Trainer is on Learning Assignment Tool page
- **Test Steps**:
  1. Click "Create Assignment" button
  2. Fill in assignment details
  3. Select target learners/groups
  4. Set due date
  5. Submit assignment
- **Expected Result**: Assignment is created successfully and appears in list
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-ASSIGN-004
**Test Case**: Review Submitted Assignments
- **Description**: Verify trainer can review learner submissions
- **Pre-conditions**:
  - Trainer is on Learning Assignment Tool page
  - Learners have submitted assignments
- **Test Steps**:
  1. Select an assignment with submissions
  2. Click to review submissions
  3. Verify all submitted work is accessible
  4. Provide feedback/grade
- **Expected Result**: Trainer can view, grade, and provide feedback on submissions
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-ASSIGN-005
**Test Case**: Navigate from Dashboard to Assignment Tool
- **Description**: Verify navigation from Dashboard "View in Details" button
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Click "View in Details" button in My Tasks section
  2. Verify successful navigation to Learning Assignment Tool
  3. Verify any relevant task context is preserved
- **Expected Result**: Navigation works correctly, possibly filtering to relevant tasks
- **Priority**: Medium
- **Status**: To Be Tested

---

## Settings

### TC-TRAINER-SETT-001
**Test Case**: Access Settings Page
- **Description**: Verify trainer can access settings page
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Navigate to Settings section
  2. Verify settings page loads
- **Expected Result**: Settings page displays successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-SETT-002
**Test Case**: Profile Picture Display
- **Description**: Verify profile picture displays with proper styling
- **Pre-conditions**:
  - Trainer is on settings page
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

### TC-TRAINER-SETT-003
**Test Case**: Profile Picture Dark Mode
- **Description**: Verify profile picture styling in dark mode
- **Pre-conditions**:
  - Trainer is on settings page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check profile picture section
  3. Verify no background color in dark mode
  4. Verify border color is visible in dark mode
- **Expected Result**: Profile picture has no background color and appropriate border in dark mode
- **Priority**: Low
- **Status**: To Be Tested

### TC-TRAINER-SETT-004
**Test Case**: Update Profile Information
- **Description**: Verify trainer can update profile information
- **Pre-conditions**: Trainer is on settings page
- **Test Steps**:
  1. Modify profile fields (name, email, etc.)
  2. Click "Save" button
  3. Verify success message
  4. Reload page and verify changes persisted
- **Expected Result**: Profile information updates successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-SETT-005
**Test Case**: Account Settings Cancel Button
- **Description**: Verify Cancel button has proper size and styling
- **Pre-conditions**: Trainer is on AccountSettings page
- **Test Steps**:
  1. Locate Cancel button
  2. Compare height with adjacent button (Save)
  3. Verify button dimensions are consistent
- **Expected Result**: Cancel button height matches other buttons, not oversized
- **Priority**: Low
- **Status**: To Be Tested

---

## Dark Mode

### TC-TRAINER-DARK-001
**Test Case**: Toggle Dark Mode
- **Description**: Verify trainer can toggle dark mode on/off
- **Pre-conditions**: Trainer is logged in
- **Test Steps**:
  1. Locate dark mode toggle switch
  2. Click to enable dark mode
  3. Verify entire interface switches to dark theme
  4. Click again to disable dark mode
  5. Verify interface returns to light theme
- **Expected Result**: Dark mode toggles successfully with all UI elements updating
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DARK-002
**Test Case**: Dashboard Dark Mode Colors
- **Description**: Verify all dashboard elements have proper dark mode colors
- **Pre-conditions**:
  - Trainer is on dashboard
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check background colors of cards, charts, tables
  3. Verify text colors are readable
  4. Check border colors
  5. Verify date selector popup colors
- **Expected Result**: All elements have appropriate dark mode styling with good contrast
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DARK-003
**Test Case**: Notification Form Dark Mode
- **Description**: Verify notification form elements in dark mode
- **Pre-conditions**:
  - Trainer is on notification composition page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check input field backgrounds (should not be pure black)
  3. Verify text visibility
  4. Check button colors
- **Expected Result**: Form elements have proper dark mode colors with good visibility
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-DARK-004
**Test Case**: Dark Mode Persistence
- **Description**: Verify dark mode preference is saved across sessions
- **Pre-conditions**: None
- **Test Steps**:
  1. Login as trainer
  2. Enable dark mode
  3. Logout
  4. Login again
  5. Verify dark mode is still enabled
- **Expected Result**: Dark mode preference persists across login sessions
- **Priority**: Low
- **Status**: To Be Tested

---

## UI/UX Elements

### TC-TRAINER-UI-001
**Test Case**: Course Cards Display
- **Description**: Verify course cards display correctly with all elements
- **Pre-conditions**: Trainer can view course listings
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

### TC-TRAINER-UI-002
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

### TC-TRAINER-UI-003
**Test Case**: Responsive Design - Dashboard
- **Description**: Verify dashboard is responsive on different screen sizes
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Resize browser to tablet size (768-1200px)
  2. Verify stats grid adjusts to 2 columns
  3. Resize to mobile size (<768px)
  4. Verify stats grid adjusts to 1 column
  5. Check chart displays properly on all sizes
  6. Verify tasks table is scrollable on small screens
- **Expected Result**: Dashboard layout adapts appropriately to screen size
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-UI-004
**Test Case**: Chart Hover Animation
- **Description**: Verify smooth animations on chart data point hover
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Hover over chart data points
  2. Verify smooth scale-up animation
  3. Verify drop shadow effect
  4. Check transition smoothness
- **Expected Result**: Data points scale smoothly with drop shadow on hover
- **Priority**: Low
- **Status**: To Be Tested

### TC-TRAINER-UI-005
**Test Case**: Task Status Indicators
- **Description**: Verify task status badges display correctly
- **Pre-conditions**: Trainer has tasks with different statuses
- **Test Steps**:
  1. View My Tasks section
  2. Check status badges (Pending, Urgent, Completed, etc.)
  3. Verify color coding matches status type
  4. Check in both light and dark modes
- **Expected Result**: Status badges are color-coded appropriately and visible in both modes
- **Priority**: Medium
- **Status**: To Be Tested

---

## Performance & Edge Cases

### TC-TRAINER-PERF-001
**Test Case**: Large Dataset Handling
- **Description**: Verify system handles large amounts of data efficiently
- **Pre-conditions**: Trainer has many courses, learners, and tasks
- **Test Steps**:
  1. Load dashboard with large dataset
  2. Measure page load time
  3. Check chart rendering performance
  4. Verify smooth interactions
- **Expected Result**: Page loads within acceptable time (<3 seconds), smooth interactions
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-PERF-002
**Test Case**: Concurrent Notification Submissions
- **Description**: Verify system handles rapid button clicks appropriately
- **Pre-conditions**: Trainer is on notification composition page
- **Test Steps**:
  1. Fill notification form
  2. Rapidly click "Send Notification" multiple times
  3. Verify only one request is processed (buttons disabled)
- **Expected Result**: Buttons disable immediately, preventing duplicate submissions
- **Priority**: High
- **Status**: To Be Tested

### TC-TRAINER-PERF-003
**Test Case**: Chart Performance with Large Dataset
- **Description**: Verify chart renders efficiently with many data points
- **Pre-conditions**: Learning hours data spans many weeks
- **Test Steps**:
  1. Load dashboard with extensive time range
  2. Check chart rendering time
  3. Test hover interactions
  4. Verify tooltips respond quickly
- **Expected Result**: Chart renders smoothly, tooltips respond without lag
- **Priority**: Medium
- **Status**: To Be Tested

---

## Integration

### TC-TRAINER-INTG-001
**Test Case**: Dashboard to Assignment Tool Navigation
- **Description**: Verify seamless navigation between dashboard and assignment tool
- **Pre-conditions**: Trainer is on dashboard
- **Test Steps**:
  1. Click "View in Details" from My Tasks
  2. Perform actions in Assignment Tool
  3. Navigate back to dashboard
  4. Verify dashboard data updates if changes were made
- **Expected Result**: Navigation is seamless, data stays synchronized
- **Priority**: Medium
- **Status**: To Be Tested

### TC-TRAINER-INTG-002
**Test Case**: Notification Impact on Dashboard
- **Description**: Verify sent notifications appear in dashboard statistics
- **Pre-conditions**: Trainer sends a notification
- **Test Steps**:
  1. Send a notification from Marketing/Notification page
  2. Return to dashboard
  3. Check if notification count/stats updated
- **Expected Result**: Dashboard reflects newly sent notification
- **Priority**: Low
- **Status**: To Be Tested

---

## Summary Statistics
- **Total Test Cases**: 51
- **High Priority**: 19
- **Medium Priority**: 26
- **Low Priority**: 6
- **Status**: All To Be Tested

---

## Notes
- All test cases should be executed in both light and dark modes where applicable
- Cross-browser testing recommended: Chrome, Firefox, Safari, Edge
- Mobile responsiveness should be verified for all critical features
- Trainer role has additional assignment management functionality compared to other roles
- Navigation between dashboard and assignment tool should be tested thoroughly
- Automated testing scripts can be developed based on these test cases
