-- 1. Create Policies Table (Updated with Beneficiary & Gender)
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(20),
    age INT,
    gender VARCHAR(10),            -- New Field
    smoker BOOLEAN,
    medical_history TEXT,
    coverage NUMERIC(12, 2),
    premium NUMERIC(10, 2),
    term_years INT,
    risk_factor VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Pending Doc',
    inception_date DATE,
    paid_until DATE,
    policy_doc_url TEXT,
    
    -- Beneficiary Details (New Fields)
    beneficiary_name VARCHAR(100),
    beneficiary_id VARCHAR(20),
    beneficiary_phone VARCHAR(20),
    beneficiary_email VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Claims Table
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    policy_id VARCHAR(50) REFERENCES policies(policy_number),
    claimant_name VARCHAR(100),
    amount NUMERIC(12, 2),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    date_filed DATE,
    settlement_form_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Complaints Table
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    policy_id VARCHAR(50),
    customer_name VARCHAR(100),
    subject VARCHAR(200),
    priority VARCHAR(10),
    status VARCHAR(20) DEFAULT 'Open',
    date_logged DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'agent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Audit Log
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);