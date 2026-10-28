const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises; // Use the promise-based version of fs
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const postmarkTransport = require('nodemailer-postmark-transport');
require('dotenv').config(); // Load environment variables from .env file
const fsSync = require('fs'); // Use the synchronous version for a startup check

const app = express();
const PORT = process.env.PORT || 3000;

// Your Google Calendar ID
const CALENDAR_ID = '299b91427831a68a2338f33f62c2ec6966f5b6195720dc27f4bcb13f1a6e8e39@group.calendar.google.com';

// Path to your service account key file
const KEYFILEPATH = path.join(__dirname, 'google-credentials.json');

// --- Startup Sanity Check ---
// Check if the credentials file exists before we even try to start the server fully.
if (!fsSync.existsSync(KEYFILEPATH)) {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: Google credentials file not found!'); // Red text
    console.error(`The server is looking for a file named "google-credentials.json" in the project root, but it does not exist.`);
    console.error('Please download your service account key from Google Cloud, place it in the project folder, and rename it to "google-credentials.json".');
    process.exit(1); // Exit the process with an error code
}

// Check for email credentials on startup
if (process.env.EMAIL_SERVICE === 'postmark') {
    if (!process.env.POSTMARK_SERVER_TOKEN) {
        console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: Postmark Server Token not configured!');
        console.error('The server is configured to use Postmark but is missing the API token.');
        console.error('Please add POSTMARK_SERVER_TOKEN=your-server-api-token to your .env file.');
        process.exit(1);
    }
    if (!process.env.POSTMARK_SENDER_SIGNATURE) {
        console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: Postmark Sender Signature not configured!');
        console.error('The server is configured to use Postmark but is missing the sender email address.');
        console.error('Please add POSTMARK_SENDER_SIGNATURE=your-verified-email@example.com to your .env file.');
        process.exit(1);
    }
} else if (process.env.EMAIL_SERVICE !== 'postmark' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: Email credentials not configured for non-Postmark service!');
    console.error('The server requires email credentials to send replies to customers. Please add EMAIL_USER and EMAIL_PASS to your .env file.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: JWT_SECRET is not configured!');
    console.error('The server requires a secret key to sign session tokens for security.');
    console.error('Please add a long, random string as JWT_SECRET to your .env file.');
    process.exit(1);
}
const SUBMISSIONS_PATH = path.join(__dirname, 'submissions.json');
const USERS_PATH = path.join(__dirname, 'users.json');
const MESSAGES_PATH = path.join(__dirname, 'messages.json');
const ADMIN_CHAT_PATH = path.join(__dirname, 'admin_chat.json');

/**
 * Safely reads and parses the submissions JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of submission objects.
 */
async function readSubmissions() {
    try {
        const submissionsData = await fs.readFile(SUBMISSIONS_PATH, 'utf8');
        // If the file is empty, return an empty array to avoid a JSON.parse error.
        if (submissionsData.trim() === '') {
            return [];
        }
        return JSON.parse(submissionsData);
    } catch (error) {
        // If the file doesn't exist, it's not an error for our purposes, just return an empty array.
        if (error.code === 'ENOENT') return [];
        // For other errors (like malformed JSON), let the caller handle it.
        throw error;
    }
}

/**
 * Safely reads and parses the users JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 */
async function readUsers() {
    try {
        const usersData = await fs.readFile(USERS_PATH, 'utf8');
        if (usersData.trim() === '') return [];
        return JSON.parse(usersData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`\x1b[31m%s\x1b[0m`, `FATAL ERROR: users.json file not found!`);
            console.error(`Please run 'node create-admin.js' to create an admin user before starting the server.`);
            process.exit(1);
        }
        throw error;
    }
}

/**
 * Safely reads and parses the messages JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of message thread objects.
 */
async function readMessages() {
    try {
        const messagesData = await fs.readFile(MESSAGES_PATH, 'utf8');
        if (messagesData.trim() === '') {
            return [];
        }
        return JSON.parse(messagesData);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

/**
 * Safely reads and parses the admin chat JSON file.
 * @returns {Promise<Object>} A promise that resolves to an object of conversation threads.
 */
async function readAdminChat() {
    try {
        const chatData = await fs.readFile(ADMIN_CHAT_PATH, 'utf8');
        if (chatData.trim() === '') {
            return {}; // Return an empty object for an empty file
        }
        return JSON.parse(chatData);
    } catch (error) {
        if (error.code === 'ENOENT') return {}; // Return empty object if file doesn't exist
        throw error;
    }
}

// Helper to create a consistent conversation ID between two users
function getAdminConversationId(user1, user2) {
    return [user1, user2].sort().join('__CONVO__');
}


/**
 * Formats the complex packages object into a human-readable string for the calendar description.
 * This converts the raw JSON into a clean, indented list that handles pizzas, salads, and wings.
 * @param {object} packages - The packages object from the form submission.
 * @returns {string} A formatted string detailing the order.
 */
function formatPackagesForCalendar(packages) {
    const outputLines = [];

    // Helper to make keys and values look nice (e.g., "pizza_sauce" -> "Pizza Sauce")
    const formatText = (text) => text.toString().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    for (const packageName in packages) {
        const details = packages[packageName];

        // Handle "Order from menu" case, which has a 'note' instead of 'items'
        if (details.note) {
            outputLines.push(`${packageName}:`);
            outputLines.push(`  - ${details.note}`);
            outputLines.push(''); // Add a blank line for readability
            continue;
        }

        // Skip empty packages or special notes that are artifacts of the form submission
        if (!details.items || details.items.length === 0) {
            continue;
        }

        outputLines.push(`${packageName} (Quantity: ${details.quantity})`);

        for (const item of details.items) {
            outputLines.push(`  - ${item.name}:`); // Add a colon for clarity
            const options = item.options;

            if (item.name.toLowerCase().includes('pizza')) {
                if (options.specialty_pizza) outputLines.push(`    - Specialty: ${formatText(options.specialty_pizza)}`);
                if (options.pizza_sauce) outputLines.push(`    - Sauce: ${formatText(options.pizza_sauce)}`);
                if (options.toppings && options.toppings.length > 0) outputLines.push(`    - Toppings: ${options.toppings.join(', ')}`);
            } else if (item.name.toLowerCase().includes('salad')) {
                if (options.salad_type) outputLines.push(`    - Type: ${formatText(options.salad_type)} Salad`);
                if (options.dressing) outputLines.push(`    - Dressing: ${formatText(options.dressing)}`);
            } else if (item.name.toLowerCase().includes('wing')) {
                if (options.wing_flavors && options.wing_flavors.length > 0) {
                    const flavorText = options.wing_flavors.length > 1 ? `Half & Half - ${options.wing_flavors.join(' / ')}` : options.wing_flavors[0];
                    outputLines.push(`    - Flavor(s): ${flavorText}`);
                }
                if (options.dipping_sauce) outputLines.push(`    - Dip: ${formatText(options.dipping_sauce)}`);
            }
        }
        outputLines.push(''); // Add a blank line between packages for readability
    }

    if (outputLines.length === 0) {
        return "No package items selected.";
    }

    return outputLines.join('\n');
}

// Configure a JWT auth client
const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/calendar'],
});

// --- Nodemailer Setup ---
// Create a reusable transporter object using the credentials from your .env file
let transporter;
if (process.env.EMAIL_SERVICE === 'postmark') {
    // Use the dedicated Postmark transport for better reliability and simpler config
    transporter = nodemailer.createTransport(postmarkTransport({
        auth: {
            apiKey: process.env.POSTMARK_SERVER_TOKEN
        }
    }));
} else { // Default to Gmail/other standard services
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the project root
app.use(express.static(__dirname));

// API endpoint to create a calendar event
app.post('/api/create-event', async (req, res) => {
    const eventData = req.body;

    // --- Input Validation ---
    // A robust server should always validate incoming data.
    if (!eventData.date || !eventData.time || !eventData.firstname) {
        return res.status(400).json({ message: 'Missing required fields. Date, time, and first name are required.' });
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth });

        const startTime = new Date(`${eventData.date}T${eventData.time}`);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2-hour duration

        const formattedOrderDetails = formatPackagesForCalendar(eventData.packages);

        const event = {
            summary: `Party Reservation: ${eventData.group || eventData.firstname}`,
            location: 'My Buddies Pizza, Lake Elsinore, CA',
            // WARNING: Storing payment information like a credit card number in a non-secure
            // location like a calendar description is a major security risk and is not PCI compliant.
            // This is implemented as requested, but for a production system, use a secure payment
            // processor and only store a transaction ID or customer reference.
            description: `Reservation Details:
Name: ${eventData.firstname} ${eventData.lastname}
Email: ${eventData.email}
Phone: ${eventData.phone}
Number of People: ${eventData.amtppl}
Card on File: ${eventData.tmpcrd || 'N/A'}

--- Order Details ---\n${formattedOrderDetails}

--- Additional Information ---
Subject: ${eventData.subject || 'N/A'}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'America/Los_Angeles',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'America/Los_Angeles',
            },
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });

        // --- Save the submission to our "database" file ---
        try {
            const submissions = await readSubmissions();
            // Add a timestamp, a unique ID, and the Google Calendar event ID for this new submission
            const newSubmission = {
                id: Date.now(),
                receivedAt: new Date().toISOString(),
                eventId: response.data.id, // Important for deletion
                ...eventData
            };
            submissions.push(newSubmission);
            await fs.writeFile(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));
        } catch (dbError) {
            console.error('Error saving submission:', dbError);
            // Don't block the user response for a DB error, but log it.
            // In a real app, you'd have better error handling here.
        }

        res.status(200).json({ message: 'Event created successfully!', event: response.data });
    } catch (error) {
        // Log the specific error message for better debugging
        console.error('Error creating calendar event:', error.message);
        // Provide a more generic message to the client for security
        res.status(500).json({ message: 'An internal error occurred while creating the calendar event.' });
    }
});

// API endpoint to handle a new contact form message
app.post('/api/contact-message', async (req, res) => {
    const { firstname, lastname, email, subject } = req.body;

    if (!firstname || !email || !subject) {
        return res.status(400).json({ message: 'First name, email, and message are required.' });
    }

    try {
        const messages = await readMessages();
        const contactEmail = email.toLowerCase();
        let contactThread = messages.find(thread => thread.email === contactEmail);

        const newMessage = {
            from: 'customer',
            text: subject,
            timestamp: new Date().toISOString()
        };

        if (contactThread) {
            // Add to existing conversation
            contactThread.messages.push(newMessage);
            contactThread.lastUpdate = new Date().toISOString(); // Update timestamp for sorting
        } else {
            // Create a new conversation thread
            contactThread = {
                threadId: `thread_${Date.now()}`, // Add a unique thread ID
                email: contactEmail,
                subject: subject, // Store the original subject for use in replies
                name: `${firstname} ${lastname || ''}`.trim(),
                lastUpdate: new Date().toISOString(),
                messages: [newMessage]
            };
            messages.push(contactThread);
        }

        await fs.writeFile(MESSAGES_PATH, JSON.stringify(messages, null, 2));

        res.status(200).json({ message: 'Your message has been sent successfully!' });
    } catch (error) {
        console.error('Error saving contact message:', error);
        res.status(500).json({ message: 'An internal error occurred while saving your message.' });
    }
});


// --- Admin Endpoints ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const users = await readUsers();
        const user = users.find(u => u.username === username.toLowerCase());

        if (!user) {
            // Use a delay to prevent timing attacks that could reveal valid usernames
            await new Promise(resolve => setTimeout(resolve, 500));
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (isMatch) {
            // Create JWT
            const payload = {
                username: user.username,
                // Add the isAdmin flag to the token payload.
                // Use `!!` to ensure it's a boolean (true/false).
                isAdmin: !!user.isAdmin
            };
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
            res.status(200).json({ message: 'Login successful', token: accessToken });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// --- Authentication Middleware ---
// This function will protect our admin routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden (token is invalid or expired)
        req.user = user; // Add the user payload to the request object
        next();
    });
}

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
    // This simple endpoint is used to verify that the server is running and reachable.
    res.status(200).json({ status: 'ok', message: 'Server is running.' });
});

app.get('/api/admins', authenticateToken, async (req, res) => {
    try {
        const users = await readUsers();
        // The user making the request is in req.user
        const currentUser = req.user.username;

        // Filter for other admins, sort them, and return only usernames for security
        const otherAdmins = users
            .filter(u => u.isAdmin && u.username !== currentUser)
            .map(u => ({ username: u.username }))
            .sort((a, b) => a.username.localeCompare(b.username));

        res.status(200).json(otherAdmins);
    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// Get the chat history between the logged-in admin and another admin
app.get('/api/admin-chat/:username', authenticateToken, async (req, res) => {
    const loggedInUser = req.user.username;
    const otherUser = req.params.username;

    try {
        const allConversations = await readAdminChat();
        const convoId = getAdminConversationId(loggedInUser, otherUser);
        const conversation = allConversations[convoId] || [];
        res.status(200).json(conversation);
    } catch (error) {
        console.error(`Error fetching admin chat for ${loggedInUser} and ${otherUser}:`, error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// Post a new message to another admin
app.post('/api/admin-chat/:username', authenticateToken, async (req, res) => {
    const sender = req.user.username;
    const recipient = req.params.username;
    const { messageText } = req.body;

    if (!messageText) {
        return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    try {
        const allConversations = await readAdminChat();
        const convoId = getAdminConversationId(sender, recipient);

        if (!allConversations[convoId]) {
            allConversations[convoId] = [];
        }

        const newMessage = {
            from: sender,
            text: messageText,
            timestamp: new Date().toISOString()
        };

        allConversations[convoId].push(newMessage);
        await fs.writeFile(ADMIN_CHAT_PATH, JSON.stringify(allConversations, null, 2));
        res.status(201).json(newMessage);
    } catch (error) {
        console.error(`Error posting admin chat message from ${sender} to ${recipient}:`, error);
        res.status(500).json({ message: 'An internal error occurred while posting the message.' });
    }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const username = req.user.username; // Get username from the authenticated token

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 8) { // Example of a password policy
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    try {
        const users = await readUsers();
        const userIndex = users.findIndex(u => u.username === username);

        const user = users[userIndex];

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
        await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});
app.get('/api/submissions', authenticateToken, async (req, res) => {
    try {
        const submissions = await readSubmissions();
        res.status(200).json(submissions);
    } catch (error) {
        console.error('Could not read or parse submissions file:', error);
        res.status(500).json({ message: 'An internal error occurred while retrieving submissions.' });
    }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const messages = await readMessages();
        // Sort by most recently updated
        messages.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
        res.status(200).json(messages);
    } catch (error) {
        console.error('Could not read messages file:', error);
        res.status(500).json({ message: 'An internal error occurred while retrieving messages.' });
    }
});

app.post('/api/messages/:email/reply', authenticateToken, async (req, res) => {
    const contactEmail = req.params.email.toLowerCase();
    const { replyText } = req.body;

    if (!replyText) {
        return res.status(400).json({ message: 'Reply text cannot be empty.' });
    }

    try {
        const messages = await readMessages();
        const thread = messages.find(t => t.email === contactEmail);

        if (!thread) {
            return res.status(404).json({ message: 'Conversation thread not found.' });
        }

        // Ensure thread has an ID for backwards compatibility with old messages
        if (!thread.threadId) {
            thread.threadId = `thread_${Date.now()}`;
        }

        thread.messages.push({
            from: 'admin',
            text: replyText,
            timestamp: new Date().toISOString()
        });
        thread.lastUpdate = new Date().toISOString();

        await fs.writeFile(MESSAGES_PATH, JSON.stringify(messages, null, 2));

        // --- Send Email Notification to Customer ---
        try {
            // Determine the correct 'from' address based on the email service
            const fromAddress = process.env.EMAIL_SERVICE === 'postmark'
                ? process.env.POSTMARK_SENDER_SIGNATURE
                : process.env.EMAIL_USER;

            // Use the original subject for a better user experience, if it exists.
            const replySubject = thread.subject
                ? `Re: ${thread.subject}`
                : `Re: Your message to My Buddies Pizza`;

            await transporter.sendMail({
                from: `"My Buddies Pizza" <${fromAddress}>`,
                to: contactEmail, // The customer's email
                subject: replySubject,
                html: `
                    <p>Hello,</p>
                    <p>You have a new reply regarding your inquiry:</p>
                    <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin: 1em 0;">
                        <p>${replyText}</p>
                    </blockquote>
                    <p style="font-size: 0.8em; color: #888;">Please reply directly to this email to continue the conversation.</p>
                    <p>Thank you,<br>My Buddies Pizza Team</p>
                `,
                // Use a custom header for robust threading. Postmark will pass this back to us.
                headers: {
                    'X-Thread-ID': thread.threadId
                }
            });
            console.log(`Reply email sent successfully to ${contactEmail}`);
        } catch (emailError) {
            console.error(`Failed to send reply email to ${contactEmail}:`, emailError);
            // We don't fail the request if the email fails, as the reply is already saved.
        }

        res.status(200).json(thread);

    } catch (error) {
        console.error('Error posting reply:', error);
        res.status(500).json({ message: 'An internal error occurred while posting the reply.' });
    }
});

app.delete('/api/messages/:email', authenticateToken, async (req, res) => {
    const contactEmail = req.params.email.toLowerCase();

    try {
        let messages = await readMessages();
        const initialLength = messages.length;
        messages = messages.filter(thread => thread.email !== contactEmail);

        if (messages.length === initialLength) {
            return res.status(404).json({ message: 'Conversation thread not found.' });
        }

        await fs.writeFile(MESSAGES_PATH, JSON.stringify(messages, null, 2));
        res.status(200).json({ message: 'Conversation deleted successfully.' });

    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ message: 'An internal error occurred while deleting the conversation.' });
    }
});

app.delete('/api/messages/:email/:timestamp', authenticateToken, async (req, res) => {
    const contactEmail = req.params.email.toLowerCase();
    const messageTimestamp = req.params.timestamp;

    try {
        let messages = await readMessages();
        const thread = messages.find(t => t.email === contactEmail);

        if (!thread) {
            return res.status(404).json({ message: 'Conversation thread not found.' });
        }

        const initialMessageCount = thread.messages.length;
        thread.messages = thread.messages.filter(msg => msg.timestamp !== messageTimestamp);

        if (thread.messages.length === initialMessageCount) {
            return res.status(404).json({ message: 'Message not found within the conversation.' });
        }

        // If deleting the last message empties the thread, remove the whole thread
        if (thread.messages.length === 0) {
            messages = messages.filter(t => t.email !== contactEmail);
        }

        await fs.writeFile(MESSAGES_PATH, JSON.stringify(messages, null, 2));
        res.status(200).json({ message: 'Message deleted successfully.' });

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'An internal error occurred while deleting the message.' });
    }
});

// --- Inbound Email Webhook ---
app.post('/api/incoming-email-webhook', async (req, res) => {
    // --- Recommended: Secure your webhook with Basic Authentication ---
    const authUser = process.env.WEBHOOK_USER;
    const authPass = process.env.WEBHOOK_PASSWORD;

    if (authUser && authPass) {
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
        if (login !== authUser || password !== authPass) {
            res.set('WWW-Authenticate', 'Basic realm="401"');
            return res.status(401).send('Authentication required.');
        }
    }

    // --- Recommended for Debugging: Log the entire incoming payload ---
    console.log('--- Received Inbound Webhook ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('--------------------------------');

    // Postmark sends a JSON payload. We just need to parse it.
    const inboundEmail = req.body;

    // A minimal check to ensure this is a Postmark webhook
    if (!inboundEmail || !inboundEmail.FromFull || !inboundEmail.Subject || !inboundEmail.TextBody) {
        console.warn('Received webhook with missing key Postmark fields.');
        return res.status(400).send('Invalid Postmark webhook payload.');
    }

    const { FromFull, Subject, TextBody, Headers } = inboundEmail;
    const fromAddress = FromFull.Email.toLowerCase();
    const fromName = FromFull.Name;

    // --- Robust Threading: Check for custom header first, then fallback to subject ---
    const headers = Headers || [];
    const threadHeader = headers.find(h => h.Name.toLowerCase() === 'x-thread-id');
    let threadId = threadHeader ? threadHeader.Value : null;

    // Fallback for older emails that used the subject line ref
    if (!threadId) {
        const refIdMatch = Subject.match(/\[ref:(thread_\d+)]/);
        if (refIdMatch && refIdMatch[1]) {
            threadId = refIdMatch[1];
        }
    }

    try {
        const messages = await readMessages();
        let thread = threadId ? messages.find(t => t.threadId === threadId) : null;

        const newMessage = {
            from: 'customer',
            text: TextBody,
            timestamp: new Date().toISOString()
        };

        if (thread) {
            // --- Add Reply to Existing Thread ---
            console.log(`Adding reply to existing thread ${threadId} from ${fromAddress}`);
            thread.messages.push(newMessage);
            thread.lastUpdate = new Date().toISOString();
        } else {
            // --- Create a New Thread ---
            console.log(`No thread ID found. Creating a new thread for ${fromAddress}.`);
            const newThreadId = `thread_${Date.now()}`;
            thread = {
                threadId: newThreadId,
                email: fromAddress,
                name: fromName || fromAddress,
                subject: Subject, // Store the original subject!
                lastUpdate: new Date().toISOString(),
                messages: [newMessage]
            };
            messages.push(thread);
        }

        await fs.writeFile(MESSAGES_PATH, JSON.stringify(messages, null, 2));

        console.log(`Successfully processed inbound email for thread ${thread.threadId}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing incoming email webhook:', error);
        // Let the service know something went wrong. It might try to send the webhook again.
        res.status(500).send('Internal Server Error');
    }

});

app.delete('/api/submissions/:id', authenticateToken, async (req, res) => {
    const submissionId = parseInt(req.params.id, 10);

    if (isNaN(submissionId)) {
        return res.status(400).json({ message: 'Invalid submission ID.' });
    }

    try {
        const submissions = await readSubmissions();
        const submissionIndex = submissions.findIndex(s => s.id === submissionId);

        if (submissionIndex === -1) {
            return res.status(404).json({ message: 'Submission not found.' });
        }

        const [submissionToDelete] = submissions.splice(submissionIndex, 1);

        // Now, try to delete the associated calendar event if it exists
        if (submissionToDelete.eventId) {
            try {
                const calendar = google.calendar({ version: 'v3', auth });
                await calendar.events.delete({
                    calendarId: CALENDAR_ID,
                    eventId: submissionToDelete.eventId,
                });
                console.log(`Successfully deleted calendar event: ${submissionToDelete.eventId}`);
            } catch (calendarError) {
                // If the event is already gone, Google sends a 410 (Gone) or 404.
                // We can log this but shouldn't fail the whole request.
                console.warn(`Could not delete calendar event ${submissionToDelete.eventId}. It might have been deleted manually. Error: ${calendarError.message}`);
            }
        }

        // Write the updated list back to the file
        await fs.writeFile(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));

        res.status(200).json({ message: 'Submission and associated calendar event deleted successfully.' });
    } catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({ message: 'An internal error occurred while deleting the submission.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});