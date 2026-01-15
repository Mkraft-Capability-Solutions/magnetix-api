# Test Cases - Super Admin Role

## Document Information
- **Project**: LXP-Enterprise (Magnetix LMS)
- **Role**: Super Admin
- **Version**: 1.0
- **Last Updated**: 2026-01-10

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Dashboard](#dashboard)
3. [User Management](#user-management)
4. [Organization Management](#organization-management)
5. [Marketing & Notifications](#marketing--notifications)
6. [System Configuration](#system-configuration)
7. [Reports & Analytics](#reports--analytics)
8. [Settings](#settings)
9. [Dark Mode](#dark-mode)
10. [UI/UX Elements](#uiux-elements)

---

## Authentication & Authorization

### TC-SADMIN-AUTH-001
**Test Case**: Super Admin Login
- **Description**: Verify super admin user can successfully log in to the system
- **Pre-conditions**:
  - Super admin account exists in the system
  - User is on the login page
- **Test Steps**:
  1. Enter valid super admin credentials
  2. Click "Login" button
  3. Verify redirection to super admin dashboard
- **Expected Result**: Super admin is successfully logged in and redirected to dashboard
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-AUTH-002
**Test Case**: Super Admin Logout
- **Description**: Verify super admin can successfully log out from the system
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Click on user profile/header dropdown
  2. Click "Sign Out" button
  3. Verify loading spinner appears on logout button
  4. Verify redirection to login page
- **Expected Result**:
  - Loading spinner appears for minimum time
  - Super admin is logged out successfully
  - Redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-AUTH-003
**Test Case**: Prevent Access to Logged-in Pages After Logout
- **Description**: Verify browser back button cannot access logged-in pages after logout
- **Pre-conditions**: Super admin has logged out
- **Test Steps**:
  1. After logout, click browser back button
  2. Attempt to access any super admin dashboard page
- **Expected Result**: User remains on login page or is redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-AUTH-004
**Test Case**: Prevent Access to Public Pages When Logged In
- **Description**: Verify logged-in super admin cannot navigate back to landing/login pages
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Click browser back button
  2. Try to manually navigate to /login or landing page
- **Expected Result**: Super admin remains within logged-in pages, cannot access public pages
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-AUTH-005
**Test Case**: Navigate to Landing Page After Logout
- **Description**: Verify clicking back button on login page (after logout) goes to landing page
- **Pre-conditions**:
  - Super admin has logged out
  - Currently on login page
- **Test Steps**:
  1. From login page, click browser back button
- **Expected Result**: User is redirected to landing page
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-AUTH-006
**Test Case**: Role-based Access Control
- **Description**: Verify super admin has access to all system features
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to various sections (user management, system config, etc.)
  2. Verify all super admin features are accessible
  3. Test that super admin can perform all administrative actions
- **Expected Result**: Super admin has unrestricted access to all system features
- **Priority**: High
- **Status**: To Be Tested

---

## Dashboard

### TC-SADMIN-DASH-001
**Test Case**: Dashboard Loading
- **Description**: Verify super admin dashboard loads with all components
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to super admin dashboard
  2. Verify all sections load: stats cards, charts, user metrics, system health
- **Expected Result**: Dashboard displays all sections with correct system-wide data
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-DASH-002
**Test Case**: System Statistics Cards
- **Description**: Verify system-wide statistics display correctly
- **Pre-conditions**: Super admin is on dashboard
- **Test Steps**:
  1. Verify all stat cards are visible
  2. Check metrics like total users, organizations, courses
  3. Verify system health indicators
  4. Check percentage changes and trends
- **Expected Result**: All statistics cards show accurate system-wide data
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-DASH-003
**Test Case**: Learning Hours Chart Display
- **Description**: Verify system-wide learning hours line chart displays correctly
- **Pre-conditions**:
  - Super admin is on dashboard
  - Learning hours data exists across system
- **Test Steps**:
  1. Locate Learning Hours section
  2. Verify line chart is visible
  3. Verify chart has data points
  4. Verify X-axis and Y-axis labels
- **Expected Result**: Chart displays with proper system-wide data visualization
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-DASH-004
**Test Case**: Chart Tooltip on Hover
- **Description**: Verify tooltip appears on hovering over chart data points
- **Pre-conditions**: Super admin is on dashboard with learning hours chart visible
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

### TC-SADMIN-DASH-005
**Test Case**: Chart Tooltip Dark Mode
- **Description**: Verify tooltip styling in dark mode
- **Pre-conditions**:
  - Super admin is on dashboard
  - Dark mode is enabled
- **Test Steps**:
  1. Enable dark mode
  2. Hover over chart data points
  3. Verify tooltip background and text colors match dark theme
- **Expected Result**: Tooltip has proper dark mode styling with appropriate colors
- **Priority**: Low
- **Status**: To Be Tested

### TC-SADMIN-DASH-006
**Test Case**: Organization Overview Section
- **Description**: Verify organization metrics are displayed
- **Pre-conditions**: Multiple organizations exist in system
- **Test Steps**:
  1. Locate organization overview section
  2. Verify organization count and statistics
  3. Check top organizations by activity
- **Expected Result**: Organization overview displays accurate data
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-DASH-007
**Test Case**: User Activity Metrics
- **Description**: Verify user activity metrics are shown
- **Pre-conditions**: System has active users
- **Test Steps**:
  1. View user activity section
  2. Check active users count
  3. Verify user growth trends
  4. Check user role distribution
- **Expected Result**: User activity metrics display accurately
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-DASH-008
**Test Case**: View in Details Button
- **Description**: Verify "View in Details" button navigates to appropriate detailed page
- **Pre-conditions**: Super admin is on dashboard
- **Test Steps**:
  1. Locate "View in Details" button (if applicable to task/section)
  2. Click the button
  3. Verify navigation to detailed view page
- **Expected Result**: Button navigates to correct detailed page with relevant data
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-DASH-009
**Test Case**: Real-time Data Updates
- **Description**: Verify dashboard data updates in real-time or on refresh
- **Pre-conditions**: Super admin is on dashboard
- **Test Steps**:
  1. Note current statistics
  2. Perform action that would change stats (e.g., create user)
  3. Refresh dashboard or wait for auto-update
  4. Verify statistics updated
- **Expected Result**: Dashboard reflects latest system data
- **Priority**: Medium
- **Status**: To Be Tested

---

## User Management

### TC-SADMIN-USER-001
**Test Case**: Access User Management
- **Description**: Verify super admin can access user management section
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to User Management section
  2. Verify user list loads
- **Expected Result**: User management page displays with all users
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-USER-002
**Test Case**: Create New User
- **Description**: Verify super admin can create new users
- **Pre-conditions**: Super admin is in user management section
- **Test Steps**:
  1. Click "Create User" button
  2. Fill in user details (name, email, role, etc.)
  3. Submit form
  4. Verify user appears in list
  5. Verify email notification sent to new user
- **Expected Result**: New user is created successfully and appears in user list
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-USER-003
**Test Case**: Edit User Details
- **Description**: Verify super admin can edit existing user details
- **Pre-conditions**: Users exist in system
- **Test Steps**:
  1. Select a user from the list
  2. Click "Edit" button
  3. Modify user details
  4. Save changes
  5. Verify changes are reflected
- **Expected Result**: User details update successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-USER-004
**Test Case**: Delete User
- **Description**: Verify super admin can delete users
- **Pre-conditions**: User exists that can be deleted
- **Test Steps**:
  1. Select a user
  2. Click "Delete" button
  3. Confirm deletion
  4. Verify user is removed from list
- **Expected Result**: User is deleted successfully (or deactivated based on business logic)
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-USER-005
**Test Case**: Change User Role
- **Description**: Verify super admin can change user roles
- **Pre-conditions**: User exists in system
- **Test Steps**:
  1. Select a user
  2. Navigate to role change option
  3. Select new role (Admin, Trainer, Learner)
  4. Save changes
  5. Verify role change reflected in user profile
- **Expected Result**: User role changes successfully with appropriate permissions
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-USER-006
**Test Case**: Bulk User Actions
- **Description**: Verify super admin can perform bulk actions on users
- **Pre-conditions**: Multiple users exist
- **Test Steps**:
  1. Select multiple users
  2. Choose bulk action (activate, deactivate, assign role, etc.)
  3. Execute action
  4. Verify action applied to all selected users
- **Expected Result**: Bulk action completes successfully for all selected users
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-USER-007
**Test Case**: Search and Filter Users
- **Description**: Verify super admin can search and filter user list
- **Pre-conditions**: Multiple users exist
- **Test Steps**:
  1. Use search bar to find user by name/email
  2. Apply filters (role, status, organization)
  3. Verify filtered results are accurate
- **Expected Result**: Search and filters work correctly, showing relevant users
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-USER-008
**Test Case**: View User Activity History
- **Description**: Verify super admin can view user activity logs
- **Pre-conditions**: User has activity history
- **Test Steps**:
  1. Select a user
  2. Navigate to activity history
  3. Verify login history, course activity, etc.
- **Expected Result**: User activity history displays comprehensively
- **Priority**: Medium
- **Status**: To Be Tested

---

## Organization Management

### TC-SADMIN-ORG-001
**Test Case**: Access Organization Management
- **Description**: Verify super admin can access organization management
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to Organization Management section
  2. Verify organization list loads
- **Expected Result**: Organization management page displays
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-ORG-002
**Test Case**: Create New Organization
- **Description**: Verify super admin can create new organizations
- **Pre-conditions**: Super admin is in organization management
- **Test Steps**:
  1. Click "Create Organization" button
  2. Fill in organization details
  3. Configure organization settings
  4. Submit form
  5. Verify organization appears in list
- **Expected Result**: New organization is created successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-ORG-003
**Test Case**: Edit Organization Details
- **Description**: Verify super admin can edit organization details
- **Pre-conditions**: Organization exists
- **Test Steps**:
  1. Select an organization
  2. Click "Edit" button
  3. Modify organization details
  4. Save changes
  5. Verify changes are reflected
- **Expected Result**: Organization details update successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-ORG-004
**Test Case**: Assign Users to Organization
- **Description**: Verify super admin can assign users to organizations
- **Pre-conditions**: Organization and users exist
- **Test Steps**:
  1. Select an organization
  2. Navigate to user assignment section
  3. Select users to assign
  4. Confirm assignment
  5. Verify users are associated with organization
- **Expected Result**: Users are successfully assigned to organization
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-ORG-005
**Test Case**: Configure Organization Settings
- **Description**: Verify super admin can configure org-specific settings
- **Pre-conditions**: Organization exists
- **Test Steps**:
  1. Select an organization
  2. Navigate to settings
  3. Configure branding, features, limits
  4. Save settings
  5. Verify settings apply to organization
- **Expected Result**: Organization-specific settings are saved and applied
- **Priority**: Medium
- **Status**: To Be Tested

---

## Marketing & Notifications

### TC-SADMIN-NOTIF-001
**Test Case**: Access Marketing & Notification Page
- **Description**: Verify super admin can access marketing/notification creation page
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to Marketing/Notification section
  2. Click on "Compose Notification" or similar option
- **Expected Result**: Notification composition page loads successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-002
**Test Case**: Notification Form Input Fields
- **Description**: Verify all input fields are functional and properly styled
- **Pre-conditions**: Super admin is on notification composition page
- **Test Steps**:
  1. Click on "Notification Title" input field
  2. Verify background color is appropriate (not black)
  3. Click on "Message" text area
  4. Verify background color is appropriate (not black)
  5. Test in both light and dark modes
- **Expected Result**: Input fields have proper background colors in both light and dark modes
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-003
**Test Case**: Send Notification Button
- **Description**: Verify "Send Notification" button is present and functional
- **Pre-conditions**: Super admin is on notification composition page
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

### TC-SADMIN-NOTIF-004
**Test Case**: Save as Draft Button
- **Description**: Verify "Save as Draft" button is present and functional
- **Pre-conditions**: Super admin is on notification composition page
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

### TC-SADMIN-NOTIF-005
**Test Case**: Notification Title Validation
- **Description**: Verify validation when notification title is empty
- **Pre-conditions**: Super admin is on notification composition page
- **Test Steps**:
  1. Leave notification title empty
  2. Fill in message content
  3. Click "Send Notification" or "Save as Draft"
- **Expected Result**: Error message displays: "Please enter a notification title"
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-006
**Test Case**: System-wide Notification
- **Description**: Verify super admin can send system-wide notifications
- **Pre-conditions**: Super admin is on notification composition page
- **Test Steps**:
  1. Fill in notification details
  2. Select "All Users" or "System-wide" option
  3. Send notification
  4. Verify all users receive notification
- **Expected Result**: Notification is sent to all users in the system
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-007
**Test Case**: Organization-specific Notification
- **Description**: Verify super admin can send notifications to specific organizations
- **Pre-conditions**: Multiple organizations exist
- **Test Steps**:
  1. Create notification
  2. Select specific organization(s)
  3. Send notification
  4. Verify only selected organization users receive it
- **Expected Result**: Notification targets correct organization(s)
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-008
**Test Case**: Button Disabled States
- **Description**: Verify buttons are disabled during submission
- **Pre-conditions**: Super admin is on notification composition page with valid data
- **Test Steps**:
  1. Click "Send Notification" button
  2. Verify both buttons are disabled during processing
  3. Repeat for "Save as Draft" button
- **Expected Result**: Both buttons disabled during any submission to prevent duplicate requests
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-NOTIF-009
**Test Case**: Schedule System Announcement
- **Description**: Verify super admin can schedule system announcements
- **Pre-conditions**: Super admin is on notification composition page
- **Test Steps**:
  1. Create notification
  2. Select "Scheduled" option
  3. Choose future date and time
  4. Submit notification
  5. Verify scheduled status
- **Expected Result**: Notification is scheduled for future delivery
- **Priority**: Medium
- **Status**: To Be Tested
- **Note**: Automatic sending requires backend cron job implementation

### TC-SADMIN-NOTIF-010
**Test Case**: View Notification History
- **Description**: Verify super admin can view all sent notifications
- **Pre-conditions**: Notifications have been sent
- **Test Steps**:
  1. Navigate to notification history
  2. View list of sent notifications
  3. Check details: recipients, send date, status
- **Expected Result**: Complete notification history is accessible
- **Priority**: Medium
- **Status**: To Be Tested

---

## System Configuration

### TC-SADMIN-CONFIG-001
**Test Case**: Access System Configuration
- **Description**: Verify super admin can access system configuration
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to System Configuration section
  2. Verify configuration options are available
- **Expected Result**: System configuration page loads successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-CONFIG-002
**Test Case**: Update System Settings
- **Description**: Verify super admin can update system-wide settings
- **Pre-conditions**: Super admin is in system configuration
- **Test Steps**:
  1. Modify system settings (email config, security settings, etc.)
  2. Save changes
  3. Verify settings are applied
  4. Test affected functionality
- **Expected Result**: System settings update successfully and take effect
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-CONFIG-003
**Test Case**: Configure Email Templates
- **Description**: Verify super admin can configure email templates
- **Pre-conditions**: Super admin is in system configuration
- **Test Steps**:
  1. Navigate to email templates
  2. Edit template content
  3. Save changes
  4. Trigger email to test template
- **Expected Result**: Email templates update and emails use new templates
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-CONFIG-004
**Test Case**: Manage Feature Flags
- **Description**: Verify super admin can enable/disable system features
- **Pre-conditions**: Super admin is in system configuration
- **Test Steps**:
  1. Navigate to feature flags
  2. Toggle features on/off
  3. Save changes
  4. Verify features are enabled/disabled system-wide
- **Expected Result**: Feature flags control feature availability correctly
- **Priority**: Medium
- **Status**: To Be Tested

---

## Reports & Analytics

### TC-SADMIN-REPORT-001
**Test Case**: Access Reports Dashboard
- **Description**: Verify super admin can access reports and analytics
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to Reports/Analytics section
  2. Verify reports dashboard loads
- **Expected Result**: Reports dashboard displays with various report options
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-REPORT-002
**Test Case**: Generate User Activity Report
- **Description**: Verify super admin can generate user activity reports
- **Pre-conditions**: Super admin is in reports section
- **Test Steps**:
  1. Select "User Activity Report"
  2. Choose date range
  3. Generate report
  4. Verify report contains accurate data
- **Expected Result**: User activity report generates with correct data
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-REPORT-003
**Test Case**: Export Reports
- **Description**: Verify super admin can export reports in various formats
- **Pre-conditions**: Report is generated
- **Test Steps**:
  1. Generate a report
  2. Click "Export" button
  3. Select format (CSV, PDF, Excel)
  4. Download report
  5. Verify file contains correct data
- **Expected Result**: Report exports successfully in selected format
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-REPORT-004
**Test Case**: View System Analytics
- **Description**: Verify super admin can view comprehensive system analytics
- **Pre-conditions**: System has usage data
- **Test Steps**:
  1. Navigate to analytics dashboard
  2. View various metrics and charts
  3. Filter by date range, organization, etc.
  4. Verify data accuracy
- **Expected Result**: Analytics provide comprehensive system insights
- **Priority**: High
- **Status**: To Be Tested

---

## Settings

### TC-SADMIN-SETT-001
**Test Case**: Access Settings Page
- **Description**: Verify super admin can access settings page
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to Settings section
  2. Verify settings page loads
- **Expected Result**: Settings page displays successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-SETT-002
**Test Case**: Profile Picture Display
- **Description**: Verify profile picture displays with proper styling
- **Pre-conditions**:
  - Super admin is on settings page
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

### TC-SADMIN-SETT-003
**Test Case**: Profile Picture Dark Mode
- **Description**: Verify profile picture styling in dark mode
- **Pre-conditions**:
  - Super admin is on settings page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check profile picture section
  3. Verify no background color in dark mode
  4. Verify border color is visible in dark mode
- **Expected Result**: Profile picture has no background color and appropriate border in dark mode
- **Priority**: Low
- **Status**: To Be Tested

### TC-SADMIN-SETT-004
**Test Case**: Update Profile Information
- **Description**: Verify super admin can update profile information
- **Pre-conditions**: Super admin is on settings page
- **Test Steps**:
  1. Modify profile fields
  2. Click "Save" button
  3. Verify success message
  4. Reload page and verify changes persisted
- **Expected Result**: Profile information updates successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-SETT-005
**Test Case**: Account Settings Cancel Button
- **Description**: Verify Cancel button has proper size and styling
- **Pre-conditions**: Super admin is on AccountSettings page
- **Test Steps**:
  1. Locate Cancel button
  2. Compare height with adjacent button
  3. Verify button dimensions are consistent
- **Expected Result**: Cancel button height matches other buttons, not oversized
- **Priority**: Low
- **Status**: To Be Tested

---

## Dark Mode

### TC-SADMIN-DARK-001
**Test Case**: Toggle Dark Mode
- **Description**: Verify super admin can toggle dark mode on/off
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Locate dark mode toggle switch
  2. Click to enable dark mode
  3. Verify entire interface switches to dark theme
  4. Click again to disable dark mode
  5. Verify interface returns to light theme
- **Expected Result**: Dark mode toggles successfully with all UI elements updating
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-DARK-002
**Test Case**: Dashboard Dark Mode Colors
- **Description**: Verify all dashboard elements have proper dark mode colors
- **Pre-conditions**:
  - Super admin is on dashboard
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check background colors of cards, charts, tables
  3. Verify text colors are readable
  4. Check border colors
- **Expected Result**: All elements have appropriate dark mode styling with good contrast
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-DARK-003
**Test Case**: User Management Dark Mode
- **Description**: Verify user management interface in dark mode
- **Pre-conditions**: Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Navigate to user management
  3. Check table styling
  4. Verify form inputs have proper colors
  5. Check modal dialogs
- **Expected Result**: User management interface has proper dark mode styling
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-DARK-004
**Test Case**: Notification Form Dark Mode
- **Description**: Verify notification form elements in dark mode
- **Pre-conditions**:
  - Super admin is on notification composition page
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

### TC-SADMIN-UI-001
**Test Case**: Course Cards Display (System-wide View)
- **Description**: Verify course cards display correctly when viewing all courses
- **Pre-conditions**: Super admin can view system-wide course listings
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

### TC-SADMIN-UI-002
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

### TC-SADMIN-UI-003
**Test Case**: Responsive Design - Dashboard
- **Description**: Verify dashboard is responsive on different screen sizes
- **Pre-conditions**: Super admin is on dashboard
- **Test Steps**:
  1. Resize browser to tablet size (768-1200px)
  2. Verify layout adjusts appropriately
  3. Resize to mobile size (<768px)
  4. Verify mobile layout is functional
  5. Check all critical features remain accessible
- **Expected Result**: Dashboard layout adapts appropriately to screen size
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-UI-004
**Test Case**: Chart Hover Animation
- **Description**: Verify smooth animations on chart data point hover
- **Pre-conditions**: Super admin is on dashboard
- **Test Steps**:
  1. Hover over chart data points
  2. Verify smooth scale-up animation
  3. Verify drop shadow effect
  4. Check transition smoothness
- **Expected Result**: Data points scale smoothly with drop shadow on hover
- **Priority**: Low
- **Status**: To Be Tested

### TC-SADMIN-UI-005
**Test Case**: Complex Table Interactions
- **Description**: Verify tables with many rows are functional
- **Pre-conditions**: Large dataset exists (users, organizations, etc.)
- **Test Steps**:
  1. View table with many rows
  2. Test sorting by columns
  3. Test pagination
  4. Test row selection
  5. Verify scroll behavior
- **Expected Result**: Tables handle large datasets efficiently with smooth interactions
- **Priority**: Medium
- **Status**: To Be Tested

---

## Performance & Edge Cases

### TC-SADMIN-PERF-001
**Test Case**: Large Dataset Handling
- **Description**: Verify system handles large amounts of system-wide data efficiently
- **Pre-conditions**: System has extensive data (many users, orgs, courses)
- **Test Steps**:
  1. Load dashboard with large dataset
  2. Measure page load time
  3. Check chart rendering performance
  4. Navigate between sections
- **Expected Result**: Pages load within acceptable time (<3 seconds), smooth interactions
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-PERF-002
**Test Case**: Concurrent Admin Actions
- **Description**: Verify system handles multiple admin actions simultaneously
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Open multiple tabs/windows
  2. Perform different admin actions in each
  3. Verify all actions complete successfully
  4. Check for data conflicts
- **Expected Result**: System handles concurrent admin actions without conflicts
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-PERF-003
**Test Case**: Report Generation Performance
- **Description**: Verify report generation completes in reasonable time
- **Pre-conditions**: Large dataset for reporting
- **Test Steps**:
  1. Generate report with large date range
  2. Measure generation time
  3. Verify report accuracy
  4. Test export functionality
- **Expected Result**: Report generates within acceptable time (< 30 seconds for large datasets)
- **Priority**: Medium
- **Status**: To Be Tested

### TC-SADMIN-EDGE-001
**Test Case**: Handle Maximum Capacity
- **Description**: Verify system behavior at maximum capacity limits
- **Pre-conditions**: System approaching maximum users/orgs
- **Test Steps**:
  1. Attempt to create resources at capacity limit
  2. Verify appropriate error messages
  3. Check system stability
- **Expected Result**: System gracefully handles capacity limits with clear messaging
- **Priority**: Low
- **Status**: To Be Tested

---

## Security & Permissions

### TC-SADMIN-SEC-001
**Test Case**: Audit Log Access
- **Description**: Verify super admin can access comprehensive audit logs
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Navigate to audit logs
  2. View system-wide activity logs
  3. Filter by user, action type, date
  4. Verify log accuracy
- **Expected Result**: Audit logs provide comprehensive system activity history
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-SEC-002
**Test Case**: Data Export Security
- **Description**: Verify exported data includes appropriate security measures
- **Pre-conditions**: Super admin exports sensitive data
- **Test Steps**:
  1. Export user data or reports
  2. Verify sensitive fields are handled appropriately
  3. Check export includes security warnings if applicable
- **Expected Result**: Data exports maintain security and privacy standards
- **Priority**: High
- **Status**: To Be Tested

### TC-SADMIN-SEC-003
**Test Case**: Session Timeout
- **Description**: Verify super admin session times out after inactivity
- **Pre-conditions**: Super admin is logged in
- **Test Steps**:
  1. Login as super admin
  2. Remain inactive for configured timeout period
  3. Attempt to perform action
  4. Verify session expired message
  5. Verify redirect to login
- **Expected Result**: Session times out and requires re-authentication
- **Priority**: Medium
- **Status**: To Be Tested

---

## Summary Statistics
- **Total Test Cases**: 75
- **High Priority**: 35
- **Medium Priority**: 33
- **Low Priority**: 7
- **Status**: All To Be Tested

---

## Notes
- All test cases should be executed in both light and dark modes where applicable
- Cross-browser testing recommended: Chrome, Firefox, Safari, Edge
- Super admin role has the most extensive permissions - thorough security testing is critical
- Performance testing with large datasets is essential for super admin features
- Chart tooltip functionality implemented across all dashboards
- Notification system now includes both "Save as Draft" and "Send Notification" buttons
- Authentication and authorization rules prevent back-navigation to public pages when logged in
- All settings pages unified across roles with proper styling
- Automated testing scripts can be developed based on these test cases
- Security and audit logging should be thoroughly tested
- Data export and reporting features require special attention to performance and accuracy
