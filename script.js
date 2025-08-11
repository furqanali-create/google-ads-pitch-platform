// --- Firebase v9 Modular Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs, 
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBY6QzDwyF3oDvQTfwTTFGtVqB7QefOhi0",
  authDomain: "ads-pitch-platform.firebaseapp.com",
  projectId: "ads-pitch-platform",
  storageBucket: "ads-pitch-platform.firebasestorage.app",
  messagingSenderId: "1080086729632",
  appId: "1:1080086729632:web:366a3033e22eb2d8754ac5",
  measurementId: "G-3XZPMVNVSC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Page Navigation & State Management ---
const pages = document.querySelectorAll('.page');
const mainContentContainer = document.getElementById('main-content');
const appNavLinks = document.querySelectorAll('.app-nav-link');
let currentUser = null;
let currentUsername = '';
let currentUserRole = 'rep'; // Default role

const quizQuestions = [
    {
        question: "What is the foundational prerequisite for almost all value-based Smart Bidding strategies?",
        options: { a: "A high daily budget", b: "Accurate Conversion Tracking", c: "At least 5 ad groups" },
        correct: "b"
    },
    {
        question: "Which bidding strategy is best suited for an e-commerce client whose primary goal is achieving a specific return on their ad spend?",
        options: { a: "Maximize Clicks", b: "Target CPA", c: "Target ROAS" },
        correct: "c"
    },
    {
        question: "A client wants their ads at the absolute top of the page 80% of the time. Which strategy should you pitch?",
        options: { a: "Target Impression Share", b: "Maximize Conversions", c: "Manual CPC" },
        correct: "a"
    }
];
let currentQuestion = {};

function showPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    const pageToShow = document.getElementById(pageId);
    if(pageToShow) pageToShow.classList.add('active');
}

async function showAppPage(pageId) {
    const template = document.getElementById(pageId + 'Content');
    if (!template) return;

    appNavLinks.forEach(link => {
        link.classList.remove('active');
        const linkPageId = link.dataset.page;
        if (linkPageId === pageId) {
            link.classList.add('active');
        }
    });

    mainContentContainer.style.opacity = '0';
    mainContentContainer.style.transform = 'translateY(10px)';

    setTimeout(async () => {
        mainContentContainer.innerHTML = template.innerHTML;

        if (pageId === 'leaderboardPage') {
            mainContentContainer.innerHTML = `<div class="bg-gray-800 bg-opacity-50 border border-gray-700 p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-extrabold text-white">Quiz Leaderboard</h2><p class="mt-2 text-gray-400">Users who have passed the knowledge check.</p><div class="text-center p-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div><p class="mt-4">Loading Leaderboard...</p></div></div>`;
            await fetchLeaderboard();
        }
        
        mainContentContainer.style.opacity = '1';
        mainContentContainer.style.transform = 'translateY(0px)';

        if(pageId === 'toolPage') bindToolEvents();
        if (pageId === 'suggestionsPage') bindSuggestionFormEvents();
        if (pageId === 'clientsPage') bindClientEvents();
    }, 200);
}

function bindClientEvents() {
    const addClientBtn = document.getElementById('add-client-btn');
    const clientModal = document.getElementById('client-modal');
    const cancelClientBtn = document.getElementById('cancel-client-btn');
    const saveClientBtn = document.getElementById('save-client-btn');

    const openModal = () => clientModal.classList.remove('hidden');
    const closeModal = () => clientModal.classList.add('hidden');

    addClientBtn.addEventListener('click', openModal);
    cancelClientBtn.addEventListener('click', closeModal);
    saveClientBtn.addEventListener('click', saveClientNote);

    loadClients();
}

function saveClientNote() {
    const clientNameInput = document.getElementById('client-name');
    const clientNotesInput = document.getElementById('client-notes');
    const name = clientNameInput.value.trim();
    const note = clientNotesInput.value.trim();
    if (!name || !note) return;

    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    const newNote = {
        text: note,
        date: new Date().toLocaleString()
    };
    
    const existingClient = clients.find(c => c.name === name);
    if (existingClient) {
        existingClient.notes.push(newNote);
    } else {
        clients.push({ name: name, notes: [newNote] });
    }

    localStorage.setItem('clients', JSON.stringify(clients));
    loadClients();
    document.getElementById('client-modal').classList.add('hidden');
    clientNameInput.value = '';
    clientNotesInput.value = '';
}

function loadClients() {
    const clients = JSON.parse(localStorage.getItem('clients')) || [];
    const clientListEl = document.getElementById('client-list');
    if (!clientListEl) return;
    clientListEl.innerHTML = '';
    if (clients.length === 0) {
        clientListEl.innerHTML = `<p class="text-gray-400 text-center">No clients added yet.</p>`;
    } else {
        clients.forEach(client => {
            const clientEl = document.createElement('div');
            clientEl.className = 'p-4 border border-gray-700 rounded-lg bg-gray-800';
            let notesHtml = client.notes.map(note => `<div class="text-sm text-gray-400 mt-2 p-2 bg-gray-700 rounded"><span class="font-semibold text-gray-200">${note.date}:</span> ${note.text}</div>`).join('');
            clientEl.innerHTML = `<h3 class="font-bold text-lg text-white">${client.name}</h3>${notesHtml}`;
            clientListEl.appendChild(clientEl);
        });
    }
}

function bindToolEvents() {
    renderStepper();
    renderPinnedStrategies();
    const stepperItems = document.querySelectorAll('#stepper .stepper-card');
    stepperItems.forEach((item, index) => {
        item.addEventListener('click', () => selectStrategy(item.dataset.strategyKey, index));
    });
    
    document.getElementById('pin-strategy-btn')?.addEventListener('click', handlePinStrategy);

    const tabs = document.querySelectorAll('#strategy-guide .tab-button');
     tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const pitchSections = document.querySelectorAll('#strategy-guide .pitch-section');
            pitchSections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(`${targetTab}-content`);
            if(targetSection) targetSection.classList.add('active');
        });
    });
}

function handlePinStrategy() {
    const currentStrategy = document.getElementById('strategy-title').dataset.strategyKey;
    if (!currentStrategy) return;
    
    let pinned = JSON.parse(localStorage.getItem('pinnedStrategies')) || [];
    if (pinned.includes(currentStrategy)) {
        pinned = pinned.filter(s => s !== currentStrategy);
    } else {
        pinned.push(currentStrategy);
    }
    localStorage.setItem('pinnedStrategies', JSON.stringify(pinned));
    renderPinnedStrategies();
    const pinButton = document.getElementById('pin-strategy-btn');
    if(pinned.includes(currentStrategy)) {
        pinButton.classList.add('text-amber-400');
    } else {
        pinButton.classList.remove('text-amber-400');
    }
}

function renderPinnedStrategies() {
    const pinned = JSON.parse(localStorage.getItem('pinnedStrategies')) || [];
    const pinnedListEl = document.getElementById('pinned-list');
    if (!pinnedListEl) return;
    pinnedListEl.innerHTML = '';
    if (pinned.length === 0) {
        pinnedListEl.innerHTML = `<p class="text-sm text-gray-500 text-center">Click the star icon on a strategy to pin it here.</p>`;
        return;
    }
    pinned.forEach(key => {
        const strategy = strategyData[key];
        if (!strategy) return;
        const button = document.createElement('button');
        button.className = 'w-full text-left p-3 rounded-md bg-amber-900 bg-opacity-50 hover:bg-opacity-75 text-amber-300 font-semibold text-sm';
        button.textContent = strategy.title;
        button.onclick = () => {
             const funnelIndex = funnelOrder.indexOf(key);
             selectStrategy(key, funnelIndex);
        };
        pinnedListEl.appendChild(button);
    });
}

function bindSuggestionFormEvents() {
    const suggestionForm = document.getElementById('suggestionForm');
     if (suggestionForm) {
        suggestionForm.addEventListener('submit', handleSuggestionSubmit);
    }
}

async function handleSuggestionSubmit(e) {
    e.preventDefault();
    const suggestionText = document.getElementById('suggestionText');
    const suggestionSuccessEl = document.getElementById('suggestion-success');
    const text = suggestionText.value;
    if (!text || !currentUser) return;

    try {
        await addDoc(collection(db, 'suggestions'), {
            suggestion: text,
            user: currentUser.email,
            timestamp: serverTimestamp()
        });
        suggestionSuccessEl.textContent = 'Thank you for your suggestion!';
        suggestionForm.reset();
        setTimeout(() => suggestionSuccessEl.textContent = '', 3000);
    } catch (error) {
        suggestionSuccessEl.textContent = 'Error: ' + error.message;
        suggestionSuccessEl.classList.remove('text-green-400');
        suggestionSuccessEl.classList.add('text-red-400');
    }
}

appNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showAppPage(link.dataset.page);
    });
});

// --- Authentication Logic ---
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const usernameField = document.getElementById('username-field');
const authErrorEl = document.getElementById('auth-error');
const authTitleEl = document.getElementById('auth-title');
const toggleAuthModeEl = document.getElementById('toggle-auth-mode');
const logoutButton = document.getElementById('logoutButton');
let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authErrorEl.textContent = '';
    if (isLoginMode) {
        authTitleEl.textContent = 'Account Manager Login';
        signupButton.style.display = 'none';
        loginButton.style.display = 'flex';
        usernameField.style.display = 'none';
        toggleAuthModeEl.textContent = 'Need to create an account? Sign Up';
    } else {
        authTitleEl.textContent = 'Create an Account';
        signupButton.style.display = 'flex';
        loginButton.style.display = 'none';
        usernameField.style.display = 'block';
        toggleAuthModeEl.textContent = 'Already have an account? Login';
    }
}
toggleAuthMode();

toggleAuthModeEl.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
});

signupButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value.trim();
    if (!username) {
        authErrorEl.textContent = 'Please enter your name for the leaderboard.';
        return;
    }
    
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            authErrorEl.textContent = 'This username is already taken. Please choose another.';
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', userCredential.user.uid);
        const role = email.includes('manager') ? 'manager' : 'rep';
        await setDoc(userRef, { username: username, email: email, role: role });
    } catch (error) {
        authErrorEl.textContent = error.message;
    }
});

loginButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        authErrorEl.textContent = error.message;
    }
});

logoutButton.addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
    const managerLinks = document.querySelectorAll('.manager-only');
    if (user) {
        currentUser = user;
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            currentUsername = docSnap.data().username;
            currentUserRole = docSnap.data().role || 'rep';
        }

        if (currentUserRole === 'manager') {
            managerLinks.forEach(link => link.style.display = 'flex');
        } else {
            managerLinks.forEach(link => link.style.display = 'none');
        }

        const quizDocRef = doc(db, "leaderboard", user.uid);
        const quizDocSnap = await getDoc(quizDocRef);
        if (quizDocSnap.exists()) {
            showPage('mainAppContainer');
            showAppPage('toolPage');
        } else {
            showPage('quizPage');
            loadNewQuizQuestion();
        }
    } else {
        currentUser = null;
        showPage('loginPage');
    }
});


// --- Quiz Logic ---
const submitQuizButton = document.getElementById('submitQuizButton');
const quizFeedbackEl = document.getElementById('quiz-feedback');
const quizContainer = document.getElementById('quiz-container');
const successAnimationEl = document.getElementById('success-animation');

function loadNewQuizQuestion() {
    // Select a random question from the pool
    currentQuestion = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
    
    quizContainer.innerHTML = `
        <div class="quiz-question">
            <p class="font-semibold text-lg text-white">${currentQuestion.question}</p>
            <div class="mt-4 space-y-2">
                ${Object.entries(currentQuestion.options).map(([key, value]) => `
                    <label class="flex items-center p-3 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                        <input type="radio" name="key-question" value="${key}" class="form-radio"> 
                        <span class="ml-3">${value}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    quizFeedbackEl.textContent = '';
    submitQuizButton.disabled = false;
    successAnimationEl.classList.add('hidden');
    quizContainer.classList.remove('hidden');
}

submitQuizButton.addEventListener('click', async () => {
    const answer = document.querySelector('input[name="key-question"]:checked')?.value;
    
    if (answer) {
        if (answer === currentQuestion.correct) {
            quizFeedbackEl.textContent = '';
            quizContainer.classList.add('hidden');
            successAnimationEl.classList.remove('hidden');
            submitQuizButton.disabled = true;

            try {
                const leaderboardRef = doc(db, 'leaderboard', currentUser.uid);
                await setDoc(leaderboardRef, {
                    name: currentUsername,
                    score: 'Passed',
                    timestamp: serverTimestamp()
                });
                setTimeout(() => {
                    showPage('mainAppContainer');
                    showAppPage('toolPage');
                }, 1500); // Wait for animation
            } catch (error) {
                quizFeedbackEl.textContent = "Error saving score: " + error.message;
                quizFeedbackEl.classList.remove('text-green-400');
                quizFeedbackEl.classList.add('text-red-400');
            }
        } else {
            quizFeedbackEl.textContent = 'Incorrect answer. Please review the Resource Library and try again.';
            quizFeedbackEl.classList.remove('text-green-400');
            quizFeedbackEl.classList.add('text-red-400');
        }
    } else {
        quizFeedbackEl.textContent = 'Please select an answer.';
        quizFeedbackEl.classList.remove('text-green-400');
        quizFeedbackEl.classList.add('text-red-400');
    }
});


// --- Leaderboard Logic ---
async function fetchLeaderboard() {
    try {
        const q = query(collection(db, "leaderboard"), orderBy("timestamp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        let leaderboardHTML = `<div class="bg-gray-800 bg-opacity-50 border border-gray-700 p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-extrabold text-white">Quiz Leaderboard</h2><p class="mt-2 text-gray-400">Users who have passed the knowledge check.</p><div class="flow-root mt-6"><div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8"><div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"><table class="min-w-full divide-y divide-gray-700"><thead><tr><th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">Rank</th><th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Name</th><th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th><th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Date</th></tr></thead><tbody class="divide-y divide-gray-800">`;
        
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'N/A';
            leaderboardHTML += `<tr>
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">${rank++}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">${data.name}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-green-400">${data.score}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">${date}</td>
            </tr>`;
        });
        leaderboardHTML += `</tbody></table></div></div></div></div>`;
        mainContentContainer.innerHTML = leaderboardHTML;
    } catch (error) {
        mainContentContainer.innerHTML = `<p class="text-center text-red-400">Error loading leaderboard.</p>`;
    }
}


// --- Tool Data and Logic ---
const standardPitchContent = `
    <div class="space-y-4 text-lg text-gray-300">
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Call Opening & Tenure</h4>
            <p>"Hello, my name is [Your Name]... I'm your dedicated accounts manager for the quarter."</p>
        </div>
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Sale Hook</h4>
            <p id="dynamic-sale-hook"></p>
        </div>
         <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Disclaimer & Verification</h4>
            <p>"Before we proceed... (follow standard disclaimer and CID verification)."</p>
        </div>
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">PBC+Agenda</h4>
            <p>"On today’s call, I’ll ask a few questions to understand your business... Sound good?"</p>
        </div>
         <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Transition to Next Step</h4>
            <p id="dynamic-transition"></p>
        </div>
    </div>`;

const conversionTrackingContent = `
     <div>
        <h3 class="text-2xl font-bold text-white mb-2">Pitch for Conversion Tracking Setup</h3>
        <div class="space-y-2 text-lg text-gray-400">
            <p><strong>The "Why":</strong> "For us to optimize for anything beyond clicks, the system needs to know what a 'conversion' is. Without that data, Smart Bidding is like flying blind."</p>
            <p><strong>The "What":</strong> "I recommend we set up Conversion Tracking. This involves placing a small code snippet on your 'thank you' page. It's the system's eyes and ears."</p>
            <p><strong>The "Impact":</strong> "Once set up, we unlock the full power of Google's AI to optimize for leads or sales directly, which will dramatically improve your results."</p>
            <p class="mt-4 font-semibold text-white">"Do you agree that tracking these actions is the critical next step?"</p>
        </div>
    </div>
`;

 const budgetContent = `
     <div>
        <h3 class="text-2xl font-bold text-white mb-2">Pitch for Budget Adjustments</h3>
        <div class="space-y-2 text-lg text-gray-400">
            <p><strong>The "Why":</strong> "Smart Bidding needs enough data to learn. A limited budget is like sending a fishing boat out with only enough fuel to go 100 meters from shore—it can't reach the best fishing spots."</p>
            <p><strong>The "What":</strong> "Based on your goal, the system recommends a daily budget of [Z]. This is designed to be competitive and allow the AI enough room to learn."</p>
            <p><strong>The "Impact":</strong> "By increasing the budget, we remove the handcuffs from the AI, allowing it to learn faster and capture more profitable conversions."</p>
             <p class="mt-4 font-semibold text-white">"Can we agree to set the budget at this recommended level to give the new strategy the best chance of success?"</p>
        </div>
    </div>
`;

const closingContent = `
    <div class="space-y-4 text-lg text-gray-300">
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
             <h4 class="font-bold text-white mb-2">Pitch Success Tracking</h4>
             <p class="mb-2 text-sm text-gray-400">Log the outcome of this pitch for team analytics.</p>
             <div class="flex space-x-2">
                 <button class="flex-1 text-center py-2 px-3 text-sm font-medium rounded-md bg-green-900 bg-opacity-50 text-green-300 hover:bg-green-800">Accepted</button>
                 <button class="flex-1 text-center py-2 px-3 text-sm font-medium rounded-md bg-red-900 bg-opacity-50 text-red-300 hover:bg-red-800">Rejected</button>
                 <button class="flex-1 text-center py-2 px-3 text-sm font-medium rounded-md bg-amber-900 bg-opacity-50 text-amber-300 hover:bg-amber-800">Needs Follow-up</button>
             </div>
        </div>
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Summarize</h4>
            <p>"Let me quickly recap. Your main goal is [Client's Goal]. We've set up conversion tracking, implemented the **[Strategy Name]** strategy, and set a competitive budget. This will help us achieve [desired impact]."</p>
        </div>
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">CONFIRM Email & Schedule Follow-up</h4>
            <p>"I will send a summary email with a link to my calendar. Alternatively, we can schedule the 14-day follow-up call right now."</p>
            <button id="schedule-gcal-btn" class="mt-2 btn btn-primary">Schedule in Google Calendar</button>
        </div>
        <div class="p-4 bg-gray-700 bg-opacity-40 rounded-lg">
            <h4 class="font-bold text-white">Additional Information & CSAT</h4>
            <p>"For billing queries, please use the Help icon. For strategy, feel free to reach out to me. Lastly, you will receive a short survey via email shortly. We'd really appreciate your feedback."</p>
        </div>
    </div>
`;

const strategyData = {
    mCPC: {
        title: "Manual CPC Review",
        subtitle: "The starting point for all accounts.",
        saleHook: "I was looking at your account and noticed you're putting a lot of manual effort into managing your bids. I see an opportunity to introduce automation that could save you time and potentially improve results.",
        transition: "Since you're currently managing bids manually, the first and most crucial step is to ensure we are accurately tracking the results of those clicks. Let's start with conversion tracking.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"How much time are you currently spending per week adjusting keyword bids?"</li><li>"Which metrics are you primarily using to decide when to increase or decrease a bid?"</li><li>"How do you currently determine the value of a click from one keyword versus another?"</li><li>"Are you finding it challenging to keep up with the real-time changes in auction competitiveness?"</li><li>"Are you open to exploring how automation could help manage these bids more efficiently?"</li></ul></div>`,
        pitch: `<p class="text-lg text-gray-400">This is the starting point. The goal is to acknowledge the client's current strategy and lay the groundwork for introducing automation. Focus on the time savings and efficiency gains possible by moving to an automated strategy.</p>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "I prefer having manual control. I don't trust automation."</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "I completely understand that. The goal isn't to take control away, but to give you better tools. Think of it as upgrading from a manual screwdriver to a power drill. You still decide where to put the screw, but the tool does the hard work faster."</p></div></div>`,
        implementation: `<p class="text-gray-400">No implementation needed. This step is for review before pitching Maximize Clicks.</p>`
    },
    maxClicks: {
        title: "Maximize Clicks",
        subtitle: "Pitch for New Clients or Brand Awareness Campaigns",
        saleHook: "I see you're looking to build momentum, and I've identified a strategy to significantly increase the flow of potential customers to your website, effectively putting your brand on the map.",
        transition: "That's excellent. Since the goal is to drive as many relevant visitors as possible, our next conversation should be about what those visitors do once they arrive. That's where conversion tracking becomes essential.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"Is your primary goal right now to get as many people as possible to visit your website?"</li><li>"Are you launching something new or trying to establish your brand in the market?"</li><li>"Are you more focused on driving traffic and building initial buzz, rather than specific actions?"</li><li>"Which specific pages on your website do you want to drive the most traffic to?"</li><li>"What is the main message or offer you want these new visitors to see?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-400">"The main challenge for a new campaign is getting noticed. We need to drive that first wave of traffic to build momentum."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"We use **Maximize Clicks**. It tells Google's AI: 'My only goal is traffic. Use my budget to get as many people as possible to visit my website.'"</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is immediate: a significant boost in visitors and brand visibility. It’s the fastest way to build initial buzz."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "I don't want junk traffic."</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "That's smart. We ensure quality by combining this with tightly focused keywords and ads. We're maximizing clicks from people already searching for what you offer. It's step one to gather data."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize clicks'</strong>.</li><li>Leave optional max. CPC bid unchecked.</li><li>Click <strong>'Save'</strong>.</li></ol>`
    },
    maxConversions: {
        title: "Maximize Conversions",
        subtitle: "Pitch for Clients Focused on Lead/Sale Volume",
        saleHook: "You're getting traffic, which is great, but I see a clear path to convert that traffic into tangible business results by optimizing for the highest *number* of leads or sales.",
        transition: "That's fantastic. Since we are now focused on maximizing the number of leads, the next logical question is 'how much is each lead worth to us?' which leads us to discuss setting a target cost, or a Target CPA.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"Is your main goal to get as many leads or sales as possible right now?"</li><li>"Does each lead or sale have a similar value to your business?"</li><li>"Is the top priority right now to maximize the *quantity* of conversions within your budget?"</li><li>"Does your team have the capacity to handle a potential increase in lead volume?"</li><li>"Are you more focused on growth in volume rather than strict cost-efficiency at this moment?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-400">"The opportunity is to make your budget work smarter. We can tell the system to hunt for users who are showing signals they're more likely to convert."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"We use **Maximize Conversions**. It uses Google's AI to analyze user signals and spends your budget trying to get you the highest *number* of conversions."</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is a higher volume of business opportunities. Your ad spend will translate into more form fills and phone calls."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "I'm worried my Cost Per Lead will skyrocket."</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "That's a valid concern. The system spends intelligently to find conversions. We can monitor the average CPA, and if it's not aligning with your goals, we can evolve to a Target CPA strategy for more direct control."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize conversions'</strong>.</li><li>This is fully automated. Simply click <strong>'Save'</strong>.</li></ol>`
    },
    tCPA: {
        title: "Target CPA",
        subtitle: "Pitch for Lead-Gen Clients Needing Predictable Costs",
        saleHook: "I've noticed your lead costs can fluctuate. I have a precise strategy to bring stability to your budget by aiming for a consistent, profitable **cost per lead**.",
        transition: "It's great that we've established a target cost per lead. If your business has sales with different values, the next evolution is to focus not just on the cost of a lead, but the *revenue* it generates, which is what Maximize Conversion Value addresses.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"Is your primary goal generating leads, like form submissions or calls?"</li><li>"What happens after you get a lead? What is your sales process?"</li><li>"What percentage of your leads typically turn into a paying customer?"</li><li>"Based on that, do you have a specific cost in mind that you need to stay under for each lead to be profitable?"</li><li>"Would having a stable, predictable cost per lead help with your monthly financial planning?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Problem):</h4><p class="text-lg text-gray-400">"The challenge many businesses face is unpredictable lead costs. This makes it difficult to budget accurately and scale with confidence."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"The solution is **Target CPA**. We give Google a clear rule: 'Get me as many leads as possible, but I want the average cost to be around my target of ₹900.'"</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is predictability and control. You can set your monthly ad budget with confidence, knowing your customer acquisition cost will be stable and profitable."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "If I set a target, won't I get fewer leads?"</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "That's a valid concern. The goal is efficiency. By not overspending, it frees up your budget to capture more leads at your profitable price point. The goal is a similar or higher volume, just without the wasted spend."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target CPA'</strong>.</li><li>Enter your target cost (e.g., <strong>900</strong>).</li><li>Click <strong>'Save'</strong>.</li></ol>`
    },
    maxConvValue: {
        title: "Maximize Conversion Value",
        subtitle: "Pitch for E-commerce in a Growth Phase or Sale",
        saleHook: "Your campaign is driving sales, which is fantastic. Now, let's unlock the next level by optimizing for the highest possible **total revenue**, ensuring every rupee works towards a bigger bottom line.",
        transition: "Maximizing revenue is a powerful goal. To make it even smarter, the final step in our journey is to ensure that revenue is also *profitable*. This means aiming for a specific return on your investment, which is exactly what Target ROAS is for.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"Is your main focus on maximizing the total sales amount you bring in each day?"</li><li>"Are you in a growth phase where you want to use your full budget to maximize revenue?"</li><li>"Are you running a big sale or promotion where total revenue is the key success metric?"</li><li>"Do you have a wide range of product prices where some sales are much more valuable than others?"</li><li>"Are you less concerned with the efficiency of each rupee spent and more concerned with the total revenue figure?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-400">"During a growth phase, the opportunity is to focus your campaign on one mission: generating the maximum possible top-line revenue."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"The strategy is **Maximize Conversion Value**. It tells our system to use your budget to find the sales combination that results in the biggest total revenue number."</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is pure growth. Your campaign becomes a revenue-generating engine focused on maximizing your daily sales value."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "How is this different from Maximize Conversions?"</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "Great question. Maximize Conversions treats a ₹500 sale and a ₹25,000 sale as the same—just 'one'. Maximize Conversion *Value* is smarter; it understands the price. It would rather get one ₹25,000 sale than ten ₹500 sales."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize conversion value'</strong>.</li><li>This is fully automated. Click <strong>'Save'</strong>.</li></ol>`
    },
    tROAS: {
        title: "Target ROAS",
        subtitle: "Pitch for Profitability-Focused Clients (e.g., E-commerce)",
        saleHook: "Your business is generating good revenue, but I see a powerful opportunity to focus not just on revenue, but on **profitability**, ensuring you get a specific, predictable return on every single rupee you invest in ads.",
        transition: "That's great. It's clear that profitability is the ultimate goal for your business, and setting a Target ROAS is the most direct way to instruct our systems to achieve that for you.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"Is your main goal profitability, meaning getting a strong return for every rupee spent?"</li><li>"Do your products have different prices and profit margins?"</li><li>"What is the average order value you are seeing right now?"</li><li>"How do you currently measure the success of your advertising? Is it based on sales volume or return on investment?"</li><li>"If we could achieve it, what ROAS would you consider a major success for your business?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Problem):</h4><p class="text-lg text-gray-400">"The challenge with selling products at different prices is that a campaign can treat a ₹1,000 sale the same as a ₹20,000 sale. This isn't the most profitable way to run your business."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"To fix this, we use **Target ROAS**. This strategy lets us set a profitability rule. We tell Google, 'For every ₹1 I spend, I want at least ₹5 back.' It teaches the system to understand the *value* of each customer."</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is a direct focus on your bottom line. The system will bid more for customers likely to make big purchases, ensuring your ad spend generates the best possible return."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "I don't want to give up control."</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "I understand. You remain the strategist by setting the profit target. The AI just acts as your tactical assistant, making billions of calculations to hit that goal."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target ROAS'</strong>.</li><li>Enter target percentage (e.g., <strong>500%</strong> for 5x return).</li><li>Click <strong>'Save'</strong>.</li></ol>`
    },
     tIS: {
        title: "Target Impression Share",
        subtitle: "Pitch for Brand Defense and Market Dominance",
        saleHook: "I was reviewing how your brand appears against competitors and saw an opportunity to ensure you are consistently the most visible business for your most important search terms.",
        transition: "Great, ensuring top visibility is a clear goal. Now let's talk about the specific keywords where this visibility matters most.",
        gil: `<div class="mb-6 pb-6 border-b border-gray-700"><h4 class="text-xl font-bold text-white mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-400"><li>"How important is it for you to appear at the very top of the search results for your own brand name?"</li><li>"Are there key competitors that you absolutely want to outrank whenever they appear?"</li><li>"Is a key goal to be seen as the number one choice in the Hyderabad market?"</li><li>"Are you more concerned with visibility and brand presence than direct conversions for this specific campaign?"</li><li>"Which specific search terms do you feel you *must* own?"</li></ul></div>`,
        pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-white">The "Why" (The Problem):</h4><p class="text-lg text-gray-400">"If a customer searches for you and a competitor shows up first, you risk losing that customer. Brand visibility directly translates to customer trust."</p></div><div><h4 class="text-xl font-bold text-white">The "What" (The Solution):</h4><p class="text-lg text-gray-400">"The strategy is **Target Impression Share**. It's a rule where we tell Google, 'For these specific keywords, I want to be at the absolute top of the search results 80% of the time.'"</p></div><div><h4 class="text-xl font-bold text-white">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-400">"The impact is brand dominance. You protect your brand name and establish your business as the leader in your space."</p></div></div>`,
        objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-white">Objection: "Won't this get very expensive?"</h4><p class="text-gray-400 mt-1"><strong>Response:</strong> "That's a valid concern. We use this surgically on your most important keywords. Crucially, we can set a 'maximum CPC bid limit' which acts as a safety net to ensure you never overpay for that visibility."</p></div></div>`,
        implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-400"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target impression share'</strong>.</li><li>Choose where ads should appear (e.g., Absolute top of page).</li><li>Set the Impression share percentage to target.</li><li>Set a Max. CPC bid limit as a cost-control safety net.</li><li>Click <strong>'Save'</strong>.</li></ol>`
    },
};

const funnelOrder = ['mCPC', 'maxClicks', 'maxConversions', 'tCPA', 'maxConvValue', 'tROAS', 'tIS'];
const funnelTitles = {
    mCPC: "Manual CPC",
    maxClicks: "Max Clicks",
    maxConversions: "Max Conversions",
    tCPA: "Target CPA",
    maxConvValue: "Max Conv. Value",
    tROAS: "Target ROAS",
    tIS: "Target Imp. Share"
};

function renderStepper() {
    const stepperEl = document.getElementById('stepper');
    if (!stepperEl) return;
    stepperEl.innerHTML = '';
    funnelOrder.forEach((key, index) => {
        const item = document.createElement('div');
        item.className = 'stepper-card p-4 rounded-lg cursor-pointer';
        item.dataset.strategyKey = key;
        item.innerHTML = `
            <h3 class="font-bold text-white">${funnelTitles[key]}</h3>
            <p class="text-sm text-gray-400">${strategyData[key].subtitle}</p>
        `;
        stepperEl.appendChild(item);
    });
}

function selectStrategy(strategyKey, selectedIndex) {
    const data = strategyData[strategyKey];
    if (!data) return;

    const stepperItems = document.querySelectorAll('.stepper-card');
    stepperItems.forEach(item => item.classList.remove('active'));
    stepperItems[selectedIndex].classList.add('active');
    
    const strategyGuideEl = document.getElementById('strategy-guide');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const strategyTitleEl = document.getElementById('strategy-title');
    const strategySubtitleEl = document.getElementById('strategy-subtitle');
    const pinButton = document.getElementById('pin-strategy-btn');

    strategyTitleEl.textContent = data.title;
    strategyTitleEl.dataset.strategyKey = strategyKey;
    strategySubtitleEl.textContent = data.subtitle;

    const pinned = JSON.parse(localStorage.getItem('pinnedStrategies')) || [];
    if(pinned.includes(strategyKey)) {
        pinButton.classList.add('text-amber-400');
    } else {
        pinButton.classList.remove('text-amber-400');
    }
    
    document.getElementById('standard-content').innerHTML = standardPitchContent;
    document.getElementById('dynamic-sale-hook').textContent = data.saleHook;
    document.getElementById('dynamic-transition').textContent = data.transition;
    
    document.getElementById('pitch-content').innerHTML = data.gil + data.pitch;
    document.getElementById('conversion_tracking-content').innerHTML = conversionTrackingContent;
    document.getElementById('budget-content').innerHTML = budgetContent;
    document.getElementById('objections-content').innerHTML = data.objections;
    document.getElementById('implementation-content').innerHTML = data.implementation;
    document.getElementById('closing-content').innerHTML = closingContent;
    
    document.getElementById('schedule-gcal-btn')?.addEventListener('click', () => {
        const eventTitle = `Follow-up Call with [Client Name] re: ${data.title}`;
        const eventDesc = `This is a 14-day follow-up call to review the performance of the new ${data.title} bid strategy.`;
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDesc)}`;
        window.open(gcalUrl, '_blank');
    });

    strategyGuideEl.style.display = 'block';
    welcomeMessageEl.style.display = 'none';

    const tabs = document.querySelectorAll('#strategy-guide .tab-button');
    const pitchSections = document.querySelectorAll('#strategy-guide .pitch-section');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === 'standard') {
            tab.classList.add('active');
        }
    });
    pitchSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === 'standard-content') {
            section.classList.add('active');
        }
    });
}
```

