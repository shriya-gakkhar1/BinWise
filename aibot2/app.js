
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    increment,
    collection,
    query,
    onSnapshot,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // firebas
    const firebaseConfig = {
      apiKey: "AIzaSyCYq0PqEXeHlPrLnMBBseEh9yEX5hNkLfQ",
      authDomain: "campus-waste-navigator.firebaseapp.com",
      projectId: "campus-waste-navigator",
      storageBucket: "campus-waste-navigator.appspot.com",
      messagingSenderId: "410101511237",
      appId: "1:410101511237:web:9f98d58c52fa74aa909f2c"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // GLOBAL VARIABLES & STATIC DATA
    let map;
    let currentUser = null;
    let currentUserName = 'Anonymous';
    let leaderboardUnsubscribe = null;
    let postsUnsubscribe = null;
    let qrCodeScanner = null;
    let allUsers = []; 

    const binData = {
        "type": "FeatureCollection",
        "features": [
            { "type": "Feature", "geometry": { "type": "Point", "coordinates": [75.876972, 26.776444] }, "properties": { "id": "bin-001", "type": "Recycling", "description": "Near Main Gate", "imageUrl": "bin001.jpg" }},
            { "type": "Feature", "geometry": { "type": "Point", "coordinates": [75.877972, 26.775417] }, "properties": { "id": "bin-002", "type": "Compost", "description": "Outside Cafeteria", "imageUrl": "bin004.jpg" }},
            { "type": "Feature", "geometry": { "type": "Point", "coordinates": [75.876112, 26.775621] }, "properties": { "id": "bin-003", "type": "E-Waste", "description": "Inside Engineering Block", "imageUrl": "ebin.jpg" }},
            { "type": "Feature", "geometry": { "type": "Point", "coordinates": [ 75.878842, 26.776610] }, "properties": { "id": "bin-004", "type": "General", "description": "Behind Student Hostels", "imageUrl": "bin003.jpg" }},
            { "type": "Feature", "geometry": { "type": "Point", "coordinates": [75.8785, 26.7760] }, "properties": { "id": "bin-005", "type": "General", "description": "Near NYB", "imageUrl": "bin002.jpg" }}
        ]
    };

    const wasteDirectory = [
        { item: "chip packet", icon: "🛍️", bin: "General", note: "Most chip packets are mixed material and not recyclable." },
        { item: "plastic bottle", icon: "🍾", bin: "Recycling", note: "Empty and crush the bottle before disposing.", fact: "A plastic bottle can take 450 years to decompose in a landfill." },
        { item: "soda can", icon: "🥫", bin: "Recycling", note: "Aluminum cans are highly recyclable.", fact: "Recycling one aluminum can saves enough energy to run a TV for 3 hours." },
        { item: "coffee cup", icon: "☕", bin: "General", note: "Most disposable cups have a plastic lining and can't be recycled." },
        { item: "paper", icon: "📄", bin: "Recycling", note: "Clean, un-creased paper and cardboard." },
        { item: "newspaper", icon: "📰", bin: "Recycling", note: "Goes in the paper recycling bin." },
        { item: "banana peel", icon: "🍌", bin: "Compost", note: "All raw fruit and vegetable scraps can be composted." },
        { item: "apple core", icon: "🍎", bin: "Compost", note: "All raw fruit and vegetable scraps can be composted." },
        { item: "old batteries", icon: "🔋", bin: "E-Waste", note: "Never throw batteries in general waste. They are hazardous." },
        { item: "broken phone", icon: "📱", bin: "E-Waste", note: "Electronic waste must be disposed of at designated points." },
        { item: "wires", icon: "🔌", bin: "E-Waste", note: "Electronic waste must be disposed of at designated points." },
        { item: "glass bottle", icon: "🍾", bin: "Recycling", note: "Check for a separate glass recycling bin if available.", fact: "Recycling glass reduces air pollution by 20% and water pollution by 50%." },
        { item: "broken earphones", icon: "🎧", bin: "E-Waste", note: "Dispose of these in a 폐가전제품 (small electronics) bin, often found at community centers. Do not put them in general waste.", fact: "E-waste contains valuable materials but also toxic substances that can harm the environment if sent to a landfill." }
    ];

    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const authError = document.getElementById('auth-error');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmailEl = document.getElementById('userEmail');
    const dashboardPointsEl = document.getElementById('dashboard-points');
    const dashboardRankEl = document.getElementById('dashboard-rank');
    const scanFeedbackEl = document.getElementById('scan-feedback');
    const leaderboardEl = document.getElementById('leaderboard');
    
    // Community View Elements
    const addPostBtn = document.getElementById('addPostBtn');
    const postFormContainer = document.getElementById('post-form-container');
    const postTitleInput = document.getElementById('postTitle');
    const postContentInput = document.getElementById('postContent');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const submitPostBtn = document.getElementById('submitPostBtn');
    const postsContainer = document.getElementById('posts-container');
    const postFormFeedback = document.getElementById('post-form-feedback');
    
    //Auth logic
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loginView.classList.remove('active');
            appView.classList.add('active');
            initializeAppUI(user);
            fetchUserData(user);
        } else {
            currentUser = null;
            appView.classList.remove('active');
            loginView.classList.add('active');
            if (leaderboardUnsubscribe) leaderboardUnsubscribe();
            if (postsUnsubscribe) postsUnsubscribe();
        }
    });

    loginBtn.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
            .catch(error => { authError.textContent = "Invalid email or password."; });
    });

    signupBtn.addEventListener('click', async () => {
        if (passwordInput.value.length < 6) {
            authError.textContent = "Password must be at least 6 characters long.";
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                points: 0,
                name: user.email.split('@')[0],
                lastScans: {}
            });
        } catch (error) {
            authError.textContent = error.code === 'auth/email-already-in-use' ? "This email is already registered. Please log in." : "Could not create account.";
        }
    });
    
    logoutBtn.addEventListener('click', () => signOut(auth));


   
    function initializeAppUI(user) {
        setupNavigation();
        initializeMapView();
        initializeGuideView();
        initializeScanView();
        initializeLeaderboardView();
        initializeCommunityView(); 
    }

    async function fetchUserData(user) {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            currentUserName = userData.name || userData.email;
            userEmailEl.textContent = currentUserName;
            dashboardPointsEl.textContent = userData.points || 0;
            updateUserRank();
        }
    }
    
    function updateUserRank() {
        if (currentUser && allUsers.length > 0) {
            const userRank = allUsers.findIndex(user => user.id === currentUser.uid) + 1;
            dashboardRankEl.textContent = userRank > 0 ? `#${userRank}` : "N/A";
        }
    }

    // Community
    function initializeCommunityView() {
        addPostBtn.addEventListener('click', () => {
            postFormContainer.classList.toggle('hidden');
        });

        cancelPostBtn.addEventListener('click', () => {
            postFormContainer.classList.add('hidden');
            postTitleInput.value = '';
            postContentInput.value = '';
            postFormFeedback.textContent = '';
            postFormFeedback.classList.remove('success');
        });

        submitPostBtn.addEventListener('click', async () => {
            const title = postTitleInput.value.trim();
            const content = postContentInput.value.trim();
            
            postFormFeedback.textContent = '';
            postFormFeedback.classList.remove('success');

            if (!title || !content) {
                postFormFeedback.textContent = 'Please fill out both the title and content.';
                return;
            }

            submitPostBtn.disabled = true;
            postFormFeedback.textContent = 'Submitting...';
            postFormFeedback.classList.add('success');

            try {
                await addDoc(collection(db, 'public/data/posts'), {
                    title: title,
                    content: content,
                    authorName: currentUserName,
                    authorId: currentUser.uid,
                    createdAt: serverTimestamp()
                });
                
                postFormFeedback.textContent = 'Post submitted successfully!';
                
                setTimeout(() => {
                    cancelPostBtn.click();
                    submitPostBtn.disabled = false;
                }, 1500);

            } catch (error) {
                console.error("Error adding document: ", error);
                postFormFeedback.textContent = 'Could not submit post. Please try again.';
                submitPostBtn.disabled = false;
            }
        });

        // Listen for real-time updates on posts
        const q = query(collection(db, "public/data/posts"), orderBy("createdAt", "desc"));
        if (postsUnsubscribe) postsUnsubscribe();

        postsUnsubscribe = onSnapshot(q, (querySnapshot) => {
            postsContainer.innerHTML = '';
            if (querySnapshot.empty) {
                postsContainer.innerHTML = '<p>No posts yet. Be the first to share something!</p>';
                return;
            }
            querySnapshot.forEach((docSnapshot) => {
                const post = docSnapshot.data();
                const postEl = document.createElement('div');
                postEl.classList.add('post-card');
                
                const date = post.createdAt?.toDate().toLocaleString() || 'Just now';

                let deleteButtonHTML = '';
                if (currentUser && post.authorId === currentUser.uid) {
                    deleteButtonHTML = `<button class="delete-post-btn" data-id="${docSnapshot.id}"><span class="material-symbols-outlined">delete</span></button>`;
                }

                postEl.innerHTML = `
                    ${deleteButtonHTML}
                    <h3>${post.title}</h3>
                    <div class="post-card-meta">
                        By <strong>${post.authorName}</strong> on ${date}
                    </div>
                    <p class="post-card-content">${post.content}</p>
                `;
                postsContainer.appendChild(postEl);
            });

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.currentTarget.dataset.id;
                    if (postId) {
                        try {
                            await deleteDoc(doc(db, 'public/data/posts', postId));
                        } catch (error) {
                            console.error("Error deleting post: ", error);
                        }
                    }
                });
            });
        });
    }


    function initializeScanView() {
        if (document.getElementById('qr-reader')) {
            qrCodeScanner = new Html5Qrcode("qr-reader");
        }
    }

    async function awardPointsForScan(binId) {
        if (!currentUser) return;
        scanFeedbackEl.textContent = `Scanned ${binId}. Checking...`;
        
        const bin = binData.features.find(feature => feature.properties.id === binId);
        if (!bin) {
            scanFeedbackEl.textContent = "Unknown QR code.";
            resetScannerUI();
            return;
        }
        
        const binType = bin.properties.type;
        let pointsToAdd = 0;
        switch (binType) {
            case 'General': pointsToAdd = 10; break;
            case 'Recycling': pointsToAdd = 20; break;
            case 'Compost': pointsToAdd = 5; break;
            case 'E-Waste': pointsToAdd = 30; break;
            default: pointsToAdd = 1;
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        const today = new Date().toISOString().slice(0, 10);

        try {
            const docSnap = await getDoc(userDocRef);
            let userData = docSnap.data();
            if (!userData) {
                await setDoc(userDocRef, { email: currentUser.email, name: currentUser.email.split('@')[0], points: 0, lastScans: {} });
                userData = (await getDoc(userDocRef)).data();
            }
            if (!userData.lastScans) userData.lastScans = {};

            if (userData.lastScans[binId] === today) {
                scanFeedbackEl.textContent = "You've already scanned this bin today.";
            } else {
                const newLastScans = { ...userData.lastScans, [binId]: today };
                await updateDoc(userDocRef, {
                    points: increment(pointsToAdd),
                    lastScans: newLastScans
                });
                scanFeedbackEl.textContent = `+${pointsToAdd} Eco Points for ${binType} waste!`;
                fetchUserData(currentUser);
            }
        } catch (error) {
            scanFeedbackEl.textContent = `Error: ${error.code || "Could not process scan."}`;
        }
        resetScannerUI();
    }
    
    function resetScannerUI() {
        setTimeout(() => { 
            scanFeedbackEl.innerHTML = '<button id="rescanBtn" class="category-btn">Scan Another</button>';
            const rescanBtn = document.getElementById('rescanBtn');
            if(rescanBtn) {
                rescanBtn.onclick = () => {
                    scanFeedbackEl.textContent = '';
                    startScanner();
                };
            }
        }, 5000);
    }

    function startScanner() {
        if (!qrCodeScanner) return;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        const successCallback = (decodedText) => {
            if (qrCodeScanner && qrCodeScanner.isScanning) {
                qrCodeScanner.stop().then(() => awardPointsForScan(decodedText));
            }
        };
        qrCodeScanner.start({ facingMode: "environment" }, config, successCallback)
            .catch(() => { scanFeedbackEl.textContent = "Could not start camera."; });
    }

    function initializeLeaderboardView() {
        const q = query(collection(db, "users"), orderBy("points", "desc"));
        if (leaderboardUnsubscribe) leaderboardUnsubscribe();
        
        leaderboardUnsubscribe = onSnapshot(q, (querySnapshot) => {
            allUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            leaderboardEl.innerHTML = '';
            allUsers.slice(0, 10).forEach((user, index) => {
                const itemEl = document.createElement('div');
                itemEl.classList.add('leaderboard-item');
                if (currentUser && user.id === currentUser.uid) {
                    itemEl.classList.add('is-user');
                }
                itemEl.innerHTML = `
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${user.name || user.email}</span>
                    <span class="leaderboard-points">${user.points || 0} pts</span>
                `;
                leaderboardEl.appendChild(itemEl);
            });
            updateUserRank();
        });
    }

   
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link, .action-card');
        const contentPanes = document.querySelectorAll('.content-view');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const mobileMenu = document.getElementById('mobileMenu');
                if (mobileMenu) mobileMenu.classList.remove('show');

                const viewId = link.getAttribute('data-view');
                
                if (qrCodeScanner && qrCodeScanner.isScanning) {
                    qrCodeScanner.stop().catch(() => {});
                }

                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                const activeNavLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
                if(activeNavLink) activeNavLink.classList.add('active');

                contentPanes.forEach(pane => pane.classList.remove('active'));
                const activePane = document.getElementById(viewId);
                if (activePane) activePane.classList.add('active');

                if (viewId === 'scan-view') {
                    scanFeedbackEl.textContent = '';
                    startScanner();
                }

                if (viewId === 'map-view' && map) {
                    setTimeout(() => map.invalidateSize(), 100);
                }
            });
        });
    }

    function initializeMapView() {
        if (document.getElementById('map')._leaflet_id) return; 
        map = L.map('map').setView([26.7760, 75.8774], 17); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        const iconLibrary = { 
            General: L.icon({ iconUrl: 'https://placehold.co/32x32/333333/FFFFFF?text=G', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }), 
            Recycling: L.icon({ iconUrl: 'https://placehold.co/32x32/28a745/FFFFFF?text=R', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }), 
            'E-Waste': L.icon({ iconUrl: 'https://placehold.co/32x32/ffc107/FFFFFF?text=E', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }), 
            Compost: L.icon({ iconUrl: 'https://placehold.co/32x32/6f4e37/FFFFFF?text=C', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }) 
        };
         L.geoJSON(binData, { 
            pointToLayer: (feature, latlng) => L.marker(latlng, { icon: iconLibrary[feature.properties.type] || iconLibrary['General'] }), 
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const popupContent = `
                    <div class="map-popup">
                        <img src="${props.imageUrl}" alt="${props.type} Bin" onerror="this.onerror=null;this.src='https://placehold.co/200x100/cccccc/FFFFFF?text=Image+Not+Found';" class="popup-image">
                        <div class="popup-content">
                            <h3>${props.id}</h3>
                            <p><b>${props.type} Bin</b></p>
                            <p>${props.description}</p>
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
            }
        }).addTo(map);
    }

    //ai guide
    // --- GEMINI POWERED AI GUIDE CHAT LOGIC ---
    function initializeGuideView() {
        const chatLog = document.getElementById('guide-chat-log');
        const userInput = document.getElementById('guide-user-input');
        const sendButton = document.getElementById('guide-send-button');
        let isFirstMessage = true;
        let chatHistory = [];

        const displayMessage = (message, sender) => {
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', sender);
            
            const bubble = document.createElement('div');
            bubble.classList.add('message-bubble');
            
            if (sender === 'bot') {
                // Manual Markdown to HTML conversion to avoid external libraries and encoding issues.
                let html = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Handle bolding first.
                
                // Then, handle list items line by line.
                const lines = html.split('\n').map(line => {
                    if (line.trim().startsWith('* ')) {
                        return `&bull; ${line.trim().substring(2)}`; // Replace '* ' with a bullet.
                    }
                    return line;
                });

                bubble.innerHTML = lines.join('<br>'); // Join lines with <br> for display.

            } else {
                const p = document.createElement('p');
                p.textContent = message;
                bubble.appendChild(p);
            }
            
            messageElement.appendChild(bubble);
            chatLog.appendChild(messageElement);
            chatLog.scrollTop = chatLog.scrollHeight;
        };
        
        const displayTypingIndicator = () => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', 'bot');
            messageElement.id = 'typing-indicator';
            
            const bubble = document.createElement('div');
            bubble.classList.add('message-bubble');
            bubble.innerHTML = `<p class="typing-dots"><span>.</span><span>.</span><span>.</span></p>`;
            
            messageElement.appendChild(bubble);
            chatLog.appendChild(messageElement);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        const getBotResponse = async (input) => {
            const apiKey = "AIzaSyAyN86ePJpz9y0q-B3CS-Q_MUM-i8WFJk8"; // The platform will provide the key
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const systemInstruction = {
                role: "system",
                parts: [{ text: `You are the BinWise AI Guide, a friendly and helpful assistant for the BinWise-JECRC campus waste management app. Your goal is to answer user questions about waste, recycling, and the app itself. 
            
                Here is the specific data for the JECRC campus. You MUST use this information to answer questions accurately.
                
                Bin Locations Data: ${JSON.stringify(binData)}
                
                Waste Item Directory: ${JSON.stringify(wasteDirectory)}
    
                When a user asks where an item goes, first check the Waste Item Directory. If it's there, provide the answer based on the directory, including the note and the fun fact if available. If the item is not in the directory, use your general knowledge to provide the best possible answer for waste disposal. If a user asks about a bin location (e.g., "where is bin-001?"), use the Bin Locations Data. Be conversational and helpful.`}]
            };

            // Add the user's new message to the history
            chatHistory.push({ role: "user", parts: [{ text: input }] });

            const payload = {
                contents: chatHistory,
                systemInstruction: systemInstruction
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0) {
                    const botResponseText = result.candidates[0].content.parts[0].text;
                    // Add the bot's response to the history for future context
                    chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
                    return botResponseText;
                } else {
                    // If no response, remove the user's last message from history to allow a retry
                    chatHistory.pop();
                    return "I'm having a little trouble thinking right now. Please try again in a moment.";
                }

            } catch (error) {
                // If there's an error, remove the user's last message from history to allow a retry
                chatHistory.pop();
                console.error("Error calling Gemini API:", error);
                return "Sorry, I can't connect to my brain right now. Please check your connection and try again.";
            }
        };

        const handleSendMessage = async () => {
            const message = userInput.value.trim();
            if (message === '') return;

            displayMessage(message, 'user');
            userInput.value = '';
            sendButton.disabled = true;
            displayTypingIndicator();

            const botResponse = await getBotResponse(message);
            displayMessage(botResponse, 'bot');
            sendButton.disabled = false;
            userInput.focus();
        };

        sendButton.addEventListener('click', handleSendMessage);
        userInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleSendMessage();
            }
        });
        
        if (isFirstMessage) {
            setTimeout(() => {
                const welcomeMessage = "Hello! I'm the BinWise AI Guide. Ask me anything about recycling, compost, or where to find bins on campus!";
                displayMessage(welcomeMessage, 'bot');
                // We no longer add the welcome message to the history, as the system prompt handles the context.
                isFirstMessage = false;
            }, 500);
        }
    }

    // --- Mobile Menu Toggle ---
    const menuToggleBtn = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobileMenu');

    if (menuToggleBtn && mobileNav) {
        menuToggleBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('show');
        });
    }

    // Add CSS for typing indicator dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .typing-dots span {
            animation: blink 1.4s infinite both;
            font-size: 1.5rem;
            font-weight: bold;
        }
        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes blink {
            0% { opacity: 0.2; }
            20% { opacity: 1; }
            100% { opacity: 0.2; }
        }
    `;
    document.head.appendChild(style);
});
