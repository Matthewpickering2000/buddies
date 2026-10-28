    document.addEventListener('DOMContentLoaded', () => { //NOSONAR
    const loginContainer = document.getElementById('login-container');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const submissionsList = document.getElementById('submissions-list');
    const logoutContainer = document.getElementById('logout-container');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Customer Message Selectors ---
    const contactList = document.getElementById('customer-contact-list');
    const chatHeader = document.getElementById('customer-chat-header');
    const chatInfo = document.getElementById('customer-chat-info');
    const chatDisplay = document.getElementById('customer-chat-display');
    const messageInput = document.getElementById('customer-message-input');
    const sendMessageBtn = document.getElementById('send-customer-message-btn');
    let allMessages = [];
    let activeContactEmail = null;

    // --- Admin Chat Selectors ---
    const adminContactList = document.getElementById('contactList');
    const adminChatHeader = document.getElementById('chat-header');
    const adminChatDisplay = document.getElementById('chatMessagesdisplay');
    const adminMessageInput = document.getElementById('admin-message-Input');
    const sendAdminMessageBtn = document.getElementById('sendadminMessageBtn');
    const noAdminContacts = document.getElementById('noContacts');
    const welcomeHeading = document.getElementById('welcome-heading');
    let activeAdminUsername = null;
    let currentUsername = null; // Variable to store the logged-in user's name

    if (!loginForm) {
        console.error('Fatal Error: Login form with ID "login-form" was not found on the page.');
        alert('Admin page is not set up correctly. Could not find the login form element.');
        return;
    }

    // --- Authentication Helper Functions ---

    /**
     * A wrapper around the fetch API that automatically adds the JWT Authorization header.
     * It also handles redirecting to the login page if the token is missing or invalid.
     * @param {string} url The URL to fetch.
     * @param {object} options The options for the fetch call.
     * @returns {Promise<Response>} The fetch Response object.
     */
    async function authenticatedFetch(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showLogin();
            throw new Error('Authentication token not found. Please log in.');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            showLogin('Your session has expired. Please log in again.');
            throw new Error('Authentication failed.');
        }

        return response;
    }

    // --- Server Health Check ---
    // This function runs immediately to check if the backend server is running.
    // This provides a much clearer error message to the user if the server is down.
    async function checkServerStatus() {
        try {
            const response = await fetch('/api/health');
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            console.log('Server health check successful.');
        } catch (error) {
            console.error('Server health check failed:', error);
            loginContainer.innerHTML = `
                <h1 style="color: red;">Connection Error</h1>
                <p>Could not connect to the server. Please ensure the backend server is running by following these steps:</p>
                <ol style="text-align: left; padding-left: 20px;">
                    <li>Open a terminal in the project folder.</li>
                    <li>Run the command: <strong>node server.js</strong></li>
                </ol>
                <p>If you see errors in the terminal, you may need to run <strong>npm install</strong> first.</p>`;
        }
    }

    /**
     * Hides the admin content and shows the login form.
     * @param {string|null} message An optional message to display on the login form.
     */
    function showLogin(message = null) {
        localStorage.removeItem('authToken');
        loginContainer.classList.remove('hidden');
        adminContent.classList.add('hidden');
        logoutContainer.classList.add('hidden');
        if (message) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        }
    }

    /**
     * Updates the main welcome heading with the user's name.
     * @param {string} username The username to display.
     */
    function setWelcomeMessage(username) {
        if (welcomeHeading && username) {
            // Capitalize the first letter for a nicer display
            const displayName = username.charAt(0).toUpperCase() + username.slice(1);
            welcomeHeading.textContent = `Welcome, ${displayName}`;
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.classList.add('hidden');

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token); // Store the token

                // Decode token to get username
                try {
                    const payload = JSON.parse(atob(data.token.split('.')[1]));
                    currentUsername = payload.username;
                    setWelcomeMessage(currentUsername);
                } catch (e) {
                    console.error("Could not decode auth token:", e);
                    showLogin('An error occurred during login. Please try again.');
                    return;
                }
                localStorage.setItem('authToken', data.token);
                loginContainer.classList.add('hidden');
                adminContent.classList.remove('hidden');
                logoutContainer.classList.remove('hidden');
                loadSubmissions();
                loadMessages();
                loadAdminContacts();
            } else {
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login failed:', error);
            loginError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        showLogin('You have been successfully logged out.');
    });

    // --- Admin Chat Functions ---

    function displayAdminChat(messages) {
        adminChatDisplay.innerHTML = '';
        if (!messages || messages.length === 0) {
            adminChatDisplay.innerHTML = '<p class="chat-placeholder">No messages yet. Start the conversation!</p>';
            return;
        }

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            // Use the stored username to determine if the message is from 'self' or 'other'
            const messageClass = msg.from === currentUsername ? 'message-from-admin' : 'message-from-customer';
            messageDiv.className = `message ${messageClass}`;

            // Create the inner content wrapper to match the customer chat structure
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';

            // Using textContent to prevent any potential HTML injection from message content
            const textP = document.createElement('p');
            textP.className = 'message-text';
            textP.textContent = msg.text;

            const timeSmall = document.createElement('small');
            timeSmall.className = 'message-timestamp';
            timeSmall.textContent = new Date(msg.timestamp).toLocaleString();

            contentDiv.appendChild(textP);
            contentDiv.appendChild(timeSmall);
            messageDiv.appendChild(contentDiv);
            adminChatDisplay.appendChild(messageDiv);
        });

        adminChatDisplay.scrollTop = adminChatDisplay.scrollHeight;
    }

    async function handleAdminContactClick(username) {
        activeAdminUsername = username;

        // Highlight the active contact
        adminContactList.querySelectorAll('.contact-item').forEach(item => {
            item.classList.toggle('active', item.dataset.username === username);
        });

        adminChatHeader.textContent = `Chat with ${username}`;
        adminChatDisplay.innerHTML = '<p class="chat-placeholder">Loading messages...</p>';
        adminMessageInput.disabled = true;
        sendAdminMessageBtn.disabled = true;

        try {
            const response = await authenticatedFetch(`/api/admin-chat/${username}`);
            if (!response.ok) throw new Error('Failed to load conversation');
            const messages = await response.json();
            displayAdminChat(messages);
            adminMessageInput.disabled = false;
            sendAdminMessageBtn.disabled = false;
            adminMessageInput.focus();
        } catch (error) {
            console.error('Error loading admin chat:', error);
            adminChatDisplay.innerHTML = '<p class="chat-placeholder" style="color: red;">Could not load chat.</p>';
        }
    }

    async function sendAdminMessage() {
        const messageText = adminMessageInput.value.trim();
        if (!messageText || !activeAdminUsername) return;

        const originalButtonText = sendAdminMessageBtn.textContent;
        sendAdminMessageBtn.disabled = true;
        sendAdminMessageBtn.textContent = 'Sending...';

        try {
            const response = await authenticatedFetch(`/api/admin-chat/${activeAdminUsername}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageText })
            });

            if (!response.ok) throw new Error('Failed to send message');

            // On success, just reload the chat to ensure we have the latest messages
            await handleAdminContactClick(activeAdminUsername);
            adminMessageInput.value = '';
            adminMessageInput.focus();

        } catch (error) {
            console.error('Error sending admin message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            sendAdminMessageBtn.disabled = false;
            sendAdminMessageBtn.textContent = originalButtonText;
        }
    }

    async function loadAdminContacts() {
        if (!adminContactList) return;

        try {
            const response = await authenticatedFetch('/api/admins');
            if (!response.ok) {
                throw new Error('Failed to fetch admin contacts');
            }
            const admins = await response.json();

            const loadingContact = document.getElementById('loadingContact');
            loadingContact.classList.add('hidden');
            adminContactList.innerHTML = ''; // Clear list

            if (admins.length === 0) {
                noAdminContacts.classList.remove('hidden');
            } else {
                noAdminContacts.classList.add('hidden');
                admins.forEach(admin => {
                    const listItem = document.createElement('li');
                    listItem.className = 'contact-item';
                    listItem.dataset.username = admin.username;
                    listItem.innerHTML = `<div class="contact-name">${admin.username}</div>`;
                    listItem.style.cursor = 'pointer'; // Add a visual cue that it's clickable
                    adminContactList.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error('Error loading admin contacts:', error);
            document.getElementById('loadingContact').classList.add('hidden');
            adminContactList.innerHTML = '<li>Error loading contacts.</li>';
        }
    }

    // --- Event Listeners for Admin Chat ---
    adminContactList.addEventListener('click', e => {
        const contactItem = e.target.closest('.contact-item');
        if (contactItem && contactItem.dataset.username) {
            handleAdminContactClick(contactItem.dataset.username);
        }
    });

    sendAdminMessageBtn.addEventListener('click', sendAdminMessage);
    adminMessageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent adding a new line
            sendAdminMessage();
        }
    });

    /**
     * Formats the complex packages object into a human-readable string.
     * This is a client-side copy of the function in server.js to ensure consistent output.
     * @param {object} packages - The packages object from the form submission.
     * @returns {string} A formatted string detailing the order.
     */
    function formatPackagesForCalendar(packages) {
        if (!packages) return "No package information available.";
        const outputLines = [];

        // Helper to make keys and values look nice (e.g., "pizza_sauce" -> "Pizza Sauce")
        const formatText = (text) => text.toString().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

        for (const packageName in packages) {
            const details = packages[packageName];

            // Handle "Order from menu" case
            if (details.note) {
                outputLines.push(`${packageName}:`);
                outputLines.push(`  - ${details.note}`);
                outputLines.push('');
                continue;
            }

            // Skip empty packages or artifacts
            if (!details.items || details.items.length === 0) {
                continue;
            }

            outputLines.push(`${packageName} (Quantity: ${details.quantity})`);

            for (const item of details.items) {
                outputLines.push(`  - ${item.name}:`);
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
            outputLines.push('');
        }

        if (outputLines.length === 0) {
            return "No package items selected.";
        }

        // Trim trailing newlines for a cleaner look
        return outputLines.join('\n').trim();
    }

    async function loadSubmissions() {
        try {
            const response = await authenticatedFetch('/api/submissions');
            const submissions = await response.json();
            submissionsList.innerHTML = ''; // Clear previous list

            if (submissions.length === 0) {
                submissionsList.innerHTML = '<p>No submissions yet.</p>';
                return;
            }

            // Display newest submissions first
            submissions.reverse().forEach(submission => {
                const card = document.createElement('div');
                card.className = 'submission-card';

                const partyDate = new Date(`${submission.date}T${submission.time}`);
                const formattedDate = partyDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const formattedTime = partyDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                // Use the new formatting function to create the detailed description
                const formattedOrderDetails = formatPackagesForCalendar(submission.packages);
                const fullDescription = `--- Order Details ---\n${formattedOrderDetails}\n\n--- Additional Information ---\nSubject: ${submission.subject || 'N/A'}`;

                card.innerHTML = `
                    <h3>Party for: ${submission.group || submission.firstname}</h3>
                    <p><strong>Contact:</strong> ${submission.firstname} ${submission.lastname} (${submission.email})</p>
                    <p><strong>Phone:</strong> ${submission.phone || 'N/A'}</p>
                    <p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
                    <p><strong>Guests:</strong> ${submission.amtppl}</p>
                    <p><strong>Card on File:</strong> ${submission.tmpcrd || 'N/A'}</p>
                    <p><strong>Full Order:</strong></p>
                    <pre>${fullDescription}</pre>
                    <div class="card-footer">
                        <small>Received: ${new Date(submission.receivedAt).toLocaleString()}</small>
                        <button class="delete-btn" data-id="${submission.id}" data-event-id="${submission.eventId || ''}">Delete</button>
                    </div>
                `;
                submissionsList.appendChild(card);
            });

        } catch (error) {
            console.error('Failed to load submissions:', error);
            const submissionsList = document.getElementById('submissions-list');
            if (submissionsList) {
                submissionsList.innerHTML = '<p class="res-warn">Could not load submissions. Please try again later.</p>';
            }
        }
    }

    if (submissionsList) {
        submissionsList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const button = event.target;
                const submissionId = button.dataset.id;
                const eventId = button.dataset.eventId;

                const confirmationMessage = `Are you sure you want to delete this reservation?`;
                const finalMessage = eventId ?
                    confirmationMessage + "\n\nThis will also remove the event from the Google Calendar." :
                    confirmationMessage + "\n\nWarning: This submission is not linked to a calendar event. Only the confirmation will be deleted.";

                if (confirm(finalMessage)) {
                    try {
                        button.disabled = true;
                        button.textContent = 'Deleting...';

                        const response = await authenticatedFetch(`/api/submissions/${submissionId}`, { method: 'DELETE' });

                        if (response.ok) {
                            button.closest('.submission-card').remove();
                        } else {
                            let errorText = 'An unknown error occurred.';
                            try {
                                // Try to parse a JSON error message from the server
                                const errorData = await response.json();
                                errorText = errorData.message;
                            } catch (jsonError) {
                                // If the response isn't JSON, it's likely a server error (like a 404 page)
                                errorText = `Server returned a non-JSON response (Status: ${response.status} ${response.statusText}). Please ensure the server is running the latest code.`;
                            }
                            alert(`Failed to delete reservation: ${errorText}`);
                            button.disabled = false;
                            button.textContent = 'Delete';
                        }
                    } catch (error) {
                        console.error('Error deleting submission:', error);
                        alert('An error occurred while trying to delete the reservation.');
                        button.disabled = false;
                        button.textContent = 'Delete';
                    }
                }
            }
        });
    }

    // --- Customer Message Functions ---

    async function loadMessages() {
        try {
            const response = await authenticatedFetch('/api/messages');
            if (!response.ok) throw new Error('Failed to fetch messages');
            allMessages = await response.json();

            contactList.innerHTML = ''; // Clear loading message

            if (allMessages.length === 0) {
                contactList.innerHTML = '<li>No customer messages.</li>';
                return;
            }

            allMessages.forEach(thread => {
                const lastMessage = thread.messages[thread.messages.length - 1];
                const listItem = document.createElement('li');
                listItem.className = 'contact-item';
                listItem.dataset.email = thread.email;
                listItem.innerHTML = `
                    <div class="contact-name">${thread.name}</div>
                    <div class="contact-meta">
                        <small class="contact-timestamp">${new Date(thread.lastUpdate).toLocaleDateString()}</small>
                        <button class="delete-thread-btn" title="Delete this entire conversation">&times;</button>
                    </div>
                `;
                contactList.appendChild(listItem);
            });

        } catch (error) {
            console.error('Error loading messages:', error);
            contactList.innerHTML = '<li>Error loading messages.</li>';
        }
    }

    function displayChat(email) {
        activeContactEmail = email;
        const thread = allMessages.find(t => t.email === email);

        if (!thread) {
            chatDisplay.innerHTML = '<p class="chat-placeholder">Could not find conversation.</p>';
            if (chatInfo) chatInfo.textContent = ''; // Clear contact info
            return;
        }

        // Highlight the active contact
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.toggle('active', item.dataset.email === email);
        });

        chatHeader.textContent = `Conversation with ${thread.name}`;
        if (chatInfo) chatInfo.textContent = `Contact: ${thread.email}`;
        chatDisplay.innerHTML = ''; // Clear previous messages

        thread.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', `message-from-${msg.from}`);

            const deleteIconHTML = `<span class="delete-msg-btn" data-timestamp="${msg.timestamp}" title="Delete this message">&#x1F5D1;</span>`;
            let messageContentHTML = '';

            if (msg.from === 'customer') {
                // Detailed format for customer messages
                messageContentHTML = `
                    <p class="message-text">${msg.text}</p>
                    <small class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</small>
                `;
            } else {
                // Simpler format for admin replies
                messageContentHTML = `
                    <p class="message-text">${msg.text}</p>
                    <small class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</small>
                `;
            }

            messageDiv.innerHTML = `
                <div class="message-content">${messageContentHTML}</div>
                ${deleteIconHTML}
            `;

            chatDisplay.appendChild(messageDiv);
        });

        // Scroll to the bottom of the chat
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        // Enable the input form
        messageInput.disabled = false;
        sendMessageBtn.disabled = false;
    }

    async function sendReply() {
        const replyText = messageInput.value.trim();
        if (!replyText || !activeContactEmail) return;

        sendMessageBtn.disabled = true;
        sendMessageBtn.textContent = 'Sending...';

        try {
            const response = await authenticatedFetch(`/api/messages/${activeContactEmail}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyText })
            });

            if (!response.ok) throw new Error('Failed to send reply');

            // Reload all messages to get the latest state and re-render everything
            await loadMessages();
            // Re-display the chat for the current user
            displayChat(activeContactEmail);
            messageInput.value = ''; // Clear input on success

        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Could not send reply. Please try again.');
        } finally {
            sendMessageBtn.disabled = false;
            sendMessageBtn.textContent = 'Send Reply';
        }
    }

    // Event Listeners for Messaging UI
    contactList.addEventListener('click', e => {
        const deleteButton = e.target.closest('.delete-thread-btn');
        const contactItem = e.target.closest('.contact-item');

        if (deleteButton) {
            const email = contactItem.dataset.email;
            if (confirm(`Are you sure you want to delete the entire conversation with ${email}? This cannot be undone.`)) {
                deleteConversation(email);
            }
        } else if (contactItem) {
            displayChat(contactItem.dataset.email);
        }
    });

    chatDisplay.addEventListener('click', e => {
        const deleteButton = e.target.closest('.delete-msg-btn');
        if (deleteButton && activeContactEmail) {
            const timestamp = deleteButton.dataset.timestamp;
            if (confirm('Are you sure you want to delete this message?')) {
                deleteMessage(activeContactEmail, timestamp);
            }
        }
    });

    sendMessageBtn.addEventListener('click', sendReply);

    async function deleteConversation(email) {
        try {
            const response = await authenticatedFetch(`/api/messages/${email}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            // Clear the chat window if the deleted conversation was active
            if (activeContactEmail === email) {
                activeContactEmail = null;
                chatHeader.textContent = 'Select a conversation';
                if (chatInfo) chatInfo.textContent = '';
                chatDisplay.innerHTML = '<p class="chat-placeholder">Select a conversation from the left to view messages.</p>';
                messageInput.disabled = true;
                sendMessageBtn.disabled = true;
            }
            loadMessages(); // Refresh the contact list
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert(`Could not delete conversation: ${error.message}`);
        }
    }

    async function deleteMessage(email, timestamp) {
        try {
            const response = await authenticatedFetch(`/api/messages/${email}/${timestamp}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Refresh the chat view to show the message has been removed
            await loadMessages(); // Reload all data
            displayChat(email); // Re-render the current chat

        } catch (error) {
            console.error('Error deleting message:', error);
            alert(`Could not delete message: ${error.message}`);
        }
    }

    // --- Initial Page Load Logic ---
    const token = localStorage.getItem('authToken');
    if (token) {
        // A token exists, so let's try to load the admin content directly.
        // Decode token to get username for chat functionality
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUsername = payload.username;
            setWelcomeMessage(currentUsername);
        } catch (e) {
            console.error("Could not decode auth token on page load:", e);
            // If token is bad, showLogin will be called by authenticatedFetch anyway
            showLogin('Your session is invalid. Please log in again.');
            return;
        }

        // The authenticatedFetch function will handle cases where the token is expired.
        loginContainer.classList.add('hidden');
        adminContent.classList.remove('hidden');
        logoutContainer.classList.remove('hidden');
        loadSubmissions();
        loadMessages();
        loadAdminContacts();
    } else {
        // No token, so run the health check and show the login form.
        checkServerStatus();
    }
});