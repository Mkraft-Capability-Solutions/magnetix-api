-- =============================================
-- Sample ILT Resource Data
-- Creates sample locations, rooms, and trainers for testing
-- =============================================

-- =============================================
-- LOCATIONS
-- =============================================

INSERT INTO training_locations (name, city, state, country, address, zip_code, email, phone, capacity, timezone, manager, facilities, status, created_at, updated_at) VALUES
('New York Training Center', 'New York', 'NY', 'USA', '123 Broadway Street, Suite 500', '10001', 'nytraining@company.com', '+1 (212) 555-0100', 150, 'EST', 'John Smith', '["Parking", "WiFi", "Cafeteria", "AV Equipment", "Reception"]', 'Active', NOW(), NOW()),
('San Francisco Hub', 'San Francisco', 'CA', 'USA', '456 Market Street, Floor 8', '94102', 'sfhub@company.com', '+1 (415) 555-0200', 120, 'PST', 'Sarah Johnson', '["Parking", "WiFi", "Catering", "Security", "Accessible"]', 'Active', NOW(), NOW()),
('Chicago Learning Center', 'Chicago', 'IL', 'USA', '789 Michigan Avenue', '60601', 'chicago@company.com', '+1 (312) 555-0300', 100, 'CST', 'Michael Brown', '["WiFi", "Cafeteria", "AV Equipment", "Reception"]', 'Active', NOW(), NOW()),
('Austin Tech Campus', 'Austin', 'TX', 'USA', '321 Congress Avenue', '78701', 'austin@company.com', '+1 (512) 555-0400', 80, 'CST', 'Emily Davis', '["Parking", "WiFi", "Cafeteria", "Security"]', 'Active', NOW(), NOW());

-- =============================================
-- ROOMS
-- =============================================

-- New York Training Center Rooms
INSERT INTO training_rooms (name, room_number, location_id, floor, type, capacity, area, description, amenities, status, created_at, updated_at) VALUES
('Executive Board Room', 'A101', 1, '1st Floor', 'Conference', 30, '1200 sq ft', 'Large conference room with video conferencing capabilities', '["Projector", "Whiteboard", "WiFi", "Video Conferencing", "Air Conditioning"]', 'Active', NOW(), NOW()),
('Innovation Lab', 'A201', 1, '2nd Floor', 'Lab', 25, '1500 sq ft', 'Hands-on lab with computers and technical equipment', '["Computers", "WiFi", "Projector", "Whiteboard", "Air Conditioning"]', 'Active', NOW(), NOW()),
('Training Room Alpha', 'A301', 1, '3rd Floor', 'Classroom', 40, '1800 sq ft', 'Standard classroom setup for training sessions', '["Projector", "Whiteboard", "WiFi", "Air Conditioning", "Catering Available"]', 'Active', NOW(), NOW()),
('Virtual Meeting Space', 'A401', 1, '4th Floor', 'Virtual', 50, '800 sq ft', 'Dedicated space for virtual training sessions', '["Video Conferencing", "WiFi", "Streaming Equipment", "Whiteboard"]', 'Active', NOW(), NOW()),

-- San Francisco Hub Rooms
('Bay View Conference', 'B101', 2, '8th Floor', 'Conference', 20, '1000 sq ft', 'Modern conference room with bay views', '["Projector", "Whiteboard", "WiFi", "Video Conferencing", "Air Conditioning"]', 'Active', NOW(), NOW()),
('Tech Lab One', 'B102', 2, '8th Floor', 'Lab', 20, '1200 sq ft', 'Technology lab for hands-on training', '["Computers", "WiFi", "Projector", "Air Conditioning"]', 'Active', NOW(), NOW()),
('Collaboration Space', 'B201', 2, '9th Floor', 'Classroom', 35, '1600 sq ft', 'Open collaboration and training space', '["Projector", "Whiteboard", "WiFi", "Catering Available", "Air Conditioning"]', 'Active', NOW(), NOW()),

-- Chicago Learning Center Rooms
('Great Lakes Room', 'C101', 3, 'Ground Floor', 'Conference', 25, '1100 sq ft', 'Professional conference room', '["Projector", "Whiteboard", "WiFi", "Video Conferencing"]', 'Active', NOW(), NOW()),
('Digital Learning Lab', 'C201', 3, '2nd Floor', 'Lab', 30, '1400 sq ft', 'Fully equipped digital learning laboratory', '["Computers", "WiFi", "Projector", "Whiteboard", "Air Conditioning"]', 'Active', NOW(), NOW()),
('Training Suite', 'C301', 3, '3rd Floor', 'Classroom', 35, '1700 sq ft', 'Versatile training suite', '["Projector", "Whiteboard", "WiFi", "Catering Available", "Air Conditioning"]', 'Active', NOW(), NOW()),

-- Austin Tech Campus Rooms
('Innovation Hub', 'D101', 4, '1st Floor', 'Conference', 18, '900 sq ft', 'Creative conference space', '["Projector", "Whiteboard", "WiFi", "Video Conferencing"]', 'Active', NOW(), NOW()),
('Tech Workshop', 'D102', 4, '1st Floor', 'Lab', 15, '1000 sq ft', 'Hands-on technical workshop space', '["Computers", "WiFi", "Projector", "Whiteboard"]', 'Active', NOW(), NOW()),
('Learning Studio', 'D201', 4, '2nd Floor', 'Classroom', 28, '1300 sq ft', 'Modern learning studio', '["Projector", "Whiteboard", "WiFi", "Air Conditioning", "Catering Available"]', 'Active', NOW(), NOW());

-- =============================================
-- TRAINERS
-- =============================================

-- Note: These trainers need to reference existing instructor users (role_id=2)
-- First, let's find the instructor user UUID
-- Assuming instructor@milekraft.com exists with UUID: b4147cae-e2df-4bdb-9651-4569b100fb51

INSERT INTO trainers (user_id, bio, expertise, certifications, experience, rate, availability, languages, status, initials, color, created_at, updated_at) VALUES
(
  'b4147cae-e2df-4bdb-9651-4569b100fb51',
  'Experienced instructor specializing in leadership development and design thinking. Over 10 years of experience training professionals across various industries.',
  '["Leadership", "Project Management", "Agile", "Change Management"]',
  '["Certified Scrum Master", "PMP", "Leadership Coach"]',
  10,
  150,
  'Full-Time',
  '["English", "Spanish"]',
  'Active',
  'IN',
  '#9C27B0',
  NOW(),
  NOW()
);

-- You can add more trainers by inserting additional instructor users first, then creating trainer profiles
-- Example for additional trainers (commented out - uncomment and update user_id after creating instructor users):

/*
-- Create instructor user first, then add trainer record:
INSERT INTO trainers (user_id, bio, expertise, certifications, experience, rate, availability, languages, status, initials, color, created_at, updated_at) VALUES
(
  'USER_UUID_HERE',
  'Data Science expert with a passion for teaching analytics and machine learning.',
  '["Data Science", "Technical Skills", "Communication"]',
  '["Data Science Professional", "Machine Learning Specialist"]',
  8,
  175,
  'Part-Time',
  '["English", "French"]',
  'Active',
  'DS',
  '#2196F3',
  NOW(),
  NOW()
);

INSERT INTO trainers (user_id, bio, expertise, certifications, experience, rate, availability, languages, status, initials, color, created_at, updated_at) VALUES
(
  'USER_UUID_HERE',
  'Sales training specialist focused on customer success and relationship building.',
  '["Sales Training", "Customer Success", "Communication"]',
  '["Certified Sales Professional", "Customer Success Manager"]',
  6,
  125,
  'Contract',
  '["English"]',
  'Active',
  'ST',
  '#4CAF50',
  NOW(),
  NOW()
);
*/

-- =============================================
-- Verification Queries
-- =============================================

-- Check inserted data:
SELECT 'Locations created:' as info, COUNT(*) as count FROM training_locations WHERE is_deleted = 0;
SELECT 'Rooms created:' as info, COUNT(*) as count FROM training_rooms WHERE is_deleted = 0;
SELECT 'Trainers created:' as info, COUNT(*) as count FROM trainers WHERE is_deleted = 0;

-- View locations with room count:
SELECT
  l.id,
  l.name,
  l.city,
  l.state,
  COUNT(r.id) as room_count,
  l.capacity,
  l.status
FROM training_locations l
LEFT JOIN training_rooms r ON l.id = r.location_id AND r.is_deleted = 0
WHERE l.is_deleted = 0
GROUP BY l.id;

-- View all rooms by location:
SELECT
  l.name as location_name,
  r.name as room_name,
  r.room_number,
  r.type,
  r.capacity,
  r.status
FROM training_rooms r
INNER JOIN training_locations l ON r.location_id = l.id
WHERE r.is_deleted = 0 AND l.is_deleted = 0
ORDER BY l.name, r.room_number;

-- View all trainers:
SELECT
  t.id,
  CONCAT(i.first_name, ' ', i.last_name) as name,
  u.email,
  t.experience,
  t.rate,
  t.availability,
  t.status
FROM trainers t
INNER JOIN users u ON t.user_id = u.uuid
INNER JOIN instructors i ON u.uuid = i.user_id
WHERE t.is_deleted = 0;
