        // Initialize Firebase with corrected config
        const firebaseConfig = {
            apiKey: "AIzaSyC8VsAM7drgTfqHohgKFK-asuSMhAU0fS0", 
            authDomain: "dragon-city-enjoyer.firebaseapp.com", 
            databaseURL: "https://dragon-city-enjoyer-default-rtdb.firebaseio.com", 
            projectId: "dragon-city-enjoyer", 
            storageBucket: "dragon-city-enjoyer.firebasestorage.app", 
            messagingSenderId: "146535472297", 
            appId: "1:146535472297:web:961d91a902f03b6d93ddb8", 
            measurementId: "G-RDJ43CLWZ5"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const rtdb = firebase.database();
        const auth = firebase.auth();

        const APP_PAGE = document.documentElement.getAttribute('data-page') || 'index';

        // DOM Elements
        const navLinks = document.querySelectorAll('.nav-link');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const userRole = document.getElementById('userRole');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const communityLink = document.getElementById('communityLink');
        const settingsLink = document.getElementById('settingsLink');
        const adminLink = document.getElementById('adminLink');
        const loginLink = document.getElementById('loginLink');
        const notification = document.getElementById('notification');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Main page buttons
        const heroSignupBtn = document.getElementById('heroSignupBtn');

        // Form Elements
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const communityPosts = document.getElementById('communityPosts');
        const postContent = document.getElementById('postContent');
        const submitPost = document.getElementById('submitPost');
        const signupProfilePicture = document.getElementById('signupProfilePicture');
        const signupProfilePreview = document.getElementById('signupProfilePreview');
        const settingsProfilePicture = document.getElementById('settingsProfilePicture');
        const settingsCurrentAvatar = document.getElementById('settingsCurrentAvatar');
        const settingsCurrentUsername = document.getElementById('settingsCurrentUsername');
        const settingsCurrentEmail = document.getElementById('settingsCurrentEmail');
        const saveSettingsProfileBtn = document.getElementById('saveSettingsProfileBtn');
        const updateEmailForm = document.getElementById('updateEmailForm');
        const updatePasswordForm = document.getElementById('updatePasswordForm');
        const settingsEmail = document.getElementById('settingsEmail');
        const settingsPassword = document.getElementById('settingsPassword');
        const settingsConfirmPassword = document.getElementById('settingsConfirmPassword');

        // Role Management Elements
        const userSelect = document.getElementById('userSelect');
        const roleSelect = document.getElementById('roleSelect');
        const changeRoleBtn = document.getElementById('changeRoleBtn');
        
        // User Management Elements
        const userList = document.getElementById('userList');

        // Dashboard Elements
        const totalUsersStat = document.getElementById('totalUsersStat');

        const profileOptionLabel = document.getElementById('profileOptionLabel');
        const profileOptionUrl = document.getElementById('profileOptionUrl');
        const addProfileOptionBtn = document.getElementById('addProfileOptionBtn');
        const saveDefaultProfileBtn = document.getElementById('saveDefaultProfileBtn');
        const defaultProfileSelect = document.getElementById('defaultProfileSelect');
        const profileOptionsList = document.getElementById('profileOptionsList');

        // Admin Menu Elements (admin.html only)
        const adminMenuItems = document.querySelectorAll('.admin-menu-item');
        const adminSections = document.querySelectorAll('.admin-section');

        const BASE_PATH = (() => {
            const parts = window.location.pathname.split('/').filter(Boolean);
            if (!parts.length) return './';
            parts.pop();
            return parts.length ? `/${parts.join('/')}/` : './';
        })();

        function pageUrl(filename) {
            return `${BASE_PATH}${filename}`;
        }

        // Current user
        let currentUser = null;
        let userRoleData = null;
        let currentUserProfileData = null;
        
        // Default owner email
        const OWNER_EMAIL = "chonhouliu@gmail.com";
        const FALLBACK_PROFILE_PICTURE = 'https://api.dicebear.com/9.x/thumbs/svg?seed=dragon-city-default';
        let defaultProfilePictureUrl = FALLBACK_PROFILE_PICTURE;
        let defaultProfilePictureLabel = 'Default Dragon';
        let profileOptionsCache = [];

        let communityChatUnsubscribe = null;

        // Show notification
        function showNotification(message, isError = false) {
            const icon = notification.querySelector('i');
            const text = notification.querySelector('span');
            
            text.textContent = message;
            notification.style.background = isError ? '#ff3b30' : 'var(--primary)';
            icon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // Show loading spinner
        function showLoading() {
            loadingSpinner.style.display = 'block';
        }

        // Hide loading spinner
        function hideLoading() {
            loadingSpinner.style.display = 'none';
        }

        function syncNavActive() {
            const path = window.location.pathname.split('/').pop() || '';
            navLinks.forEach((link) => {
                const href = link.getAttribute('href') || '';
                const file = href.split('/').pop() || '';
                const isActive = file === path || (path === '' && file === 'index.html');
                link.classList.toggle('active', isActive);
            });
        }

        function navigateToPageForAuth(targetPage) {
            const isAdminUser = currentUser && (userRoleData === 'Admin' || userRoleData === 'Owner');
            const authOnlyPages = ['community', 'settings', 'admin'];

            if (currentUser && (targetPage === 'login' || targetPage === 'signup')) {
                window.location.href = pageUrl('index.html');
                return;
            }

            if (!currentUser && authOnlyPages.includes(targetPage)) {
                window.location.href = pageUrl('login.html');
                return;
            }

            if (targetPage === 'admin' && !isAdminUser) {
                window.location.href = currentUser ? pageUrl('index.html') : pageUrl('login.html');
                return;
            }

            const map = {
                main: 'index.html',
                login: 'login.html',
                signup: 'signup.html',
                community: 'community.html',
                settings: 'settings.html',
                admin: 'admin.html'
            };
            const file = map[targetPage] || 'index.html';
            window.location.href = pageUrl(file);
        }

        // Generate unique 17-digit user ID
        function generateUserId() {
            let userId = '';
            for (let i = 0; i < 17; i++) {
                userId += Math.floor(Math.random() * 10);
            }
            return userId;
        }

        // Initialize Firestore collections
        async function initializeFirestoreCollections() {
            try {
                // Check if admins collection exists and create test document if not
                const adminsSnapshot = await db.collection('admins').limit(1).get();
                if (adminsSnapshot.empty) {
                    // Create a test document to initialize the collection
                    await db.collection('admins').doc('_init_').set({
                        _init: true,      
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    // Delete the test document
                    await db.collection('admins').doc('_init_').delete();
                    console.log('Admins collection initialized');
                }

                // Check if communityPosts collection exists
                const communitySnapshot = await db.collection('communityPosts').limit(1).get();
                if (communitySnapshot.empty) {
                    // Create a test document to initialize the collection
                    await db.collection('communityPosts').doc('_init_').set({
                        _init: true,      
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    // Delete the test document
                    await db.collection('communityPosts').doc('_init_').delete();
                    console.log('CommunityPosts collection initialized');
                }

                // Ensure profile picture options exist
                const profileOptionsSnapshot = await db.collection('profileOptions').limit(1).get();
                if (profileOptionsSnapshot.empty) {
                    await db.collection('profileOptions').add({
                        label: 'Default Dragon',
                        imageUrl: FALLBACK_PROFILE_PICTURE,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('Profile options collection initialized');
                }

                // Ensure default profile settings exist
                const profileSettingsRef = db.collection('appSettings').doc('profilePictures');
                const profileSettingsDoc = await profileSettingsRef.get();
                if (!profileSettingsDoc.exists) {
                    await profileSettingsRef.set({
                        defaultUrl: FALLBACK_PROFILE_PICTURE,
                        defaultLabel: 'Default Dragon',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log('Profile settings initialized');
                }
            } catch (error) {
                console.error('Error initializing collections: ', error);
            }
        }

        // Call initialization when the app starts
        initializeFirestoreCollections();

        // Firebase Authentication Functions
        function login(email, password) {
            showLoading();
            return auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update last login time
                    return rtdb.ref('users/' + userCredential.user.uid).update({
                        lastLogin: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        hideLoading();
                        showNotification('Login successful!');
                        window.location.href = pageUrl('index.html');
                        
                        return userCredential.user;
                    });
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Login failed: ' + error.message, true);
                    throw error;
                });
        }

        function logout() {
            showLoading();
            return auth.signOut()
                .then(() => {
                    hideLoading();
                    showNotification('You have been logged out');
                    window.location.href = pageUrl('index.html');
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Logout failed: ' + error.message, true);
                    throw error;
                });
        }

        // Admin Functions
        function loadUsers() {
            if (!userList) return;
            // Allow both owner and admins to view users
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                showNotification('Access denied', true);
                return;
            }
            
            showLoading();
            let usersRef = rtdb.ref('users');
            
            return usersRef.once('value')
                .then((snapshot) => {
                    hideLoading();
                    userList.innerHTML = '';
                    
                    if (!snapshot.exists()) {
                        userList.innerHTML = '<p>No users found.</p>';
                        return;
                    }
                    
                    const users = [];
                    snapshot.forEach((childSnapshot) => {
                        const userId = childSnapshot.key;
                        const user = childSnapshot.val();
                        users.push({ userId, ...user });
                    });
                    
                    users.forEach((user) => {
                        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A';
                        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A';
                        
                        const userElement = document.createElement('div');
                        userElement.className = 'user-item';
                        userElement.innerHTML = `
                            <div class="user-info">
                                <div><strong>Username: </strong> ${user.username}</div>
                                <div><strong>Email: </strong> ${user.email}</div>
                                <div><strong>User ID: </strong> ${user.userId}</div>
                                <div><strong>Role: </strong> 
                                    <span class="role-badge role-${(user.role || 'member').toLowerCase()}">${user.role || 'Member'}</span>
                                </div>
                                <div><strong>Created: </strong> <span class="login-info">${createdAt}</span></div>
                                <div><strong>Last Login: </strong> <span class="login-info">${lastLogin}</span></div>
                                <div><strong>Banned: </strong> ${user.banned ? 'Yes' : 'No'}</div>
                            </div>
                            <div class="user-actions">
                                ${currentUser.email === OWNER_EMAIL ? 
                                    (user.banned ? 
                                        `<button class="unban-btn" data-id="${user.userId}">Unban</button>` :        
                                        `<button class="ban-btn" data-id="${user.userId}">Ban</button>`) 
                                : ''}
                            </div>
                        `;
                        userList.appendChild(userElement);
                    });
                    
                    // Add event listeners to ban/unban buttons (only if owner)
                    if (currentUser.email === OWNER_EMAIL) {
                        document.querySelectorAll('.ban-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                banUser(e.target.getAttribute('data-id'));
                            });
                        });
                        
                        document.querySelectorAll('.unban-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                unbanUser(e.target.getAttribute('data-id'));
                            });
                        });
                    }
                })
                .catch((error) => {
                    hideLoading();
                    console.error("Error getting users: ", error);
                    showNotification('Error loading users: ' + error.message, true);
                });
        }

        function banUser(userId) {
            showLoading();
            const userRef = rtdb.ref('users/' + userId);
            
            userRef.update({ banned: true })
                .then(() => {
                    hideLoading();
                    showNotification('User banned successfully!');
                    loadUsers();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Error banning user: ' + error.message, true);
                });
        }

        function unbanUser(userId) {
            showLoading();
            const userRef = rtdb.ref('users/' + userId);
            
            userRef.update({ banned: false })
                .then(() => {
                    hideLoading();
                    showNotification('User unbanned successfully!');
                    loadUsers();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Error unbanning user: ' + error.message, true);
                });
        }

        // Role Management Functions
        function loadUsersForRoleManagement() {
            if (!currentUser || currentUser.email !== OWNER_EMAIL) {
                showNotification('Access denied', true);
                return;
            }
            
            showLoading();
            let usersRef = rtdb.ref('users');
            
            return usersRef.once('value')
                .then((snapshot) => {
                    hideLoading();
                    userSelect.innerHTML = '<option value="">Select User</option>';
                    
                    if (!snapshot.exists()) {
                        return;
                    }
                    
                    snapshot.forEach((childSnapshot) => {
                        const userId = childSnapshot.key;
                        const user = childSnapshot.val();
                        const option = document.createElement('option');
                        option.value = userId;
                        option.textContent = `${user.username} (${user.email}) - ${user.role || 'Member'}`;
                        userSelect.appendChild(option);
                    });
                })
                .catch((error) => {
                    hideLoading();
                    console.error("Error getting users: ", error);
                    showNotification('Error loading users: ' + error.message, true);
                });
        }
        
        function changeUserRole() {
            const userId = userSelect.value;
            const newRole = roleSelect.value;
            
            if (!userId || !newRole) {
                showNotification('Please select both user and role', true);
                return;
            }
            
            showLoading();
            const userRef = rtdb.ref('users/' + userId);
            
            userRef.update({ role: newRole })
                .then(() => {
                    hideLoading();
                    showNotification('User role updated successfully!');
                    loadUsersForRoleManagement();
                    loadUsers(); // Refresh user list in user management
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Error updating user role: ' + error.message, true);
                });
        }
        
        // Check if user is admin or owner
        function checkAdminStatus(user) {
            // Check if owner
            if (user.email === OWNER_EMAIL) {
                userRoleData = 'Owner';
                userRole.textContent = 'Owner';
                userRole.className = 'role-badge role-owner';
                adminLink.style.display = 'block';
                return Promise.resolve();
            }
            
            // Check if admin in admins collection
            return db.collection('admins')
                .where('email', '==', user.email)
                .get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        userRoleData = 'Admin';
                        userRole.textContent = 'Admin';
                        userRole.className = 'role-badge role-admin';
                        adminLink.style.display = 'block';
                    } else {
                        // Check regular user role
                        const userRef = rtdb.ref('users/' + user.uid);
                        return userRef.once('value').then((snapshot) => {
                            if (snapshot.exists()) {
                                const userData = snapshot.val();
                                userRoleData = userData.role || 'Member';
                                userRole.textContent = userRoleData;
                                userRole.className = `role-badge role-${userRoleData.toLowerCase()}`;
                                
                                // Check if user is admin or owner
                                const isAdmin = userRoleData === 'Admin' || userRoleData === 'Owner';
                                adminLink.style.display = isAdmin ? 'block' : 'none';
                            }
                        });
                    }
                })
                .catch((error) => {
                    console.error('Error checking admin status: ', error);
                });
        }

        function updateDashboardStats() {
            if (!totalUsersStat) return;
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                return;
            }

            rtdb.ref('users').once('value')
                .then((snapshot) => {
                    totalUsersStat.textContent = snapshot.numChildren();
                })
                .catch((error) => {
                    console.error('Error getting user count: ', error);
                });
        }

        // Show admin section
        function showAdminSection(sectionId) {
            if (!adminSections.length) return;
            adminSections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${sectionId}-section`).classList.add('active');
            
            // Update active menu item
            adminMenuItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === sectionId) {
                    item.classList.add('active');
                }
            });
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatMessageTimestamp(timestamp) {
            if (!timestamp) return 'Just now';
            try {
                if (timestamp.toDate) return new Date(timestamp.toDate()).toLocaleString();
                if (timestamp instanceof Date) return timestamp.toLocaleString();
                if (typeof timestamp === 'number') return new Date(timestamp).toLocaleString();
            } catch (error) {
                console.error('Timestamp parse error:', error);
            }
            return 'Just now';
        }

        function normalizeProfilePicture(url) {
            return (typeof url === 'string' && url.trim())
                ? url.trim()
                : (defaultProfilePictureUrl || FALLBACK_PROFILE_PICTURE);
        }

        function getCurrentUserData() {
            if (!currentUser) return Promise.resolve(null);
            return rtdb.ref('users/' + currentUser.uid).once('value')
                .then((snapshot) => snapshot.val() || null);
        }

        function applyCurrentUserProfile(profileData = null) {
            const safeProfile = profileData || {};
            currentUserProfileData = safeProfile;
            const username = safeProfile.username || 'Player';
            const email = safeProfile.email || (currentUser ? currentUser.email : '');
            const profilePicture = normalizeProfilePicture(safeProfile.profilePicture);

            if (userName) userName.textContent = username;
            if (userEmail) userEmail.textContent = email;
            if (userAvatar) userAvatar.src = profilePicture;
            if (settingsCurrentUsername) settingsCurrentUsername.textContent = username;
            if (settingsCurrentEmail) settingsCurrentEmail.textContent = email;
            if (settingsCurrentAvatar) settingsCurrentAvatar.src = profilePicture;
            if (settingsEmail) settingsEmail.value = email;
            if (settingsProfilePicture) {
                settingsProfilePicture.value = profilePicture;
                if (!settingsProfilePicture.value && settingsProfilePicture.options.length > 0) {
                    settingsProfilePicture.selectedIndex = 0;
                }
            }
            updateSettingsProfilePreview();
        }

        function loadCurrentUserProfile() {
            if (!currentUser) return Promise.resolve(null);
            return getCurrentUserData()
                .then((userData) => {
                    applyCurrentUserProfile(userData);
                    if (settingsEmail) {
                        settingsEmail.value = (userData && userData.email) || (currentUser ? currentUser.email : '');
                    }
                    return userData;
                })
                .catch((error) => {
                    console.error('Error loading user profile:', error);
                    return null;
                });
        }

        function populateProfilePictureSelect(selectEl, selectedValue = '') {
            if (!selectEl) return;

            const currentValue = selectedValue || selectEl.value || '';
            selectEl.innerHTML = '';

            profileOptionsCache.forEach((option) => {
                const optionEl = document.createElement('option');
                optionEl.value = option.imageUrl;
                optionEl.textContent = option.label + (option.imageUrl === defaultProfilePictureUrl ? ' (Default)' : '');
                selectEl.appendChild(optionEl);
            });

            const fallbackValue = currentValue || defaultProfilePictureUrl || (profileOptionsCache[0] ? profileOptionsCache[0].imageUrl : FALLBACK_PROFILE_PICTURE);
            selectEl.value = fallbackValue;

            if (!selectEl.value && selectEl.options.length > 0) {
                selectEl.selectedIndex = 0;
            }
        }

        function updateSignupProfilePreview() {
            if (!signupProfilePreview || !signupProfilePicture) return;
            signupProfilePreview.src = normalizeProfilePicture(signupProfilePicture.value);
        }

        function updateSettingsProfilePreview() {
            if (!settingsCurrentAvatar || !settingsProfilePicture) return;
            settingsCurrentAvatar.src = normalizeProfilePicture(settingsProfilePicture.value);
        }

        function loadProfileOptions() {
            return Promise.all([
                db.collection('profileOptions').get(),
                db.collection('appSettings').doc('profilePictures').get()
            ])
                .then(([optionsSnapshot, settingsDoc]) => {
                    const options = [];
                    optionsSnapshot.forEach((doc) => {
                        const data = doc.data() || {};
                        if (!data.imageUrl) return;
                        options.push({
                            id: doc.id,
                            label: data.label || 'Profile Option',
                            imageUrl: data.imageUrl
                        });
                    });

                    const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
                    defaultProfilePictureUrl = normalizeProfilePicture(settingsData.defaultUrl || (options[0] && options[0].imageUrl) || FALLBACK_PROFILE_PICTURE);
                    defaultProfilePictureLabel = settingsData.defaultLabel || (options[0] && options[0].label) || 'Default Dragon';

                    if (!options.some((option) => option.imageUrl === defaultProfilePictureUrl)) {
                        options.unshift({
                            id: '__default__',
                            label: defaultProfilePictureLabel,
                            imageUrl: defaultProfilePictureUrl
                        });
                    }

                    if (options.length === 0) {
                        options.push({
                            id: '__fallback__',
                            label: 'Default Dragon',
                            imageUrl: FALLBACK_PROFILE_PICTURE
                        });
                        defaultProfilePictureUrl = FALLBACK_PROFILE_PICTURE;
                        defaultProfilePictureLabel = 'Default Dragon';
                    }

                    profileOptionsCache = options;

                    if (signupProfilePicture) populateProfilePictureSelect(signupProfilePicture);
                    if (settingsProfilePicture) populateProfilePictureSelect(settingsProfilePicture, currentUserProfileData ? currentUserProfileData.profilePicture : '');
                    updateSignupProfilePreview();
                    updateSettingsProfilePreview();
                    return options;
                })
                .catch((error) => {
                    console.error('Error loading profile options:', error);
                    profileOptionsCache = [{
                        id: '__fallback__',
                        label: 'Default Dragon',
                        imageUrl: FALLBACK_PROFILE_PICTURE
                    }];
                    defaultProfilePictureUrl = FALLBACK_PROFILE_PICTURE;
                    if (signupProfilePicture) populateProfilePictureSelect(signupProfilePicture);
                    if (settingsProfilePicture) populateProfilePictureSelect(settingsProfilePicture);
                    updateSignupProfilePreview();
                    updateSettingsProfilePreview();
                    return profileOptionsCache;
                });
        }

        function renderCommunityMessage(message, isMine = false) {
            const row = document.createElement('div');
            row.className = `community-message ${isMine ? 'mine' : ''}`;
            const profilePicture = normalizeProfilePicture(message.profilePicture || message.senderAvatar);

            row.innerHTML = `
                <img class="avatar" src="${escapeHtml(profilePicture)}" alt="${escapeHtml(message.username || 'User')} avatar">
                <div class="community-message-content">
                    <div class="community-message-meta">
                        <span class="username">${escapeHtml(message.username || 'Anonymous')}</span>
                        <span class="timestamp">${escapeHtml(formatMessageTimestamp(message.timestamp))}</span>
                    </div>
                    <div class="community-message-text">${escapeHtml(message.content || '')}</div>
                </div>
            `;
            return row;
        }

        function syncCommunityChatListener() {
            if (!communityPosts) return;

            if (communityChatUnsubscribe) {
                communityChatUnsubscribe();
                communityChatUnsubscribe = null;
            }

            if (!currentUser) {
                communityPosts.innerHTML = '<p>Please sign in to join the live chat.</p>';
                return;
            }

            communityPosts.innerHTML = '<p>Loading live chat...</p>';

            communityChatUnsubscribe = db.collection('communityPosts')
                .orderBy('timestamp', 'asc')
                .limit(250)
                .onSnapshot((querySnapshot) => {
                    communityPosts.innerHTML = '';
                    let hasMessages = false;

                    querySnapshot.forEach((doc) => {
                        if (doc.id === '_init_') return;
                        const message = doc.data() || {};
                        hasMessages = true;
                        communityPosts.appendChild(renderCommunityMessage(message, message.userId === currentUser.uid));
                    });

                    if (!hasMessages) {
                        communityPosts.innerHTML = '<p>No messages yet. Start the conversation.</p>';
                        return;
                    }

                    communityPosts.scrollTop = communityPosts.scrollHeight;
                }, (error) => {
                    console.error('Live chat listener error:', error);
                    communityPosts.innerHTML = '<p>Unable to load live chat right now.</p>';
                });
        }

        function loadCommunityPosts() {
            syncCommunityChatListener();
        }

        function submitCommunityPost() {
            if (!postContent) return;

            if (!currentUser) {
                showNotification('Please log in to chat', true);
                return;
            }

            const content = (postContent.value || '').trim();
            if (!content) {
                showNotification('Please enter a message', true);
                return;
            }

            const username = (currentUserProfileData && currentUserProfileData.username) || 'Anonymous';
            const profilePicture = normalizeProfilePicture(currentUserProfileData && currentUserProfileData.profilePicture);

            db.collection('communityPosts').add({
                userId: currentUser.uid,
                username,
                profilePicture,
                content,
                likes: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(() => {
                    postContent.value = '';
                })
                .catch((error) => {
                    console.error('Error sending chat message:', error);
                    showNotification('Error sending message: ' + error.message, true);
                });
        }

        // Override signup with profile picture support
        function signup(username, email, password, profilePicture) {
            showLoading();
            const safeProfilePicture = normalizeProfilePicture(profilePicture);

            return auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const userId = generateUserId();
                    const userRef = rtdb.ref('users/' + userCredential.user.uid);

                    return userRef.set({
                        userId: userId,
                        username: username,
                        email: email,
                        role: 'Member',
                        banned: false,
                        profilePicture: safeProfilePicture,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        lastLogin: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then(() => {
                    hideLoading();
                    showNotification('Account created successfully!');
                    window.location.href = pageUrl('index.html');
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Signup failed: ' + error.message, true);
                    throw error;
                });
        }

        function saveSettingsProfile() {
            if (!currentUser) return;
            const profilePicture = normalizeProfilePicture(settingsProfilePicture.value);

            showLoading();
            rtdb.ref('users/' + currentUser.uid).update({ profilePicture })
                .then(() => {
                    hideLoading();
                    showNotification('Profile picture updated successfully.');
                    return loadCurrentUserProfile();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Could not update profile picture: ' + error.message, true);
                });
        }

        function updateUserEmail(newEmail) {
            if (!currentUser) return Promise.resolve();
            const trimmedEmail = (newEmail || '').trim();
            if (!trimmedEmail) return Promise.reject(new Error('Please enter a valid email.'));

            showLoading();
            return currentUser.updateEmail(trimmedEmail)
                .then(() => rtdb.ref('users/' + currentUser.uid).update({ email: trimmedEmail }))
                .then(() => {
                    hideLoading();
                    showNotification('Email updated successfully.');
                    settingsEmail.value = trimmedEmail;
                    return loadCurrentUserProfile();
                })
                .catch((error) => {
                    hideLoading();
                    const message = error.code === 'auth/requires-recent-login'
                        ? 'Please log out and log back in before changing your email.'
                        : error.message;
                    showNotification('Email update failed: ' + message, true);
                    throw error;
                });
        }

        function updateUserPassword(newPassword, confirmPassword) {
            if (!currentUser) return Promise.resolve();
            if (newPassword !== confirmPassword) {
                showNotification('Passwords do not match.', true);
                return Promise.reject(new Error('Passwords do not match.'));
            }

            showLoading();
            return currentUser.updatePassword(newPassword)
                .then(() => {
                    hideLoading();
                    showNotification('Password updated successfully.');
                    settingsPassword.value = '';
                    settingsConfirmPassword.value = '';
                })
                .catch((error) => {
                    hideLoading();
                    const message = error.code === 'auth/requires-recent-login'
                        ? 'Please log out and log back in before changing your password.'
                        : error.message;
                    showNotification('Password update failed: ' + message, true);
                    throw error;
                });
        }

        function renderSenderHeader(message) {
            const senderName = message.senderName || message.username || 'User';
            const senderAvatar = normalizeProfilePicture(message.senderAvatar || message.profilePicture);
            return `
                <div class="message-sender-row">
                    <img class="message-sender-avatar" src="${escapeHtml(senderAvatar)}" alt="${escapeHtml(senderName)} avatar">
                    <span class="sender">${escapeHtml(senderName)}</span>
                </div>
            `;
        }

        // Override chat message renderers with avatar support
        function addProfileOption() {
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                showNotification('Access denied', true);
                return;
            }

            const label = (profileOptionLabel.value || '').trim();
            const imageUrl = (profileOptionUrl.value || '').trim();

            if (!label || !imageUrl) {
                showNotification('Please enter both label and image URL.', true);
                return;
            }

            showLoading();
            db.collection('profileOptions').add({
                label,
                imageUrl,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(() => {
                    hideLoading();
                    profileOptionLabel.value = '';
                    profileOptionUrl.value = '';
                    showNotification('Profile option added.');
                    return Promise.all([loadProfileOptions(), loadProfileOptionsForAdmin()]);
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Could not add profile option: ' + error.message, true);
                });
        }

        function removeProfileOption(optionId) {
            if (!optionId || optionId.startsWith('__')) return;
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                showNotification('Access denied', true);
                return;
            }

            showLoading();
            db.collection('profileOptions').doc(optionId).delete()
                .then(() => Promise.all([loadProfileOptions(), loadProfileOptionsForAdmin()]))
                .then(() => {
                    hideLoading();
                    showNotification('Profile option removed.');
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Could not remove profile option: ' + error.message, true);
                });
        }

        function saveDefaultProfileOption() {
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                showNotification('Access denied', true);
                return;
            }

            const selectedUrl = (defaultProfileSelect.value || '').trim();
            if (!selectedUrl) {
                showNotification('Please select a default profile picture.', true);
                return;
            }

            const selectedOption = profileOptionsCache.find((option) => option.imageUrl === selectedUrl);
            const defaultLabel = selectedOption ? selectedOption.label : 'Default Dragon';

            showLoading();
            db.collection('appSettings').doc('profilePictures').set({
                defaultUrl: selectedUrl,
                defaultLabel: defaultLabel,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
                .then(() => Promise.all([loadProfileOptions(), loadProfileOptionsForAdmin()]))
                .then(() => {
                    hideLoading();
                    showNotification('Default profile picture updated.');
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Could not update default profile: ' + error.message, true);
                });
        }

        function loadProfileOptionsForAdmin() {
            if (!profileOptionsList || !defaultProfileSelect) return Promise.resolve();
            if (!currentUser || (currentUser.email !== OWNER_EMAIL && userRoleData !== 'Admin')) {
                return Promise.resolve();
            }

            return loadProfileOptions().then(() => {
                defaultProfileSelect.innerHTML = '<option value="">Select an option</option>';
                profileOptionsCache.forEach((option) => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option.imageUrl;
                    optionEl.textContent = option.label;
                    defaultProfileSelect.appendChild(optionEl);
                });
                defaultProfileSelect.value = defaultProfilePictureUrl;

                profileOptionsList.innerHTML = '';
                profileOptionsCache.forEach((option) => {
                    const card = document.createElement('div');
                    card.className = 'profile-option-item';
                    const isDefault = option.imageUrl === defaultProfilePictureUrl;
                    card.innerHTML = `
                        <div class="profile-option-item-main">
                            <img src="${escapeHtml(option.imageUrl)}" alt="${escapeHtml(option.label)}">
                            <span class="label">${escapeHtml(option.label)}${isDefault ? ' (Default)' : ''}</span>
                        </div>
                        <div class="profile-option-actions">
                            <button class="tiny-btn set-default-btn" data-url="${escapeHtml(option.imageUrl)}">Default</button>
                            <button class="tiny-btn remove-profile-option-btn" data-id="${escapeHtml(option.id)}">Remove</button>
                        </div>
                    `;
                    profileOptionsList.appendChild(card);
                });

                profileOptionsList.querySelectorAll('.set-default-btn').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        defaultProfileSelect.value = btn.getAttribute('data-url');
                        saveDefaultProfileOption();
                    });
                });
                profileOptionsList.querySelectorAll('.remove-profile-option-btn').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        removeProfileOption(btn.getAttribute('data-id'));
                    });
                });
            });
        }
        
        const LOGICAL_PAGE_FROM_APP = {
            index: 'main',
            login: 'login',
            signup: 'signup',
            community: 'community',
            settings: 'settings',
            admin: 'admin'
        };

        // Event Listeners
        document.addEventListener('DOMContentLoaded', () => {
            syncNavActive();

            navLinks.forEach((link) => {
                link.addEventListener('click', (e) => {
                    const pageId = link.getAttribute('data-page');
                    if (!pageId) return;
                    e.preventDefault();
                    navigateToPageForAuth(pageId);
                });
            });

            if (signupProfilePicture) {
                signupProfilePicture.addEventListener('change', updateSignupProfilePreview);
            }
            if (settingsProfilePicture) {
                settingsProfilePicture.addEventListener('change', updateSettingsProfilePreview);
            }

            adminMenuItems.forEach((item) => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const sectionId = item.getAttribute('data-section');
                    showAdminSection(sectionId);

                    switch (sectionId) {
                        case 'users':
                            loadUsers();
                            break;
                        case 'roles':
                            loadUsersForRoleManagement();
                            break;
                        case 'profiles':
                            loadProfileOptionsForAdmin();
                            break;
                        case 'dashboard':
                            updateDashboardStats();
                            break;
                        default:
                            break;
                    }
                });
            });

            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('loginEmail').value;
                    const password = document.getElementById('loginPassword').value;
                    login(email, password);
                });
            }

            if (signupForm) {
                signupForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const username = document.getElementById('signupUsername').value.trim();
                    const email = document.getElementById('signupEmail').value.trim();
                    const password = document.getElementById('signupPassword').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;
                    const selectedProfilePicture = (signupProfilePicture && signupProfilePicture.value) || defaultProfilePictureUrl;

                    if (!username) {
                        showNotification('Please choose a username.', true);
                        return;
                    }
                    if (password !== confirmPassword) {
                        showNotification('Passwords do not match!', true);
                        return;
                    }

                    signup(username, email, password, selectedProfilePicture);
                });
            }

            if (updateEmailForm) {
                updateEmailForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    updateUserEmail(settingsEmail.value);
                });
            }

            if (updatePasswordForm) {
                updatePasswordForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    updateUserPassword(settingsPassword.value, settingsConfirmPassword.value);
                });
            }

            if (saveSettingsProfileBtn) {
                saveSettingsProfileBtn.addEventListener('click', saveSettingsProfile);
            }

            if (submitPost) {
                submitPost.addEventListener('click', submitCommunityPost);
            }
            if (postContent) {
                postContent.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitCommunityPost();
                    }
                });
            }

            if (changeRoleBtn) {
                changeRoleBtn.addEventListener('click', changeUserRole);
            }
            if (addProfileOptionBtn) {
                addProfileOptionBtn.addEventListener('click', addProfileOption);
            }
            if (saveDefaultProfileBtn) {
                saveDefaultProfileBtn.addEventListener('click', saveDefaultProfileOption);
            }

            if (loginBtn) {
                loginBtn.addEventListener('click', () => navigateToPageForAuth('login'));
            }
            if (signupBtn) {
                signupBtn.addEventListener('click', () => navigateToPageForAuth('signup'));
            }
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
            if (showSignup) {
                showSignup.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateToPageForAuth('signup');
                });
            }
            if (showLogin) {
                showLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateToPageForAuth('login');
                });
            }
            if (heroSignupBtn) {
                heroSignupBtn.addEventListener('click', () => navigateToPageForAuth('signup'));
            }

            loadProfileOptions().then(() => {
                const logicalPage = LOGICAL_PAGE_FROM_APP[APP_PAGE] || 'main';

                auth.onAuthStateChanged((user) => {
                    if (user) {
                        currentUser = user;
                        if (userInfo) userInfo.style.display = 'flex';
                        if (loginBtn) loginBtn.style.display = 'none';
                        if (signupBtn) signupBtn.style.display = 'none';
                        if (loginLink) loginLink.style.display = 'none';
                        if (communityLink) communityLink.style.display = 'block';
                        if (settingsLink) settingsLink.style.display = 'block';

                        checkAdminStatus(user).then(() => {
                            loadCurrentUserProfile();

                            if (logicalPage === 'login' || logicalPage === 'signup') {
                                window.location.href = pageUrl('index.html');
                                return;
                            }

                            const isAdminUser = userRoleData === 'Admin' || userRoleData === 'Owner';
                            if (logicalPage === 'admin' && !isAdminUser) {
                                window.location.href = pageUrl('index.html');
                                return;
                            }

                            if (logicalPage === 'community') {
                                loadCommunityPosts();
                            }
                            if (logicalPage === 'settings') {
                                loadCurrentUserProfile();
                            }
                            if (logicalPage === 'admin' && isAdminUser) {
                                updateDashboardStats();
                                loadProfileOptionsForAdmin();
                            }
                        });
                    } else {
                        currentUser = null;
                        currentUserProfileData = null;
                        userRoleData = null;
                        if (userInfo) userInfo.style.display = 'none';
                        if (loginBtn) loginBtn.style.display = 'block';
                        if (signupBtn) signupBtn.style.display = 'block';
                        if (loginLink) loginLink.style.display = 'block';
                        if (communityLink) communityLink.style.display = 'none';
                        if (settingsLink) settingsLink.style.display = 'none';
                        if (adminLink) adminLink.style.display = 'none';

                        if (['community', 'settings', 'admin'].includes(logicalPage)) {
                            window.location.href = pageUrl('login.html');
                        }
                    }
                });
            });

            updateDashboardStats();
        });
