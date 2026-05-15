import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    getAuth, 
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Konfiguracja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAqrZcmkSKodkqinuErThe9lREVHgCYBCY",
    authDomain: "meno-9a306.firebaseapp.com",
    databaseURL: "https://meno-9a306-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "meno-9a306",
    storageBucket: "meno-9a306.firebasestorage.app",
    messagingSenderId: "441915455313",
    appId: "1:441915455313:web:b23e5fa61e3d3acc1a8570",
    measurementId: "G-076PBDDZZX"
};

// 2. Inicjalizacja
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Zmienne globalne
let navigationHistory = [];
let currentUserPath = null;

// --- LOGIKA AUTORYZACJI I INICJALIZACJI BAZY ---

// Obsługa wyniku przekierowania (ważne dla telefonów z redirect flow)
// onAuthStateChanged i tak złapie zalogowanego usera — ten blok obsługuje tylko błędy redirect
getRedirectResult(auth).catch((error) => {
    // Ignoruj błąd "No redirect operation" — to normalny stan gdy nie było redirect
    if (error.code !== 'auth/no-current-user') {
        console.error("Błąd po przekierowaniu:", error.code, error.message);
    }
});

// Słuchacz stanu zalogowania — główna logika, działa zarówno po popup jak i redirect
onAuthStateChanged(auth, async (user) => {
    const userDisplay = document.getElementById('userDisplayName');
    
    if (user) {
        console.log("Zalogowano UID:", user.uid);
        currentUserPath = `users/${user.uid}`;
        
        await checkAndInitializeUser(user);

        if (userDisplay) {
            userDisplay.innerText = `${user.displayName}`;
        }

        loadUserDecks();
        navigationHistory = [];
        updateView('home1');
    } else {
        currentUserPath = null;
        if (userDisplay) userDisplay.innerText = "";
        updateView('login-section');
    }
});

// Funkcja sprawdzająca/tworząca strukturę bazy dla nowego użytkownika
async function checkAndInitializeUser(user) {
    const userRef = ref(db, currentUserPath);
    
    try {
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            console.log("Pierwsze logowanie. Tworzę strukturę bazy...");
            const initialData = {
                profile: {
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString()
                },
                decks: {}
            };
            await set(userRef, initialData);
        }
    } catch (error) {
        console.error("Błąd inicjalizacji użytkownika:", error);
    }
}

// --- LOGIKA PRZYCISKÓW ---

// Przycisk Logowania
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            if (err.code === 'auth/popup-blocked') {
                signInWithRedirect(auth, provider);
            } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            } else {
                alert("Błąd logowania: " + err.message);
            }
        }
    });
}

// Przycisk Wylogowania
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(err => console.error("Błąd wylogowania:", err));
    });
}

// --- LOGIKA BAZY DANYCH ---

function loadUserDecks() {
    if (!currentUserPath) return;

    const userDecksRef = ref(db, `${currentUserPath}/decks`);
    
    onValue(userDecksRef, (snapshot) => {
        const data = snapshot.val();
        renderDecks(data);
    });
}

function renderDecks(data) {
    const deckList = document.getElementById('deckList');
    if (!deckList) return;

    // Czyścimy listę (oprócz przycisku add)
    const addBtn = document.getElementById('addDeckBtn');
    deckList.innerHTML = '';

    if (data) {
        // Firebase może zwracać obiekt lub tablicę — normalizujemy do tablicy
        const decks = Array.isArray(data) ? data : Object.values(data);
        
        decks.forEach(deck => {
            const cardCount = deck.cards ? Object.values(deck.cards).length : 0;
            const card = document.createElement('div');
            card.className = 'deck-card';
            card.innerHTML = `
                <h2>${deck.title}</h2>
                <span class="deck-count">${cardCount} kart</span>
            `;
            card.addEventListener('click', () => navigateTo('deck2'));
            deckList.appendChild(card);
        });
    }

    // Przycisk zawsze na końcu
    deckList.appendChild(addBtn);
}

// Przycisk dodawania nowej talii
const addDeckBtn = document.getElementById('addDeckBtn');
if (addDeckBtn) {
    addDeckBtn.addEventListener('click', async () => {
        const title = prompt("Nazwa nowej talii:");
        if (!title || !title.trim()) return;

        const newDeck = {
            id: `deck_${Date.now()}`,
            title: title.trim(),
            cards: {}
        };

        const decksRef = ref(db, `${currentUserPath}/decks/${newDeck.id}`);
        try {
            await set(decksRef, newDeck);
        } catch (err) {
            console.error("Błąd dodawania talii:", err);
        }
    });
}

// --- NAWIGACJA MIĘDZY EKRANAMI ---

// Czas animacji musi pasować do transition w CSS (w ms)
const ANIM_DURATION = 400;

window.navigateTo = function(targetId) {
    const currentScreen = document.querySelector('.screen.active');
    const targetScreen = document.getElementById(targetId);
    if (!targetScreen || !currentScreen || currentScreen.id === targetId) return;

    navigationHistory.push(currentScreen.id);

    // Nowy ekran startuje z prawej
    targetScreen.style.transition = 'none';
    targetScreen.classList.remove('slide-out-left', 'slide-out-right');
    targetScreen.style.transform = 'translateX(110%)';
    targetScreen.style.opacity = '0';

    // Wymuszamy reflow żeby reset się zaaplikował
    targetScreen.offsetHeight;

    targetScreen.style.transition = '';
    currentScreen.classList.add('slide-out-left');
    currentScreen.classList.remove('active');
    targetScreen.classList.add('active');
    targetScreen.style.transform = '';
    targetScreen.style.opacity = '';

    // Sprzątamy klasy po animacji
    setTimeout(() => {
        currentScreen.classList.remove('slide-out-left');
    }, ANIM_DURATION);
}

window.goBack = function() {
    if (navigationHistory.length === 0) return;

    const currentScreen = document.querySelector('.screen.active');
    const lastId = navigationHistory.pop();
    const targetScreen = document.getElementById(lastId);
    if (!targetScreen || !currentScreen) return;

    // Nowy ekran startuje z lewej
    targetScreen.style.transition = 'none';
    targetScreen.classList.remove('slide-out-left', 'slide-out-right');
    targetScreen.style.transform = 'translateX(-110%)';
    targetScreen.style.opacity = '0';

    targetScreen.offsetHeight;

    targetScreen.style.transition = '';
    currentScreen.classList.add('slide-out-right');
    currentScreen.classList.remove('active');
    targetScreen.classList.add('active');
    targetScreen.style.transform = '';
    targetScreen.style.opacity = '';

    setTimeout(() => {
        currentScreen.classList.remove('slide-out-right');
    }, ANIM_DURATION);
}

function updateView(id) {
    // Resetujemy wszystkie ekrany bez animacji (używane przy loginie/logout)
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active', 'slide-out-left', 'slide-out-right');
        s.style.transform = '';
        s.style.opacity = '';
        s.style.transition = 'none';
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
    }
    // Przywracamy transition po chwili
    setTimeout(() => {
        document.querySelectorAll('.screen').forEach(s => {
            s.style.transition = '';
        });
    }, 50);
}