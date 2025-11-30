document.addEventListener('DOMContentLoaded', () => {

    // === 1. GLOBAL STATE & CONFIG ===
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    
    // Default Tables
    const initStorage = (key, defaultVal) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(defaultVal));
    }
    initStorage('users', [{id: 0, username: 'admin', passwordHash: 'hashed_nimda'}]); // Pre-made admin
    initStorage('bookings', []);
    initStorage('reservations', []);
    initStorage('gpa_courses', []); // New storage for GPA tool

    // Data Sources
    const rooms = [
        { id: 1, name: "Library Room 101 (Quiet)" },
        { id: 2, name: "Library Room 102 (Group)" },
        { id: 3, name: "Tech Lab A (Computers)" },
        { id: 4, name: "Creative Studio B" },
    ];

    const events = [
        { id: 1, name: "Guest Lecture: AI in 2025", category: "Academic", date: "Nov 12", description: "Dr. Smith on the future of AI." },
        { id: 2, name: "End of Year Tech Ball", category: "Social", date: "Dec 15", description: "Black tie event for CS students." },
        { id: 3, name: "Career Fair", category: "Career", date: "Oct 20", description: "Meet Google, Amazon, and local startups." },
        { id: 4, name: "Hackathon v4.0", category: "Competition", date: "Nov 05", description: "24h coding challenge with prizes." },
        { id: 5, name: "Yoga on the Lawn", category: "Wellness", date: "Sept 10", description: "Relax before finals week." },
    ];

    // === 2. THEME ENGINE (Dark Mode) ===
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const htmlEl = document.documentElement;

    const applyTheme = (isDark) => {
        if (isDark) {
            htmlEl.classList.add('dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            htmlEl.classList.remove('dark');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    // Check saved preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    themeToggleBtn.addEventListener('click', () => {
        applyTheme(!htmlEl.classList.contains('dark'));
    });


    // === 3. NAVIGATION & ROUTING ===
    const navLinks = document.querySelectorAll('.nav-link');
    
    const showPage = (pageId) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${pageId}`);
        if(target) target.classList.add('active');

        // Style Nav
        document.querySelectorAll('.nav-item').forEach(link => {
            link.classList.remove('active-nav', 'text-blue-600', 'border-b-4', 'border-blue-600');
            link.classList.add('text-gray-500', 'dark:text-gray-300');
            
            if(link.getAttribute('data-page') === pageId) {
                link.classList.add('active-nav');
                link.classList.remove('text-gray-500', 'dark:text-gray-300');
            }
        });

        // Page specific initializers
        if(pageId === 'hub') updateHub();
        if(pageId === 'rooms') initRoomPage();
        if(pageId === 'events') renderEventList(); // Render full list initially
        if(pageId === 'account') renderAccount();
        if(pageId === 'tools') renderGPATool();
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.target.getAttribute('data-page'));
        });
    });

    // === 4. HUB DASHBOARD LOGIC ===
    const fetchQuote = async () => {
        const el = document.getElementById('quote-widget');
        try {
            const res = await fetch('https://api.quotable.io/random?maxLength=100'); // Short quotes
            if(!res.ok) throw new Error();
            const data = await res.json();
            el.innerHTML = `<p class="italic text-xl mb-2">"${data.content}"</p><p class="text-right font-medium">- ${data.author}</p>`;
        } catch (e) {
            el.innerHTML = `<p class="italic text-xl mb-2">"Knowledge is power."</p><p class="text-right font-medium">- Francis Bacon</p>`;
        }
    };

    const updateHub = () => {
        const title = document.getElementById('hub-welcome');
        title.textContent = currentUser ? `Welcome back, ${currentUser.username}!` : 'Welcome to the Hub';
        
        // Update Stats
        document.getElementById('stats-events-count').textContent = events.length;
        document.getElementById('stats-rooms-available').textContent = rooms.length;
        
        fetchQuote();
    };


    // === 5. AUTHENTICATION SYSTEM ===
    const updateAuthUI = () => {
        const container = document.getElementById('auth-links');
        if (currentUser) {
            container.innerHTML = `
                <a href="#" class="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 transition nav-link" data-page="account">
                    <i class="fa-solid fa-user mr-1"></i> My Account
                </a>
                <button id="logout-btn" class="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                currentUser = null;
                localStorage.removeItem('currentUser');
                updateAuthUI();
                showPage('hub');
                showModal('Logged Out', 'See you next time!');
            });
        } else {
            container.innerHTML = `
                <a href="#" class="py-2 px-4 text-gray-600 dark:text-gray-300 font-semibold hover:text-blue-600 nav-link" data-page="login">Login</a>
                <a href="#" class="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition nav-link" data-page="register">Sign Up</a>
            `;
        }
        // Re-bind navigation links inside auth container
        container.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.target.getAttribute('data-page'));
        }));

        updateHub(); // Update welcome message
    };

    // Hash Helper
    const hash = (str) => "hashed_" + str.split('').reverse().join('');

    // Login Handler
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        const users = JSON.parse(localStorage.getItem('users'));
        const found = users.find(user => user.username === u && user.passwordHash === hash(p));

        if(found) {
            currentUser = { id: found.id, username: found.username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            showPage('hub');
        } else {
            showModal('Error', 'Invalid credentials.');
        }
    });

    // Register Handler
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('register-username').value;
        const p = document.getElementById('register-password').value;
        const users = JSON.parse(localStorage.getItem('users'));

        if(users.find(user => user.username === u)) {
            showModal('Error', 'Username taken.');
            return;
        }

        users.push({ id: Date.now(), username: u, passwordHash: hash(p) });
        localStorage.setItem('users', JSON.stringify(users));
        showModal('Success', 'Account created! Please login.');
        showPage('login');
    });


    // === 6. ROOM BOOKING SYSTEM ===
    const initRoomPage = () => {
        const roomSelect = document.getElementById('room-select');
        const slotSelect = document.getElementById('slot-select');
        
        // Populate only if empty to avoid duplicates on re-render
        if(roomSelect.children.length === 0) {
            roomSelect.innerHTML = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            const slots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00"];
            slotSelect.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
        }

        const form = document.getElementById('room-booking-form-container');
        const prompt = document.getElementById('room-login-prompt');
        
        if(currentUser) {
            form.classList.remove('hidden');
            prompt.classList.add('hidden');
        } else {
            form.classList.add('hidden');
            prompt.classList.remove('hidden');
        }
    };

    document.getElementById('room-booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if(!currentUser) return;

        const roomId = document.getElementById('room-select').value;
        const slot = document.getElementById('slot-select').value;
        const bookings = JSON.parse(localStorage.getItem('bookings'));

        if(bookings.find(b => b.roomId == roomId && b.slot == slot)) {
            showModal('Conflict', 'This room is booked for that time.');
        } else {
            bookings.push({
                id: Date.now(),
                userId: currentUser.id,
                roomId,
                roomName: rooms.find(r => r.id == roomId).name,
                slot
            });
            localStorage.setItem('bookings', JSON.stringify(bookings));
            showModal('Booked!', 'Your room is reserved.');
        }
    });


    // === 7. EVENTS SYSTEM (With Search) ===
    const renderEventList = (filterText = "") => {
        const container = document.getElementById('event-list');
        container.innerHTML = '';
        const reservations = JSON.parse(localStorage.getItem('reservations'));

        // Filter events based on search
        const filteredEvents = events.filter(ev => 
            ev.name.toLowerCase().includes(filterText.toLowerCase()) || 
            ev.category.toLowerCase().includes(filterText.toLowerCase())
        );

        if(filteredEvents.length === 0) {
            container.innerHTML = `<p class="col-span-3 text-center text-gray-500">No events found matching "${filterText}".</p>`;
            return;
        }

        filteredEvents.forEach(ev => {
            const isReserved = currentUser && reservations.find(r => r.eventId == ev.id && r.userId == currentUser.id);
            
            let btn = '';
            if(!currentUser) btn = `<button disabled class="w-full py-2 bg-gray-300 dark:bg-gray-600 text-white rounded cursor-not-allowed">Login to Join</button>`;
            else if(isReserved) btn = `<button disabled class="w-full py-2 bg-green-200 text-green-800 rounded border border-green-300">✓ Registered</button>`;
            else btn = `<button class="join-event-btn w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" data-id="${ev.id}">Register Free</button>`;

            container.innerHTML += `
                <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col h-full border-t-4 border-blue-500">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold uppercase text-blue-500 tracking-wide">${ev.category}</span>
                        <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">${ev.date}</span>
                    </div>
                    <h3 class="text-xl font-bold mb-2 dark:text-gray-100">${ev.name}</h3>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow">${ev.description}</p>
                    <div class="mt-auto">${btn}</div>
                </div>
            `;
        });

        // Attach listeners to new buttons
        document.querySelectorAll('.join-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const evId = e.target.getAttribute('data-id');
                const ev = events.find(e => e.id == evId);
                const currentRes = JSON.parse(localStorage.getItem('reservations'));
                currentRes.push({ id: Date.now(), userId: currentUser.id, eventId: evId, eventName: ev.name });
                localStorage.setItem('reservations', JSON.stringify(currentRes));
                showModal('Registered', `See you at ${ev.name}!`);
                renderEventList(document.getElementById('event-search').value); // Re-render to update button
            });
        });
    };

    // Live Search Listener
    document.getElementById('event-search').addEventListener('input', (e) => {
        renderEventList(e.target.value);
    });


    // === 8. GPA CALCULATOR TOOL ===
    const renderGPATool = () => {
        const tbody = document.getElementById('course-list-body');
        const gpaDisplay = document.getElementById('gpa-display');
        const creditsDisplay = document.getElementById('total-credits-display');
        
        // Get user-specific courses or use a temporary local list if not logged in
        // For simplicity in this demo, we use one shared list in localStorage, 
        // but normally this would be filtered by userId
        let myCourses = JSON.parse(localStorage.getItem('gpa_courses'));

        tbody.innerHTML = '';
        let totalPoints = 0;
        let totalCredits = 0;

        myCourses.forEach((c, index) => {
            totalPoints += (c.grade * c.credits);
            totalCredits += parseInt(c.credits);

            tbody.innerHTML += `
                <tr class="border-b dark:border-gray-700">
                    <td class="py-3 dark:text-gray-200 font-medium">${c.name}</td>
                    <td class="py-3 dark:text-gray-300">${c.credits}</td>
                    <td class="py-3 dark:text-gray-300">${c.grade}</td>
                    <td class="py-3 text-right">
                        <button class="text-red-500 hover:text-red-700 delete-course" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
        gpaDisplay.textContent = gpa;
        creditsDisplay.textContent = `${totalCredits} Credits Earned`;

        // Color coding the GPA
        gpaDisplay.className = "text-6xl font-bold mb-2 " + (gpa >= 3.0 ? "text-green-400" : gpa >= 2.0 ? "text-yellow-400" : "text-red-400");

        // Delete handlers
        document.querySelectorAll('.delete-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                myCourses.splice(idx, 1);
                localStorage.setItem('gpa_courses', JSON.stringify(myCourses));
                renderGPATool();
            });
        });
    };

    document.getElementById('gpa-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('course-name').value;
        const credits = document.getElementById('course-credits').value;
        const grade = document.getElementById('course-grade').value;

        if(!name) return;

        const courses = JSON.parse(localStorage.getItem('gpa_courses'));
        courses.push({ name, credits, grade });
        localStorage.setItem('gpa_courses', JSON.stringify(courses));
        
        document.getElementById('course-name').value = ''; // Reset input
        renderGPATool();
    });

    document.getElementById('reset-gpa').addEventListener('click', () => {
        if(confirm("Clear all GPA data?")) {
            localStorage.setItem('gpa_courses', JSON.stringify([]));
            renderGPATool();
        }
    });


    // === 9. ACCOUNT & ADMIN PANEL ===
    const renderAccount = () => {
        if(!currentUser) { showPage('login'); return; }

        document.getElementById('account-welcome').textContent = `My Account (${currentUser.username})`;

        // Render Lists (Bookings/Reservations) similar to previous version...
        const bookings = JSON.parse(localStorage.getItem('bookings')).filter(b => b.userId === currentUser.id);
        const resList = document.getElementById('my-bookings-list');
        resList.innerHTML = bookings.length ? bookings.map(b => `<div class="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-2 border-l-4 border-blue-500"><p class="font-bold dark:text-white">${b.roomName}</p><p class="text-sm dark:text-gray-300">${b.slot}</p></div>`).join('') : '<p class="text-gray-500">No bookings.</p>';

        const reservations = JSON.parse(localStorage.getItem('reservations')).filter(r => r.userId === currentUser.id);
        const evList = document.getElementById('my-reservations-list');
        evList.innerHTML = reservations.length ? reservations.map(r => `<div class="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-2 border-l-4 border-green-500"><p class="font-bold dark:text-white">${r.eventName}</p></div>`).join('') : '<p class="text-gray-500">No events.</p>';

        // ADMIN CHECK
        const adminPanel = document.getElementById('admin-panel');
        if (currentUser.username === 'admin') {
            adminPanel.classList.remove('hidden');
            const allUsers = JSON.parse(localStorage.getItem('users'));
            document.getElementById('admin-user-count').textContent = allUsers.length;
            
            document.getElementById('admin-clear-db').onclick = () => {
                if(confirm("This will delete ALL users and data. Are you sure?")) {
                    localStorage.clear();
                    location.reload();
                }
            };
        } else {
            adminPanel.classList.add('hidden');
        }
    };

    // === 10. NOTIFICATION MODAL ===
    const modal = document.getElementById('modal');
    const showModal = (title, msg) => {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = msg;
        modal.classList.remove('hidden');
    };
    document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));

    // === INITIALIZATION ===
    updateAuthUI();
    showPage('hub');
});document.addEventListener('DOMContentLoaded', () => {

    // === 1. GLOBAL STATE & CONFIG ===
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    
    // Default Tables
    const initStorage = (key, defaultVal) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(defaultVal));
    }
    initStorage('users', [{id: 0, username: 'admin', passwordHash: 'hashed_nimda'}]); 
    initStorage('bookings', []);
    initStorage('reservations', []);
    initStorage('gpa_courses', []); 
    initStorage('todo_tasks', []);

    // Data Sources
    const rooms = [
        { id: 1, name: "Library Room 101 (Quiet)" },
        { id: 2, name: "Library Room 102 (Group)" },
        { id: 3, name: "Tech Lab A (Computers)" },
        { id: 4, name: "Creative Studio B" },
    ];

    const events = [
        { id: 1, name: "Guest Lecture: AI in 2025", category: "Academic", date: "Nov 12", description: "Dr. Smith on the future of AI." },
        { id: 2, name: "End of Year Tech Ball", category: "Social", date: "Dec 15", description: "Black tie event for CS students." },
        { id: 3, name: "Career Fair", category: "Career", date: "Oct 20", description: "Meet Google, Amazon, and local startups." },
        { id: 4, name: "Hackathon v4.0", category: "Competition", date: "Nov 05", description: "24h coding challenge with prizes." },
        { id: 5, name: "Yoga on the Lawn", category: "Wellness", date: "Sept 10", description: "Relax before finals week." },
    ];

    // === 2. THEME ENGINE (Dark Mode) ===
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const htmlEl = document.documentElement;

    const applyTheme = (isDark) => {
        if (isDark) {
            htmlEl.classList.add('dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            htmlEl.classList.remove('dark');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    themeToggleBtn.addEventListener('click', () => {
        applyTheme(!htmlEl.classList.contains('dark'));
    });


    // === 3. NAVIGATION & ROUTING ===
    const navLinks = document.querySelectorAll('.nav-link');
    
    const showPage = (pageId) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${pageId}`);
        if(target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(link => {
            link.classList.remove('active-nav', 'text-blue-600', 'border-b-4', 'border-blue-600');
            link.classList.add('text-gray-500', 'dark:text-gray-300');
            
            if(link.getAttribute('data-page') === pageId) {
                link.classList.add('active-nav');
                link.classList.remove('text-gray-500', 'dark:text-gray-300');
            }
        });

        // Page specific initializers
        if(pageId === 'hub') updateHub();
        if(pageId === 'rooms') initRoomPage();
        if(pageId === 'events') renderEventList(); 
        if(pageId === 'account') renderAccount();
        if(pageId === 'tools') renderGPATool();
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.target.getAttribute('data-page'));
        });
    });

    // === 4. HUB DASHBOARD LOGIC (Updated with Widgets) ===
    const fetchQuote = async () => {
        const el = document.getElementById('quote-widget');
        try {
            const res = await fetch('https://api.quotable.io/random?maxLength=100'); 
            if(!res.ok) throw new Error();
            const data = await res.json();
            el.innerHTML = `<p>"${data.content}"</p><p class="text-right font-medium mt-1">- ${data.author}</p>`;
        } catch (e) {
            el.innerHTML = `<p>"Knowledge is power."</p><p class="text-right font-medium mt-1">- Francis Bacon</p>`;
        }
    };

    const initWeather = async () => {
        const tempEl = document.getElementById('weather-temp');
        const descEl = document.getElementById('weather-desc');
        const windEl = document.getElementById('weather-wind');
        
        // Demo Coordinates (New York)
        const lat = 40.71; 
        const long = -74.00;

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current_weather=true`);
            const data = await res.json();
            
            const temp = data.current_weather.temperature;
            const wind = data.current_weather.windspeed;
            const code = data.current_weather.weathercode;

            let condition = "Clear Sky";
            if (code > 3) condition = "Cloudy";
            if (code > 50) condition = "Rainy";
            if (code > 70) condition = "Snowy";

            tempEl.textContent = `${temp}°C`;
            descEl.textContent = condition;
            windEl.textContent = wind;
        } catch (error) {
            tempEl.textContent = "--";
            descEl.textContent = "Offline";
        }
    };

    const renderNews = () => {
        const newsContainer = document.getElementById('news-feed');
        const newsItems = [
            { title: "Library Hours Extended", date: "2 hours ago", type: "Campus", color: "bg-blue-100 text-blue-600" },
            { title: "Cafeteria Menu Update", date: "5 hours ago", type: "Dining", color: "bg-orange-100 text-orange-600" },
            { title: "New Parking Rules in Lot B", date: "Yesterday", type: "Alert", color: "bg-red-100 text-red-600" },
            { title: "Student Council Results", date: "2 days ago", type: "News", color: "bg-green-100 text-green-600" }
        ];

        newsContainer.innerHTML = newsItems.map(item => `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-xs font-bold px-2 py-1 rounded ${item.color}">${item.type}</span>
                    <span class="text-xs text-gray-400">${item.date}</span>
                </div>
                <h3 class="font-semibold text-gray-800 dark:text-gray-200">${item.title}</h3>
            </div>
        `).join('');
    };

    const initTodoList = () => {
        const input = document.getElementById('new-task-input');
        const addBtn = document.getElementById('add-task-btn');
        const list = document.getElementById('todo-list');
        let tasks = JSON.parse(localStorage.getItem('todo_tasks')) || [];

        const saveTasks = () => {
            localStorage.setItem('todo_tasks', JSON.stringify(tasks));
            renderTasks();
        };

        const renderTasks = () => {
            list.innerHTML = '';
            if (tasks.length === 0) {
                list.innerHTML = '<li class="text-gray-400 text-sm italic text-center mt-2">No active tasks. Good job!</li>';
                return;
            }

            tasks.forEach((task, index) => {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded group";
                li.innerHTML = `
                    <div class="flex items-center cursor-pointer task-toggle" data-index="${index}">
                        <div class="w-4 h-4 border-2 border-gray-400 rounded mr-2 flex items-center justify-center ${task.completed ? 'bg-blue-500 border-blue-500' : ''}">
                            ${task.completed ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
                        </div>
                        <span class="text-sm dark:text-gray-200 ${task.completed ? 'line-through text-gray-400' : ''}">${task.text}</span>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition delete-task" data-index="${index}">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                list.appendChild(li);
            });

            document.querySelectorAll('.task-toggle').forEach(el => {
                el.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-index');
                    tasks[idx].completed = !tasks[idx].completed;
                    saveTasks();
                });
            });

            document.querySelectorAll('.delete-task').forEach(el => {
                el.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-index');
                    tasks.splice(idx, 1);
                    saveTasks();
                });
            });
        };

        addBtn.addEventListener('click', () => {
            if(input.value.trim() === '') return;
            tasks.push({ text: input.value, completed: false });
            input.value = '';
            saveTasks();
        });

        input.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') addBtn.click();
        });

        renderTasks();
    };

    const updateHub = () => {
        const title = document.getElementById('hub-welcome');
        title.textContent = currentUser ? `Welcome back, ${currentUser.username}!` : 'Welcome to the Hub';
        
        // Date
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', dateOptions);

        // Stats
        document.getElementById('stats-events-count').textContent = events.length;
        document.getElementById('stats-rooms-available').textContent = rooms.length;
        
        // Widgets
        fetchQuote();
        initWeather();
        renderNews();
        initTodoList();
    };


    // === 5. AUTHENTICATION SYSTEM ===
    const updateAuthUI = () => {
        const container = document.getElementById('auth-links');
        if (currentUser) {
            container.innerHTML = `
                <a href="#" class="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 transition nav-link" data-page="account">
                    <i class="fa-solid fa-user mr-1"></i> My Account
                </a>
                <button id="logout-btn" class="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                currentUser = null;
                localStorage.removeItem('currentUser');
                updateAuthUI();
                showPage('hub');
                showModal('Logged Out', 'See you next time!');
            });
        } else {
            container.innerHTML = `
                <a href="#" class="py-2 px-4 text-gray-600 dark:text-gray-300 font-semibold hover:text-blue-600 nav-link" data-page="login">Login</a>
                <a href="#" class="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition nav-link" data-page="register">Sign Up</a>
            `;
        }
        container.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.target.getAttribute('data-page'));
        }));

        updateHub();
    };

    const hash = (str) => "hashed_" + str.split('').reverse().join('');

    document.getElementById('login-form').addEventListener('submit', (e) => {e.preventDefault();
        const u = document.getElementById('register-username').value;
        const p = document.getElementById('register-password').value;
        const users = JSON.parse(localStorage.getItem('users'));

        if(users.find(user => user.username === u)) {
            showModal('Error', 'Username taken.');
            return;
        }

        users.push({ id: Date.now(), username: u, passwordHash: hash(p) });
        localStorage.setItem('users', JSON.stringify(users));
        showModal('Success', 'Account created! Please login.');
        showPage('login');
    });


    // === 6. ROOM BOOKING SYSTEM ===
    const initRoomPage = () => {
        const roomSelect = document.getElementById('room-select');
        const slotSelect = document.getElementById('slot-select');
        
        // Populate only if empty to avoid duplicates on re-render
        if(roomSelect.children.length === 0) {
            roomSelect.innerHTML = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            const slots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00"];
            slotSelect.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
        }

        const form = document.getElementById('room-booking-form-container');
        const prompt = document.getElementById('room-login-prompt');
        
        if(currentUser) {
            form.classList.remove('hidden');
            prompt.classList.add('hidden');
        } else {
            form.classList.add('hidden');
            prompt.classList.remove('hidden');
        }
    };

    document.getElementById('room-booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if(!currentUser) return;

        const roomId = document.getElementById('room-select').value;
        const slot = document.getElementById('slot-select').value;
        const bookings = JSON.parse(localStorage.getItem('bookings'));

        if(bookings.find(b => b.roomId == roomId && b.slot == slot)) {
            showModal('Conflict', 'This room is booked for that time.');
        } else {
            bookings.push({
                id: Date.now(),
                userId: currentUser.id,
                roomId,
                roomName: rooms.find(r => r.id == roomId).name,
                slot
            });
            localStorage.setItem('bookings', JSON.stringify(bookings));
            showModal('Booked!', 'Your room is reserved.');
        }
    });


    // === 7. EVENTS SYSTEM (With Search) ===
    const renderEventList = (filterText = "") => {
        const container = document.getElementById('event-list');
        container.innerHTML = '';
        const reservations = JSON.parse(localStorage.getItem('reservations'));

        // Filter events based on search
        const filteredEvents = events.filter(ev => 
            ev.name.toLowerCase().includes(filterText.toLowerCase()) || 
            ev.category.toLowerCase().includes(filterText.toLowerCase())
        );

        if(filteredEvents.length === 0) {
            container.innerHTML = `<p class="col-span-3 text-center text-gray-500">No events found matching "${filterText}".</p>`;
            return;
        }

        filteredEvents.forEach(ev => {
            const isReserved = currentUser && reservations.find(r => r.eventId == ev.id && r.userId == currentUser.id);
            
            let btn = '';
            if(!currentUser) btn = `<button disabled class="w-full py-2 bg-gray-300 dark:bg-gray-600 text-white rounded cursor-not-allowed">Login to Join</button>`;
            else if(isReserved) btn = `<button disabled class="w-full py-2 bg-green-200 text-green-800 rounded border border-green-300">✓ Registered</button>`;
            else btn = `<button class="join-event-btn w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" data-id="${ev.id}">Register Free</button>`;

            container.innerHTML += `
                <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col h-full border-t-4 border-blue-500">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold uppercase text-blue-500 tracking-wide">${ev.category}</span>
                        <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">${ev.date}</span>
                    </div>
                    <h3 class="text-xl font-bold mb-2 dark:text-gray-100">${ev.name}</h3>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow">${ev.description}</p>
                    <div class="mt-auto">${btn}</div>
                </div>
            `;
        });

        // Attach listeners to new buttons
        document.querySelectorAll('.join-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const evId = e.target.getAttribute('data-id');
                const ev = events.find(e => e.id == evId);
                const currentRes = JSON.parse(localStorage.getItem('reservations'));
                currentRes.push({ id: Date.now(), userId: currentUser.id, eventId: evId, eventName: ev.name });
                localStorage.setItem('reservations', JSON.stringify(currentRes));
                showModal('Registered', `See you at ${ev.name}!`);
                renderEventList(document.getElementById('event-search').value); 
            });
        });
    };

    // Live Search Listener
    document.getElementById('event-search').addEventListener('input', (e) => {
        renderEventList(e.target.value);
    });


    // === 8. GPA CALCULATOR TOOL ===
    const renderGPATool = () => {
        const tbody = document.getElementById('course-list-body');
        const gpaDisplay = document.getElementById('gpa-display');
        const creditsDisplay = document.getElementById('total-credits-display');
        
        let myCourses = JSON.parse(localStorage.getItem('gpa_courses'));

        tbody.innerHTML = '';
        let totalPoints = 0;
        let totalCredits = 0;

        myCourses.forEach((c, index) => {
            totalPoints += (c.grade * c.credits);
            totalCredits += parseInt(c.credits);

            tbody.innerHTML += `
                <tr class="border-b dark:border-gray-700">
                    <td class="py-3 dark:text-gray-200 font-medium">${c.name}</td>
                    <td class="py-3 dark:text-gray-300">${c.credits}</td>
                    <td class="py-3 dark:text-gray-300">${c.grade}</td>
                    <td class="py-3 text-right">
                        <button class="text-red-500 hover:text-red-700 delete-course" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
        gpaDisplay.textContent = gpa;
        creditsDisplay.textContent = `${totalCredits} Credits Earned`;

        gpaDisplay.className = "text-6xl font-bold mb-2 " + (gpa >= 3.0 ? "text-green-400" : gpa >= 2.0 ? "text-yellow-400" : "text-red-400");

        document.querySelectorAll('.delete-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                myCourses.splice(idx, 1);
                localStorage.setItem('gpa_courses', JSON.stringify(myCourses));
                renderGPATool();
            });
        });
    };

    document.getElementById('gpa-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('course-name').value;
        const credits = document.getElementById('course-credits').value;
        const grade = document.getElementById('course-grade').value;

        if(!name) return;

        const courses = JSON.parse(localStorage.getItem('gpa_courses'));
        courses.push({ name, credits, grade });
        localStorage.setItem('gpa_courses', JSON.stringify(courses));
        
        document.getElementById('course-name').value = ''; 
        renderGPATool();
    });

    document.getElementById('reset-gpa').addEventListener('click', () => {
        if(confirm("Clear all GPA data?")) {
            localStorage.setItem('gpa_courses', JSON.stringify([]));
            renderGPATool();
        }
    });


    // === 9. ACCOUNT & ADMIN PANEL ===
    const renderAccount = () => {
        if(!currentUser) { showPage('login'); return; }

        document.getElementById('account-welcome').textContent = `My Account (${currentUser.username})`;

        const bookings = JSON.parse(localStorage.getItem('bookings')).filter(b => b.userId === currentUser.id);
        const resList = document.getElementById('my-bookings-list');
        resList.innerHTML = bookings.length ? bookings.map(b => `<div class="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-2 border-l-4 border-blue-500"><p class="font-bold dark:text-white">${b.roomName}</p><p class="text-sm dark:text-gray-300">${b.slot}</p></div>`).join('') : '<p class="text-gray-500">No bookings.</p>';

        const reservations = JSON.parse(localStorage.getItem('reservations')).filter(r => r.userId === currentUser.id);
        const evList = document.getElementById('my-reservations-list');
        evList.innerHTML = reservations.length ? reservations.map(r => `<div class="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-2 border-l-4 border-green-500"><p class="font-bold dark:text-white">${r.eventName}</p></div>`).join('') : '<p class="text-gray-500">No events.</p>';

        // ADMIN CHECK
        const adminPanel = document.getElementById('admin-panel');
        if (currentUser.username === 'admin') {
            adminPanel.classList.remove('hidden');
            const allUsers = JSON.parse(localStorage.getItem('users'));
            document.getElementById('admin-user-count').textContent = allUsers.length;
            
            document.getElementById('admin-clear-db').onclick = () => {
                if(confirm("This will delete ALL users and data. Are you sure?")) {
                    localStorage.clear();
                    location.reload();
                }
            };
        } else {
            adminPanel.classList.add('hidden');
        }
    };

    // === 10. NOTIFICATION MODAL ===
    const modal = document.getElementById('modal');
    const showModal = (title, msg) => {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = msg;
        modal.classList.remove('hidden');
    };
    document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));

    // === INITIALIZATION ===
    updateAuthUI();
    showPage('hub');
});