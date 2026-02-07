-- Add show_correct_answers column to feedback_forms table
-- Controls whether correct answers are shown to assessment takers after submission
ALTER TABLE feedback_forms
ADD COLUMN show_correct_answers TINYINT(1) NOT NULL DEFAULT 1
AFTER collect_email;
