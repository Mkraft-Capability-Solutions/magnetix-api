-- =============================================
-- Create Dummy Certificates for trainee@example.com
-- User UUID: c4402201-aa6d-45e0-a9a7-9319aa63792c
-- =============================================

USE magnetix_db;

-- Insert certificates for trainee@example.com
INSERT INTO student_certificates
(user_id, certificate_name, organization, issue_date, expiry_date, credential_id, certificate_link, status, issued_by_org)
VALUES
-- Technology Certificates
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'AWS Certified Solutions Architect', 'Amazon Web Services', '2024-06-15', '2027-06-15', 'AWS-SAA-C03-2024-001', 'https://aws.amazon.com/verification', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Google Cloud Professional Developer', 'Google Cloud', '2024-08-20', '2026-08-20', 'GCP-PD-2024-002', 'https://cloud.google.com/certification', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Microsoft Azure Administrator', 'Microsoft', '2024-05-10', '2026-05-10', 'MSFT-AZ-104-2024-003', 'https://learn.microsoft.com/credentials', 'approved', 1),

-- Programming Certificates
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Advanced React Development', 'Meta', '2024-09-01', NULL, 'META-REACT-2024-004', 'https://www.coursera.org/verify', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Python for Data Science', 'IBM', '2024-07-12', NULL, 'IBM-PY-DS-2024-005', 'https://www.ibm.com/verify', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Full Stack JavaScript Developer', 'freeCodeCamp', '2024-04-22', NULL, 'FCC-FSJS-2024-006', 'https://www.freecodecamp.org/certification', 'approved', 1),

-- Security & DevOps Certificates
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Certified Kubernetes Administrator', 'CNCF', '2024-10-05', '2027-10-05', 'CKA-2024-007', 'https://training.linuxfoundation.org/certification/verify', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Docker Certified Associate', 'Docker', '2024-03-18', '2026-03-18', 'DCA-2024-008', 'https://www.docker.com/certification', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Certified Ethical Hacker (CEH)', 'EC-Council', '2024-11-20', '2027-11-20', 'CEH-2024-009', 'https://www.eccouncil.org/verify', 'approved', 1),

-- Database Certificates
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'MongoDB Certified Developer', 'MongoDB University', '2024-02-28', '2026-02-28', 'MONGO-DEV-2024-010', 'https://university.mongodb.com/certification', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Oracle Database Administrator', 'Oracle', '2023-12-10', '2026-12-10', 'OCA-DBA-2023-011', 'https://www.oracle.com/certification', 'approved', 1),

-- Soft Skills & Management
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Agile & Scrum Master Professional', 'Scrum Alliance', '2024-01-15', '2026-01-15', 'CSM-2024-012', 'https://www.scrumalliance.org/verify', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Project Management Professional (PMP)', 'PMI', '2023-11-05', '2026-11-05', 'PMP-2023-013', 'https://www.pmi.org/certifications/verify', 'approved', 1),

-- AI & Machine Learning
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Machine Learning Specialization', 'Stanford Online', '2024-12-01', NULL, 'STAN-ML-2024-014', 'https://online.stanford.edu/verify', 'approved', 1),
('c4402201-aa6d-45e0-a9a7-9319aa63792c', 'Deep Learning Fundamentals', 'deeplearning.ai', '2024-10-18', NULL, 'DLAI-DL-2024-015', 'https://www.deeplearning.ai/verify', 'approved', 1);

-- Verify the certificates were created
SELECT
    certificate_name,
    organization,
    issue_date,
    expiry_date,
    status,
    credential_id
FROM student_certificates
WHERE user_id = 'c4402201-aa6d-45e0-a9a7-9319aa63792c'
ORDER BY issue_date DESC;
