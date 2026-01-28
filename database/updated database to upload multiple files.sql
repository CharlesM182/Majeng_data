CREATE TABLE policy_documents (
    id SERIAL PRIMARY KEY,
    policy_id VARCHAR(50), -- Links to policy_number in policies table
    doc_name TEXT NOT NULL,
    doc_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);