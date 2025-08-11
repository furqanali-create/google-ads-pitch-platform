document.addEventListener('DOMContentLoaded', function() {
    
    // --- Firebase Configuration ---
    // IMPORTANT: Replace this with your own Firebase project configuration!
    const firebaseConfig = {
      apiKey: "AIzaSyBY6QzDwyF3oDvQTfwTTFGtVqB7QefOhi0",
      authDomain: "ads-pitch-platform.firebaseapp.com",
      projectId: "ads-pitch-platform",
      storageBucket: "ads-pitch-platform.firebasestorage.app",
      messagingSenderId: "1080086729632",
      appId: "1:1080086729632:web:366a3033e22eb2d8754ac5"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Page Navigation & State Management ---
    const pages = document.querySelectorAll('.page');
    const appPages = document.querySelectorAll('.app-page');
    const appNavLinks = document.querySelectorAll('.app-nav-link');
    let currentUser = null;
    let currentUsername = '';
    
    function showPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }
    
    function showAppPage(pageId) {
        appPages.forEach(page => page.classList.remove('active'));
        appNavLinks.forEach(link => {
            link.classList.remove('active');
            if(link.dataset.page === pageId) link.classList.add('active');
        });
        document.getElementById(pageId).classList.add('active');
        
        if (pageId === 'leaderboardPage') {
            fetchLeaderboard();
        }
    }

    appNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showAppPage(link.dataset.page);
        });
    });

    // --- Authentication Logic ---
    const loginPage = document.getElementById('loginPage');
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
        authErrorEl.textContent = '';
    }
    toggleAuthMode(); // Initialize in login mode

    toggleAuthModeEl.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    signupButton.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        const username = usernameInput.value;
        if (!username) {
            authErrorEl.textContent = 'Please enter your name for the leaderboard.';
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Set username in Firestore
                return db.collection('users').doc(userCredential.user.uid).set({
                    username: username,
                    email: email
                });
            })
            .then(() => {
                 showPage('quizPage');
            })
            .catch((error) => {
                authErrorEl.textContent = error.message;
            });
    });

    loginButton.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showPage('mainAppContainer');
                showAppPage('toolPage');
            })
            .catch((error) => {
                authErrorEl.textContent = error.message;
            });
    });
    
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            showPage('loginPage');
        });
    });

    // Check auth state on page load
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            db.collection('users').doc(user.uid).get().then(doc => {
                if(doc.exists) currentUsername = doc.data().username;
            });
            showPage('mainAppContainer');
            showAppPage('toolPage');
        } else {
            currentUser = null;
            showPage('loginPage');
        }
    });

    // --- Quiz Logic ---
    const submitQuizButton = document.getElementById('submitQuizButton');
    const quizErrorEl = document.getElementById('quiz-error');
    
    submitQuizButton.addEventListener('click', () => {
        const answers = {
            q1: document.querySelector('input[name="q1"]:checked')?.value,
            q2: document.querySelector('input[name="q2"]:checked')?.value,
            q3: document.querySelector('input[name="q3"]:checked')?.value,
        };
        const correctAnswers = { q1: 'c', q2: 'a', q3: 'b' };
        
        if (answers.q1 === correctAnswers.q1 && answers.q2 === correctAnswers.q2 && answers.q3 === correctAnswers.q3) {
            // Save score to leaderboard
            db.collection('leaderboard').doc(currentUser.uid).set({
                name: currentUsername,
                score: '3/3',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                showPage('mainAppContainer');
                showAppPage('toolPage');
            })
            .catch(error => {
                quizErrorEl.textContent = "Error saving score: " + error.message;
            });

        } else {
            quizErrorEl.textContent = 'Incorrect answers. Please review and try again.';
        }
    });

    // --- Leaderboard Logic ---
    const leaderboardBody = document.getElementById('leaderboard-body');
    function fetchLeaderboard() {
        db.collection('leaderboard').orderBy('timestamp', 'desc').limit(10).get()
            .then(querySnapshot => {
                leaderboardBody.innerHTML = '';
                let rank = 1;
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'N/A';
                    const row = `<tr>
                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">${rank++}</td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${data.name}</td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${data.score}</td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${date}</td>
                    </tr>`;
                    leaderboardBody.innerHTML += row;
                });
            })
            .catch(error => {
                leaderboardBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">Error loading leaderboard.</td></tr>`;
            });
    }

    // --- Suggestion Form Logic ---
    const suggestionForm = document.getElementById('suggestionForm');
    const suggestionText = document.getElementById('suggestionText');
    const suggestionSuccessEl = document.getElementById('suggestion-success');
    suggestionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = suggestionText.value;
        if (!text) return;
        
        db.collection('suggestions').add({
            suggestion: text,
            user: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            suggestionSuccessEl.textContent = 'Thank you for your suggestion!';
            suggestionForm.reset();
            setTimeout(() => suggestionSuccessEl.textContent = '', 3000);
        })
        .catch(error => {
            suggestionSuccessEl.textContent = 'Error: ' + error.message;
            suggestionSuccessEl.classList.remove('text-green-600');
            suggestionSuccessEl.classList.add('text-red-600');
        });
    });

    // --- Tool Data and Logic ---
    // ... [ The entire strategyData object and related functions (renderStepper, selectStrategy, etc.) from the previous script go here ]
     const standardPitchContent = `
        <div class="space-y-4 text-lg text-gray-700">
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Call Opening & Tenure</h4>
                <p>"Hello, my name is [Your Name]. Am I speaking with [Advertiser Name]? Glad I caught you! I am calling on behalf of the Google Ads team and I'm your dedicated accounts manager for the quarter."</p>
            </div>
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Sale Hook</h4>
                <p id="dynamic-sale-hook"></p>
            </div>
             <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Disclaimer & Verification</h4>
                <p>"Before we proceed, I would like to let you know that - This call may be recorded for training, quality and to improve Google’s services. Do you agree to have this call monitored or recorded? (Wait for 'Yes') Thank you. I’d like to inform you that the recording has started. Can you please log in to the account and verify the last 4 digits of your Customer ID? This is the 10-digit number that you see on the top right corner of the screen."</p>
            </div>
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">PBC+Agenda</h4>
                <p>"On today’s call, I’ll ask a few questions to understand your business. This will help me share relevant optimization tips that could support your growth. Sound good?"</p>
            </div>
             <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Transition to Next Step</h4>
                <p id="dynamic-transition"></p>
            </div>
        </div>`;
    
    const budgetContent = `
         <div>
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Pitch for Budget Adjustments</h3>
            <div class="space-y-2 text-lg text-gray-600">
                <p><strong>The "Why":</strong> "Smart Bidding needs enough data to learn. If a campaign's budget is too limited, it's like sending a fishing boat out with only enough fuel to go 100 meters from the shore—it can't reach the best fishing spots."</p>
                <p><strong>The "What":</strong> "Based on your goal to achieve [X Conversions] with the [Chosen Strategy], the system recommends a daily budget of [Z]. This budget is designed to be competitive and allow the AI enough room to learn."</p>
                <p><strong>The "Impact":</strong> "By increasing the budget, we remove the handcuffs from the AI. This will allow it to learn faster, exit the learning period sooner, and capture more profitable conversions."</p>
                 <p class="mt-4 font-semibold">"Can we agree to set the budget at this recommended level to give the new strategy the best chance of success?"</p>
            </div>
        </div>
    `;

    const closingContent = `
        <div class="space-y-4 text-lg text-gray-700">
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Summarize</h4>
                <p>"Let me quickly recap. Your main goal is [Client's Goal]. To achieve this, we first ensured your conversion tracking is set up. Then, we implemented the **[Strategy Name]** bid strategy and set a competitive budget. This will help us achieve [desired impact]."</p>
            </div>
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">CONFIRM Email</h4>
                <p>"I will send a summary email with everything we discussed and a link to my calendar to schedule a review call in 14 days. What is the best email address for me to use?"</p>
            </div>
            <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Additional Information & CSAT</h4>
                <p>"For billing queries, please use the Help icon in your account. For strategy, feel free to reach out to me. Lastly, you will receive a short survey via email shortly. We'd really appreciate your feedback."</p>
            </div>
             <div class="p-4 bg-slate-100 rounded-lg">
                <h4 class="font-bold text-gray-800">Closing Remark</h4>
                <p>"Thank you for your time—it was a pleasure speaking with you today! If you have any questions, feel free to email me."</p>
            </div>
        </div>
    `;


    const strategyData = {
        mCPC: {
            title: "Manual CPC Review",
            subtitle: "The starting point for all accounts.",
            saleHook: "I was looking at your account and noticed you're putting a lot of manual effort into managing your bids. I see an opportunity to introduce automation that could save you time and potentially improve results.",
            transition: "Since you're currently managing bids manually, the first and most crucial step is to ensure we are accurately tracking the results of those clicks. Let's start with conversion tracking.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"How much time are you currently spending per week adjusting keyword bids?"</li><li>"Which metrics are you primarily using to decide when to increase or decrease a bid?"</li><li>"How do you currently determine the value of a click from one keyword versus another?"</li><li>"Are you finding it challenging to keep up with the real-time changes in auction competitiveness?"</li><li>"Are you open to exploring how automation could help manage these bids more efficiently?"</li></ul></div>`,
            pitch: `<p class="text-lg text-gray-600">This is the starting point. The goal is to acknowledge the client's current strategy and lay the groundwork for introducing automation. Focus on the time savings and efficiency gains possible by moving to an automated strategy.</p>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "I prefer having manual control. I don't trust automation."</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "I completely understand that, and it's smart to be cautious. The goal isn't to take control away, but to give you better tools. Think of it as upgrading from a manual screwdriver to a power drill. You still decide where to put the screw, but the tool does the hard work faster and more efficiently."</p></div></div>`,
            implementation: `<p class="text-gray-700">No implementation needed. This step is for review and discussion before pitching the next strategy in the funnel (Maximize Clicks).</p>`
        },
        maxClicks: {
            title: "Maximize Clicks",
            subtitle: "Pitch for New Clients or Brand Awareness Campaigns",
            saleHook: "I see you're looking to build momentum, and I've identified a strategy to significantly increase the flow of potential customers to your website, effectively putting your brand on the map.",
            transition: "That's excellent. Since the goal is to drive as many relevant visitors as possible, our next conversation should be about what those visitors do once they arrive. That's where conversion tracking becomes essential.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"Is your primary goal right now to get as many people as possible to visit your website?"</li><li>"Are you launching something new or trying to establish your brand in the market?"</li><li>"Are you more focused on driving traffic and building initial buzz, rather than specific actions?"</li><li>"Which specific pages on your website do you want to drive the most traffic to?"</li><li>"What is the main message or offer you want these new visitors to see?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-600">"The main challenge for a new campaign is getting noticed. We need to drive that first wave of traffic to build momentum."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"We use **Maximize Clicks**. It tells Google's AI: 'My only goal is traffic. Use my budget to get as many people as possible to visit my website.'"</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is immediate: a significant boost in visitors and brand visibility. It’s the fastest way to build initial buzz."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "I don't want junk traffic."</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "That's smart. We ensure quality by combining this with tightly focused keywords and ads. We're maximizing clicks from people already searching for what you offer. It's step one to gather data."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize clicks'</strong>.</li><li>Leave optional max. CPC bid unchecked.</li><li>Click <strong>'Save'</strong>.</li></ol>`
        },
        maxConversions: {
            title: "Maximize Conversions",
            subtitle: "Pitch for Clients Focused on Lead/Sale Volume",
            saleHook: "You're getting traffic, which is great, but I see a clear path to convert that traffic into tangible business results by optimizing for the highest *number* of leads or sales.",
            transition: "That's fantastic. Since we are now focused on maximizing the number of leads, the next logical question is 'how much is each lead worth to us?' which leads us to discuss setting a target cost, or a Target CPA.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"Is your main goal to get as many leads or sales as possible right now?"</li><li>"Does each lead or sale have a similar value to your business?"</li><li>"Is the top priority right now to maximize the *quantity* of conversions within your budget?"</li><li>"Does your team have the capacity to handle a potential increase in lead volume?"</li><li>"Are you more focused on growth in volume rather than strict cost-efficiency at this moment?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-600">"The opportunity is to make your budget work smarter. We can tell the system to hunt for users who are showing signals they're more likely to convert."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"We use **Maximize Conversions**. It uses Google's AI to analyze user signals and spends your budget trying to get you the highest *number* of conversions."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is a higher volume of business opportunities. Your ad spend will translate into more form fills and phone calls."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "I'm worried my Cost Per Lead will skyrocket."</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "That's a valid concern. The system spends intelligently to find conversions. We can monitor the average CPA, and if it's not aligning with your goals, we can evolve to a Target CPA strategy for more direct control."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize conversions'</strong>.</li><li>This is fully automated. Simply click <strong>'Save'</strong>.</li></ol>`
        },
        tCPA: {
            title: "Target CPA",
            subtitle: "Pitch for Lead-Gen Clients Needing Predictable Costs",
            saleHook: "I've noticed your lead costs can fluctuate. I have a precise strategy to bring stability to your budget by aiming for a consistent, profitable **cost per lead**.",
            transition: "It's great that we've established a target cost per lead. If your business has sales with different values, the next evolution is to focus not just on the cost of a lead, but the *revenue* it generates, which is what Maximize Conversion Value addresses.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"Is your primary goal generating leads, like form submissions or calls?"</li><li>"What happens after you get a lead? What is your sales process?"</li><li>"What percentage of your leads typically turn into a paying customer?"</li><li>"Based on that, do you have a specific cost in mind that you need to stay under for each lead to be profitable?"</li><li>"Would having a stable, predictable cost per lead help with your monthly financial planning?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Problem):</h4><p class="text-lg text-gray-600">"The challenge many businesses face is unpredictable lead costs. This makes it difficult to budget accurately and scale with confidence."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"The solution is **Target CPA**. We give Google a clear rule: 'Get me as many leads as possible, but I want the average cost to be around my target of ₹900.'"</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is predictability and control. You can set your monthly ad budget with confidence, knowing your customer acquisition cost will be stable and profitable."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "If I set a target, won't I get fewer leads?"</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "That's a valid concern. The goal is efficiency. By not overspending, it frees up your budget to capture more leads at your profitable price point. The goal is a similar or higher volume, just without the wasted spend."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target CPA'</strong>.</li><li>Enter your target cost (e.g., <strong>900</strong>).</li><li>Click <strong>'Save'</strong>.</li></ol>`
        },
        maxConvValue: {
            title: "Maximize Conversion Value",
            subtitle: "Pitch for E-commerce in a Growth Phase or Sale",
            saleHook: "Your campaign is driving sales, which is fantastic. Now, let's unlock the next level by optimizing for the highest possible **total revenue**, ensuring every rupee works towards a bigger bottom line.",
            transition: "Maximizing revenue is a powerful goal. To make it even smarter, the final step in our journey is to ensure that revenue is also *profitable*. This means aiming for a specific return on your investment, which is exactly what Target ROAS is for.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"Is your main focus on maximizing the total sales amount you bring in each day?"</li><li>"Are you in a growth phase where you want to use your full budget to maximize revenue?"</li><li>"Are you running a big sale or promotion where total revenue is the key success metric?"</li><li>"Do you have a wide range of product prices where some sales are much more valuable than others?"</li><li>"Are you less concerned with the efficiency of each rupee spent and more concerned with the total revenue figure?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Opportunity):</h4><p class="text-lg text-gray-600">"During a growth phase, the opportunity is to focus your campaign on one mission: generating the maximum possible top-line revenue."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"The strategy is **Maximize Conversion Value**. It tells our system to use your budget to find the sales combination that results in the biggest total revenue number."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is pure growth. Your campaign becomes a revenue-generating engine focused on maximizing your daily sales value."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "How is this different from Maximize Conversions?"</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "Great question. Maximize Conversions treats a ₹500 sale and a ₹25,000 sale as the same—just 'one'. Maximize Conversion *Value* is smarter; it understands the price. It would rather get one ₹25,000 sale than ten ₹500 sales."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Maximize conversion value'</strong>.</li><li>This is fully automated. Click <strong>'Save'</strong>.</li></ol>`
        },
        tROAS: {
            title: "Target ROAS",
            subtitle: "Pitch for Profitability-Focused Clients (e.g., E-commerce)",
            saleHook: "Your business is generating good revenue, but I see a powerful opportunity to focus not just on revenue, but on **profitability**, ensuring you get a specific, predictable return on every single rupee you invest in ads.",
            transition: "That's great. It's clear that profitability is the ultimate goal for your business, and setting a Target ROAS is the most direct way to instruct our systems to achieve that for you.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"Is your main goal profitability, meaning getting a strong return for every rupee spent?"</li><li>"Do your products have different prices and profit margins?"</li><li>"What is the average order value you are seeing right now?"</li><li>"How do you currently measure the success of your advertising? Is it based on sales volume or return on investment?"</li><li>"If we could achieve it, what ROAS would you consider a major success for your business?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Problem):</h4><p class="text-lg text-gray-600">"The challenge with selling products at different prices is that a campaign can treat a ₹1,000 sale the same as a ₹20,000 sale. This isn't the most profitable way to run your business."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"To fix this, we use **Target ROAS**. This strategy lets us set a profitability rule. We tell Google, 'For every ₹1 I spend, I want at least ₹5 back.' It teaches the system to understand the *value* of each customer."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is a direct focus on your bottom line. The system will bid more for customers likely to make big purchases, ensuring your ad spend generates the best possible return."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "I don't want to give up control."</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "I understand. You remain the strategist by setting the profit target. The AI just acts as your tactical assistant, making billions of calculations to hit that goal."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target ROAS'</strong>.</li><li>Enter target percentage (e.g., <strong>500%</strong> for 5x return).</li><li>Click <strong>'Save'</strong>.</li></ol>`
        },
        tIS: { // Added for completeness, though not in the funnel
            title: "Target Impression Share",
            subtitle: "Pitch for Brand Defense and Market Dominance",
            saleHook: "I was reviewing how your brand appears against competitors and saw an opportunity to ensure you are consistently the most visible business for your most important search terms.",
            transition: "Great, ensuring top visibility is a clear goal. Now let's talk about the specific keywords where this visibility matters most.",
            gil: `<div class="mb-6 pb-6 border-b border-gray-200"><h4 class="text-xl font-bold text-gray-800 mb-2">Key Questions (GIL):</h4><ul class="list-disc list-inside space-y-1 text-lg text-gray-600"><li>"How important is it for you to appear at the very top of the search results for your own brand name?"</li><li>"Are there key competitors that you absolutely want to outrank whenever they appear?"</li><li>"Is a key goal to be seen as the number one choice in the Hyderabad market?"</li><li>"Are you more concerned with visibility and brand presence than direct conversions for this specific campaign?"</li><li>"Which specific search terms do you feel you *must* own?"</li></ul></div>`,
            pitch: `<div class="space-y-4"><div><h4 class="text-xl font-bold text-gray-800">The "Why" (The Problem):</h4><p class="text-lg text-gray-600">"If a customer searches for you and a competitor shows up first, you risk losing that customer. Brand visibility directly translates to customer trust."</p></div><div><h4 class="text-xl font-bold text-gray-800">The "What" (The Solution):</h4><p class="text-lg text-gray-600">"The strategy is **Target Impression Share**. It's a rule where we tell Google, 'For these specific keywords, I want to be at the absolute top of the search results 80% of the time.'"</p></div><div><h4 class="text-xl font-bold text-gray-800">The "Impact" (The Benefit):</h4><p class="text-lg text-gray-600">"The impact is brand dominance. You protect your brand name and establish your business as the leader in your space."</p></div></div>`,
            objections: `<div class="space-y-6"><div><h4 class="text-lg font-semibold text-gray-800">Objection: "Won't this get very expensive?"</h4><p class="text-gray-600 mt-1"><strong>Response:</strong> "That's a valid concern. We use this surgically on your most important keywords. Crucially, we can set a 'maximum CPC bid limit' which acts as a safety net to ensure you never overpay for that visibility."</p></div></div>`,
            implementation: `<ol class="list-decimal list-inside space-y-2 text-gray-700"><li>Navigate to <strong>Campaigns</strong> > Select campaign.</li><li>Go to <strong>Settings</strong> > <strong>Bidding</strong>.</li><li>Click <strong>'Change bid strategy'</strong> > Select <strong>'Target impression share'</strong>.</li><li>Choose where ads should appear (e.g., Absolute top of page).</li><li>Set the Impression share percentage to target.</li><li>Set a Max. CPC bid limit as a cost-control safety net.</li><li>Click <strong>'Save'</strong>.</li></ol>`
        },
    };

    const stepperEl = document.getElementById('stepper');
    const strategyGuideEl = document.getElementById('strategy-guide');
    const strategyTitleEl = document.getElementById('strategy-title');
    const strategySubtitleEl = document.getElementById('strategy-subtitle');
    const budgetContentEl = document.getElementById('budget-content');
    const objectionsContentEl = document.getElementById('objections-content');
    const implementationContentEl = document.getElementById('implementation-content');
    const closingContentEl = document.getElementById('closing-content');
    const tabs = document.querySelectorAll('.tab-button');
    const pitchSections = document.querySelectorAll('.pitch-section');
    const welcomeMessageEl = document.getElementById('welcome-message');

    const funnelOrder = ['mCPC', 'maxClicks', 'maxConversions', 'tCPA', 'maxConvValue', 'tROAS'];
    const funnelTitles = {
        mCPC: "Manual CPC Review",
        maxClicks: "Maximize Clicks",
        maxConversions: "Maximize Conversions",
        tCPA: "Target CPA",
        maxConvValue: "Maximize Conv. Value",
        tROAS: "Target ROAS"
    };

    function renderStepper() {
        stepperEl.innerHTML = '';
        funnelOrder.forEach((key, index) => {
            const item = document.createElement('div');
            item.className = 'stepper-item border-l-4 border-gray-200 p-4 transition-all duration-200 cursor-pointer hover:bg-slate-50';
            item.dataset.strategyKey = key;
            item.innerHTML = `
                <div class="flex items-center">
                    <div class="stepper-circle h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 mr-4">${index + 1}</div>
                    <span class="font-semibold text-gray-700">${funnelTitles[key]}</span>
                </div>
            `;
            item.addEventListener('click', () => selectStrategy(key, index));
            stepperEl.appendChild(item);
        });
    }

    function selectStrategy(strategyKey, selectedIndex) {
        const data = strategyData[strategyKey];
        if (!data) return;

        // Update stepper UI
        const stepperItems = stepperEl.querySelectorAll('.stepper-item');
        stepperItems.forEach((item, index) => {
            item.classList.remove('active', 'completed');
            if (index < selectedIndex) {
                item.classList.add('completed');
            } else if (index === selectedIndex) {
                item.classList.add('active');
            }
        });
        
        // Update content
        strategyTitleEl.textContent = data.title;
        strategySubtitleEl.textContent = data.subtitle;
        
        // Dynamically insert sale hook and transition text
        document.getElementById('standard-content').innerHTML = standardPitchContent;
        document.getElementById('dynamic-sale-hook').textContent = data.saleHook;
        document.getElementById('dynamic-transition').textContent = data.transition;
        
        document.getElementById('pitch-content').innerHTML = data.gil + data.pitch;
        document.getElementById('conversion_tracking-content').innerHTML = conversionTrackingContent;
        document.getElementById('budget-content').innerHTML = budgetContent;
        document.getElementById('objections-content').innerHTML = data.objections;
        document.getElementById('implementation-content').innerHTML = data.implementation;
        document.getElementById('closing-content').innerHTML = closingContent;

        strategyGuideEl.style.display = 'block';
        welcomeMessageEl.style.display = 'none';

        // Set the 'Standard Pitch' tab as active by default
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

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            pitchSections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${targetTab}-content`).classList.add('active');
        });
    });

    renderStepper();

});
```
