-- 1. Add the Real Name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name VARCHAR(100);

-- 2. Update your existing Admin user to the new format (3 letters, 2 numbers)
-- We change 'Admin' to 'ADM01' and set their real name.
UPDATE users 
SET username = 'ADM01', real_name = 'System Administrator' 
WHERE username = 'Admin';

-- 3. (Optional) Update other test users if you have them
UPDATE users SET username = 'SAR01', real_name = 'Sarah Jones' WHERE username = 'Sarah';
UPDATE users SET username = 'MIK01', real_name = 'Mike Smith' WHERE username = 'Mike';

-- 4. Check the results
SELECT * FROM users;