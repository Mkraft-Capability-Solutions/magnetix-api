# Test Cases - Trainee/Learner Role

## Document Information
- **Project**: LXP-Enterprise (Magnetix LMS)
- **Role**: Trainee/Learner
- **Version**: 1.0
- **Last Updated**: 2026-01-10

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Dashboard](#dashboard)
3. [Transcript & Analytics](#transcript--analytics)
4. [Course Enrollment & Learning](#course-enrollment--learning)
5. [Assignments & Assessments](#assignments--assessments)
6. [Settings](#settings)
7. [Dark Mode](#dark-mode)
8. [UI/UX Elements](#uiux-elements)

---

## Authentication & Authorization

### TC-LEARNER-AUTH-001
**Test Case**: Learner Login
- **Description**: Verify learner user can successfully log in to the system
- **Pre-conditions**:
  - Learner account exists in the system
  - User is on the login page
- **Test Steps**:
  1. Enter valid learner credentials
  2. Click "Login" button
  3. Verify redirection to learner dashboard
- **Expected Result**: Learner is successfully logged in and redirected to dashboard
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-AUTH-002
**Test Case**: Learner Logout
- **Description**: Verify learner can successfully log out from the system
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Click on user profile/header dropdown
  2. Click "Sign Out" button
  3. Verify loading spinner appears on logout button
  4. Verify redirection to login page
- **Expected Result**:
  - Loading spinner appears for minimum time
  - Learner is logged out successfully
  - Redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-AUTH-003
**Test Case**: Prevent Access to Logged-in Pages After Logout
- **Description**: Verify browser back button cannot access logged-in pages after logout
- **Pre-conditions**: Learner has logged out
- **Test Steps**:
  1. After logout, click browser back button
  2. Attempt to access any learner dashboard page
- **Expected Result**: User remains on login page or is redirected to login page
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-AUTH-004
**Test Case**: Prevent Access to Public Pages When Logged In
- **Description**: Verify logged-in learner cannot navigate back to landing/login pages
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Click browser back button
  2. Try to manually navigate to /login or landing page
- **Expected Result**: Learner remains within logged-in pages, cannot access public pages
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-AUTH-005
**Test Case**: Navigate to Landing Page After Logout
- **Description**: Verify clicking back button on login page (after logout) goes to landing page
- **Pre-conditions**:
  - Learner has logged out
  - Currently on login page
- **Test Steps**:
  1. From login page, click browser back button
- **Expected Result**: User is redirected to landing page
- **Priority**: Medium
- **Status**: To Be Tested

---

## Dashboard

### TC-LEARNER-DASH-001
**Test Case**: Dashboard Loading
- **Description**: Verify learner dashboard loads with all components
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to learner dashboard
  2. Verify all sections load: enrolled courses, progress stats, upcoming assignments
- **Expected Result**: Dashboard displays all sections with correct data
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-DASH-002
**Test Case**: Enrolled Courses Display
- **Description**: Verify enrolled courses are displayed correctly
- **Pre-conditions**:
  - Learner is logged in
  - Learner has enrolled courses
- **Test Steps**:
  1. View enrolled courses section
  2. Verify course cards display with images
  3. Check course titles, progress indicators
  4. Verify "Online" status is visible
- **Expected Result**: All enrolled courses display with accurate information
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-DASH-003
**Test Case**: Progress Statistics Display
- **Description**: Verify learning progress statistics are shown
- **Pre-conditions**: Learner has learning activity
- **Test Steps**:
  1. View progress statistics section
  2. Verify completion percentage
  3. Check learning hours
  4. Verify certificates earned count
- **Expected Result**: Progress statistics display accurately
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-DASH-004
**Test Case**: Upcoming Assignments Display
- **Description**: Verify upcoming assignments are shown
- **Pre-conditions**: Learner has pending assignments
- **Test Steps**:
  1. View upcoming assignments section
  2. Verify assignment names and due dates
  3. Check assignment status indicators
- **Expected Result**: Upcoming assignments display with accurate due dates and status
- **Priority**: High
- **Status**: To Be Tested

---

## Transcript & Analytics

### TC-LEARNER-TRANS-001
**Test Case**: Access Transcript Page
- **Description**: Verify learner can access transcript page
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to Transcript/Modules section
  2. Verify transcript page loads
- **Expected Result**: Transcript page displays successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-TRANS-002
**Test Case**: Completed Courses List
- **Description**: Verify completed courses are listed in transcript
- **Pre-conditions**:
  - Learner is on transcript page
  - Learner has completed courses
- **Test Steps**:
  1. View completed courses section
  2. Verify course names, completion dates
  3. Check grades/scores if applicable
  4. Verify certificates earned
- **Expected Result**: All completed courses display with accurate completion data
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-TRANS-003
**Test Case**: Analytics Statistics Section
- **Description**: Verify Analytics Statistics section displays learning data
- **Pre-conditions**: Learner is on transcript page
- **Test Steps**:
  1. Locate Analytics Statistics section
  2. Verify learning hours chart is present
  3. Check weekly/monthly data visualization
  4. Verify statistics summary
- **Expected Result**: Analytics section shows comprehensive learning statistics
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-TRANS-004
**Test Case**: Learning Hours Line Chart Display
- **Description**: Verify learning hours line chart displays correctly
- **Pre-conditions**:
  - Learner is on transcript page
  - Learning activity data exists
- **Test Steps**:
  1. Locate learning hours line chart
  2. Verify chart has data points
  3. Check X-axis (dates) and Y-axis (hours) labels
  4. Verify chart line is visible and properly styled
- **Expected Result**: Line chart displays with clear visualization of learning hours over time
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-TRANS-005
**Test Case**: Chart Tooltip on Hover
- **Description**: Verify tooltip appears when hovering over chart data points
- **Pre-conditions**: Learner is on transcript page with analytics chart visible
- **Test Steps**:
  1. Hover mouse over any data point on the line chart
  2. Verify tooltip appears showing hours and date
  3. Check tooltip displays "X Hours" and date
  4. Move mouse away from data point
  5. Verify tooltip disappears
- **Expected Result**:
  - Tooltip appears on hover with format: "X Hours" and date
  - Tooltip disappears when mouse moves away
  - Data point scales up smoothly on hover
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-TRANS-006
**Test Case**: Chart Data Points Interactive Hover
- **Description**: Verify chart data points are interactive with visual feedback
- **Pre-conditions**: Learner is on transcript page
- **Test Steps**:
  1. Hover over different data points on the chart
  2. Verify each point scales up on hover
  3. Check for drop shadow effect
  4. Verify cursor changes to pointer
  5. Test smooth transition animations
- **Expected Result**:
  - Data points have pointer cursor
  - Scale animation is smooth (transition: all 0.2s ease)
  - Drop shadow appears on hover
  - Visual feedback is consistent across all points
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-TRANS-007
**Test Case**: Chart Tooltip Dark Mode
- **Description**: Verify chart tooltip has proper dark mode styling
- **Pre-conditions**:
  - Learner is on transcript page
  - Dark mode is enabled
- **Test Steps**:
  1. Enable dark mode
  2. Hover over chart data points
  3. Verify tooltip background color matches dark theme
  4. Check tooltip text color is readable
  5. Verify tooltip border and shadow
- **Expected Result**:
  - Tooltip has dark background (--color-primary-dark)
  - Text is properly colored for dark mode
  - Border and shadow are appropriate
- **Priority**: Low
- **Status**: To Be Tested

### TC-LEARNER-TRANS-008
**Test Case**: Weekly Learning Data Accuracy
- **Description**: Verify weekly learning data is accurate in chart
- **Pre-conditions**:
  - Learner has learning activity over multiple weeks
  - Learner is on transcript page
- **Test Steps**:
  1. View learning hours chart
  2. Hover over data points to see values
  3. Cross-reference with actual learning hours logged
  4. Verify dates correspond to correct weeks
- **Expected Result**: Chart data matches actual learning activity records
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-TRANS-009
**Test Case**: Download Transcript
- **Description**: Verify learner can download transcript
- **Pre-conditions**: Learner is on transcript page
- **Test Steps**:
  1. Locate "Download Transcript" button
  2. Click the button
  3. Verify PDF/document downloads
  4. Check downloaded file contains correct data
- **Expected Result**: Transcript downloads successfully with accurate information
- **Priority**: Medium
- **Status**: To Be Tested

---

## Course Enrollment & Learning

### TC-LEARNER-COURSE-001
**Test Case**: Browse Available Courses
- **Description**: Verify learner can browse available courses
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to course catalog/browse section
  2. Verify courses are displayed
  3. Check filters and search functionality
- **Expected Result**: Course catalog displays with functional filters and search
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-COURSE-002
**Test Case**: Enroll in Course
- **Description**: Verify learner can enroll in a course
- **Pre-conditions**:
  - Learner is logged in
  - Course is available for enrollment
- **Test Steps**:
  1. Select a course
  2. Click "Enroll" button
  3. Confirm enrollment
  4. Verify course appears in enrolled courses
- **Expected Result**: Learner successfully enrolls and course appears in dashboard
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-COURSE-003
**Test Case**: Access Course Content
- **Description**: Verify learner can access enrolled course content
- **Pre-conditions**: Learner is enrolled in a course
- **Test Steps**:
  1. Click on enrolled course
  2. Verify course modules/lessons load
  3. Check video/content playback
  4. Verify navigation between lessons
- **Expected Result**: Course content is accessible and playable
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-COURSE-004
**Test Case**: Course Cards Display
- **Description**: Verify course cards display correctly with all elements
- **Pre-conditions**: Learner can view course listings
- **Test Steps**:
  1. Navigate to page with course cards
  2. Verify circular course image displays properly
  3. Check that content doesn't overflow the circular boundary
  4. Verify "Online" status text is visible in current theme
- **Expected Result**:
  - Course images fit within circular boundary
  - No content overflow from circle
  - "Online" text is clearly visible
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-COURSE-005
**Test Case**: Course Cards Dark Mode
- **Description**: Verify course card elements in dark mode
- **Pre-conditions**: Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. View course cards
  3. Verify "Online" status text color is visible and appropriate for dark mode
  4. Check card border colors (should be light border ~0.5px)
  5. Verify all text elements are readable
- **Expected Result**:
  - "Online" text has appropriate color for dark mode visibility
  - Card borders are visible with light color (~0.5px)
  - All elements have proper contrast
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-COURSE-006
**Test Case**: Course Progress Tracking
- **Description**: Verify course progress is tracked and displayed
- **Pre-conditions**: Learner is enrolled and has made progress in a course
- **Test Steps**:
  1. Complete a lesson/module
  2. Return to course overview
  3. Verify progress percentage updated
  4. Check progress bar reflects completion
- **Expected Result**: Progress is accurately tracked and displayed
- **Priority**: High
- **Status**: To Be Tested

---

## Assignments & Assessments

### TC-LEARNER-ASSIGN-001
**Test Case**: View Assigned Tasks
- **Description**: Verify learner can view assigned tasks/assignments
- **Pre-conditions**:
  - Learner is logged in
  - Assignments have been assigned by trainer
- **Test Steps**:
  1. Navigate to assignments/tasks section
  2. Verify list of assignments displays
  3. Check assignment details: title, due date, status
- **Expected Result**: All assigned tasks display with accurate information
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-ASSIGN-002
**Test Case**: Submit Assignment
- **Description**: Verify learner can submit an assignment
- **Pre-conditions**:
  - Learner has pending assignment
  - Assignment submission is open
- **Test Steps**:
  1. Open assignment
  2. Complete assignment work
  3. Upload files if required
  4. Click "Submit" button
  5. Verify submission confirmation
- **Expected Result**: Assignment submits successfully and status changes to "Submitted"
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-ASSIGN-003
**Test Case**: View Assignment Feedback
- **Description**: Verify learner can view feedback from trainer
- **Pre-conditions**:
  - Learner has submitted assignment
  - Trainer has provided feedback
- **Test Steps**:
  1. Navigate to submitted assignments
  2. Open graded assignment
  3. View feedback comments
  4. Check grade/score if applicable
- **Expected Result**: Feedback and grades are visible and clear
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-ASSIGN-004
**Test Case**: Assignment Due Date Warning
- **Description**: Verify learner sees warnings for approaching due dates
- **Pre-conditions**: Assignment due date is within warning threshold
- **Test Steps**:
  1. View assignments with upcoming due dates
  2. Check for visual indicators (urgent badges, colors)
  3. Verify notifications if applicable
- **Expected Result**: Clear visual warnings for approaching deadlines
- **Priority**: Medium
- **Status**: To Be Tested

---

## Settings

### TC-LEARNER-SETT-001
**Test Case**: Access Settings Page
- **Description**: Verify learner can access settings page
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to Settings section
  2. Verify settings page loads
- **Expected Result**: Settings page displays successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-SETT-002
**Test Case**: Profile Picture Display
- **Description**: Verify profile picture displays with proper styling
- **Pre-conditions**:
  - Learner is on settings page
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

### TC-LEARNER-SETT-003
**Test Case**: Profile Picture Dark Mode
- **Description**: Verify profile picture styling in dark mode
- **Pre-conditions**:
  - Learner is on settings page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check profile picture section
  3. Verify no background color in dark mode
  4. Verify border color is visible in dark mode
- **Expected Result**: Profile picture has no background color and appropriate border in dark mode
- **Priority**: Low
- **Status**: To Be Tested

### TC-LEARNER-SETT-004
**Test Case**: Update Profile Information
- **Description**: Verify learner can update profile information
- **Pre-conditions**: Learner is on settings page
- **Test Steps**:
  1. Modify profile fields (name, email, bio, etc.)
  2. Click "Save" button
  3. Verify success message
  4. Reload page and verify changes persisted
- **Expected Result**: Profile information updates successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-SETT-005
**Test Case**: Account Settings Cancel Button
- **Description**: Verify Cancel button has proper size and styling
- **Pre-conditions**: Learner is on AccountSettings page
- **Test Steps**:
  1. Locate Cancel button
  2. Compare height with adjacent button (Save)
  3. Verify button dimensions are consistent
- **Expected Result**: Cancel button height matches other buttons, not oversized
- **Priority**: Low
- **Status**: To Be Tested

### TC-LEARNER-SETT-006
**Test Case**: Change Password
- **Description**: Verify learner can change password
- **Pre-conditions**: Learner is on settings page
- **Test Steps**:
  1. Navigate to password change section
  2. Enter current password
  3. Enter new password
  4. Confirm new password
  5. Submit changes
  6. Verify success message
- **Expected Result**: Password changes successfully
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-SETT-007
**Test Case**: Notification Preferences
- **Description**: Verify learner can manage notification preferences
- **Pre-conditions**: Learner is on settings page
- **Test Steps**:
  1. Navigate to notification preferences
  2. Toggle various notification types
  3. Save preferences
  4. Verify preferences are saved
- **Expected Result**: Notification preferences update successfully
- **Priority**: Medium
- **Status**: To Be Tested

---

## Dark Mode

### TC-LEARNER-DARK-001
**Test Case**: Toggle Dark Mode
- **Description**: Verify learner can toggle dark mode on/off
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Locate dark mode toggle switch
  2. Click to enable dark mode
  3. Verify entire interface switches to dark theme
  4. Click again to disable dark mode
  5. Verify interface returns to light theme
- **Expected Result**: Dark mode toggles successfully with all UI elements updating
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-DARK-002
**Test Case**: Dashboard Dark Mode Colors
- **Description**: Verify all dashboard elements have proper dark mode colors
- **Pre-conditions**:
  - Learner is on dashboard
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check background colors of course cards, stats sections
  3. Verify text colors are readable
  4. Check border colors on cards
- **Expected Result**: All elements have appropriate dark mode styling with good contrast
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-DARK-003
**Test Case**: Transcript Page Dark Mode
- **Description**: Verify transcript page elements in dark mode
- **Pre-conditions**:
  - Learner is on transcript page
  - Dark mode enabled
- **Test Steps**:
  1. Enable dark mode
  2. Check chart background and colors
  3. Verify tooltip dark mode styling
  4. Check completed courses list styling
  5. Verify all text is readable
- **Expected Result**: Transcript page has proper dark mode colors with good visibility
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-DARK-004
**Test Case**: Dark Mode Persistence
- **Description**: Verify dark mode preference is saved across sessions
- **Pre-conditions**: None
- **Test Steps**:
  1. Login as learner
  2. Enable dark mode
  3. Logout
  4. Login again
  5. Verify dark mode is still enabled
- **Expected Result**: Dark mode preference persists across login sessions
- **Priority**: Low
- **Status**: To Be Tested

---

## UI/UX Elements

### TC-LEARNER-UI-001
**Test Case**: Navigation Menu
- **Description**: Verify navigation menu is accessible and functional
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Click on navigation menu/hamburger icon
  2. Verify all menu items are visible
  3. Test navigation to different sections
  4. Verify menu closes after selection
- **Expected Result**: Navigation menu works smoothly with all links functional
- **Priority**: High
- **Status**: To Be Tested

### TC-LEARNER-UI-002
**Test Case**: Responsive Design - Dashboard
- **Description**: Verify dashboard is responsive on different screen sizes
- **Pre-conditions**: Learner is on dashboard
- **Test Steps**:
  1. Resize browser to tablet size (768-1200px)
  2. Verify course cards adjust layout
  3. Resize to mobile size (<768px)
  4. Verify cards stack vertically
  5. Check all elements remain accessible
- **Expected Result**: Dashboard layout adapts appropriately to screen size
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-UI-003
**Test Case**: Responsive Design - Transcript
- **Description**: Verify transcript page is responsive
- **Pre-conditions**: Learner is on transcript page
- **Test Steps**:
  1. Resize browser to different sizes
  2. Verify chart adapts to screen width
  3. Check table/list layouts on mobile
  4. Verify horizontal scrolling if needed
- **Expected Result**: Transcript page layout adapts appropriately, chart remains readable
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-UI-004
**Test Case**: Loading States
- **Description**: Verify loading indicators appear during data fetching
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to different pages
  2. Verify loading spinners/skeletons appear
  3. Check that content loads after indicators
  4. Verify smooth transitions
- **Expected Result**: Loading states provide clear feedback, no jarring content shifts
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-UI-005
**Test Case**: Chart Animation on Load
- **Description**: Verify chart has smooth animation when first loaded
- **Pre-conditions**: Learner navigates to transcript page
- **Test Steps**:
  1. Navigate to transcript page
  2. Observe chart loading animation
  3. Verify data points appear smoothly
  4. Check line drawing animation if applicable
- **Expected Result**: Chart loads with smooth, professional animations
- **Priority**: Low
- **Status**: To Be Tested

### TC-LEARNER-UI-006
**Test Case**: Empty States
- **Description**: Verify appropriate messages when no data exists
- **Pre-conditions**: New learner with no activity
- **Test Steps**:
  1. Login as new learner
  2. View dashboard with no enrolled courses
  3. Check transcript with no completed courses
  4. View assignments with no tasks
- **Expected Result**: Clear, friendly empty state messages guide learner to take action
- **Priority**: Medium
- **Status**: To Be Tested

---

## Performance & Edge Cases

### TC-LEARNER-PERF-001
**Test Case**: Page Load Performance
- **Description**: Verify pages load within acceptable time
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate to dashboard
  2. Measure load time
  3. Navigate to transcript
  4. Measure load time
  5. Test with various network speeds
- **Expected Result**: Pages load within 3 seconds on normal connection
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-PERF-002
**Test Case**: Chart Performance with Long History
- **Description**: Verify chart performs well with extensive data
- **Pre-conditions**: Learner has learning data spanning many months
- **Test Steps**:
  1. Load transcript page with extensive history
  2. Check chart rendering time
  3. Test hover interactions
  4. Verify smooth scrolling/zooming if applicable
- **Expected Result**: Chart renders smoothly even with many data points
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-PERF-003
**Test Case**: Concurrent Course Access
- **Description**: Verify system handles multiple course tabs open
- **Pre-conditions**: Learner is enrolled in multiple courses
- **Test Steps**:
  1. Open multiple courses in different tabs
  2. Switch between tabs
  3. Verify each maintains state
  4. Check for memory leaks or slowdowns
- **Expected Result**: Multiple course tabs work independently without performance degradation
- **Priority**: Low
- **Status**: To Be Tested

### TC-LEARNER-EDGE-001
**Test Case**: Zero Learning Hours Data
- **Description**: Verify chart handles zero hours gracefully
- **Pre-conditions**: Learner with period of no learning activity
- **Test Steps**:
  1. View transcript for period with no activity
  2. Verify chart shows zero points or appropriate message
  3. Check that chart doesn't break
- **Expected Result**: Chart displays zero values appropriately without errors
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-EDGE-002
**Test Case**: Special Characters in Input
- **Description**: Verify system handles special characters in user input
- **Pre-conditions**: Learner is on settings or submission page
- **Test Steps**:
  1. Enter special characters in text fields
  2. Test various Unicode characters
  3. Submit form
  4. Verify data saves correctly
- **Expected Result**: Special characters are handled properly without errors
- **Priority**: Medium
- **Status**: To Be Tested

---

## Accessibility

### TC-LEARNER-ACCESS-001
**Test Case**: Keyboard Navigation
- **Description**: Verify all functionality is accessible via keyboard
- **Pre-conditions**: Learner is logged in
- **Test Steps**:
  1. Navigate using only Tab and Enter keys
  2. Test all interactive elements
  3. Verify focus indicators are visible
  4. Test form submissions via keyboard
- **Expected Result**: All functionality is accessible without mouse
- **Priority**: Medium
- **Status**: To Be Tested

### TC-LEARNER-ACCESS-002
**Test Case**: Screen Reader Compatibility
- **Description**: Verify pages work with screen readers
- **Pre-conditions**: Screen reader software available
- **Test Steps**:
  1. Enable screen reader
  2. Navigate through pages
  3. Verify meaningful labels and descriptions
  4. Check that chart has text alternative
- **Expected Result**: Content is accessible and understandable via screen reader
- **Priority**: Low
- **Status**: To Be Tested

---

## Summary Statistics
- **Total Test Cases**: 52
- **High Priority**: 21
- **Medium Priority**: 25
- **Low Priority**: 6
- **Status**: All To Be Tested

---

## Notes
- All test cases should be executed in both light and dark modes where applicable
- Cross-browser testing recommended: Chrome, Firefox, Safari, Edge
- Mobile responsiveness is critical for learner experience
- Chart tooltip functionality is a key feature for analytics engagement
- Accessibility testing is important for inclusive learning experience
- Performance testing should simulate various network conditions
- Automated testing scripts can be developed based on these test cases
- Special attention to visual elements like course cards and online status in dark mode
