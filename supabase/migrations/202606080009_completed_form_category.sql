-- Add a specific category for auto-generated completed packet form documents
ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'completed_form';
