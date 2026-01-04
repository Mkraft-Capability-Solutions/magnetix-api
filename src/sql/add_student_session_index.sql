CREATE INDEX idx_student_session_tracking
ON student_session(user_id, start_date, end_date);
