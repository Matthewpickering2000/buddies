const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const USERS_PATH = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createAdmin() {
    console.log('--- Employee User Creation Utility ---');
    rl.question('Enter a username for the employee: ', (username) => {
        rl.question('Enter a password for the employee: ', async (password) => {
            if (!username || !password) {
                console.error('\x1b[31m%s\x1b[0m', 'Username and password cannot be empty.');
                rl.close();
                return;
            }

            try {
                console.log('Hashing password...');
                const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

                const newUser = {
                    username: username.toLowerCase(),
                    passwordHash,
                    isAdmin: true // Mark this user as an admin
                };

                let users = [];
                try {
                    const data = await fs.readFile(USERS_PATH, 'utf8');
                    if (data) users = JSON.parse(data);
                } catch (e) {
                    if (e.code !== 'ENOENT') throw e;
                    // File doesn't exist yet, which is fine.
                }

                // Check if user already exists and update, otherwise add
                const userIndex = users.findIndex(u => u.username === newUser.username);
                if (userIndex > -1) {
                    console.log(`User '${username}' already exists. Updating password.`);
                    users[userIndex] = newUser;
                } else {
                    console.log(`Creating new user '${username}'.`);
                    users.push(newUser);
                }

                await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
                console.log(`\n\x1b[32m%s\x1b[0m`, `Successfully created/updated employee user in users.json.`);
                console.log('You can now start your server and log in with these credentials.');

            } catch (error) {
                console.error('Failed to create user:', error);
            } finally {
                rl.close();
            }
        });
    });
}

createAdmin();