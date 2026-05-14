import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    getAuth, 
    signInWithPopup, 
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

onAuthStateChanged(auth, async (user) => {
    const userDisplay = document.getElementById('userDisplayName');
    
    if (user) {
        console.log("Zalogowano UID:", user.uid);
        currentUserPath = `users/${user.uid}`;
        
        // KROK 1: Sprawdź czy użytkownik ma już swoją bazę, jeśli nie - stwórz ją
        await checkAndInitializeUser(user);

        if (userDisplay) {
            userDisplay.innerText = `Zalogowany jako: ${user.displayName}`;
        }

        // KROK 2: Załaduj dane i przejdź do home1
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
            console.log("Pierwsze logowanie. Tworzę bazę danych dla użytkownika...");
            
            // Definiujemy startową strukturę danych
            const initialData = {
                profile: {
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString()
                },
                decks: {} // Pusta lista talii na start
            };
            
            await set(userRef, initialData);
            console.log("Baza zainicjalizowana pomyślnie.");
        } else {
            console.log("Użytkownik już istnieje w bazie, wczytuję dane.");
        }
    } catch (error) {
        console.error("Błąd podczas sprawdzania bazy:", error);
    }
}

// --- LOGIKA BAZY DANYCH ---

function loadUserDecks() {
    if (!currentUserPath) return;

    const userDecksRef = ref(db, `${currentUserPath}/decks`);
    
    // Nasłuchiwanie zmian w czasie rzeczywistym
    onValue(userDecksRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("Twoje talie:", data);
            // Tutaj możesz wywołać funkcję rysującą talie w HTML (np. renderDecks(data))
        } else {
            console.log("Twoja lista talii jest obecnie pusta.");
        }
    });
}

// --- PRZYCISKI I NAWIGACJA ---

document.getElementById('loginBtn')?.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => console.error("Błąd logowania:", err));
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    signOut(auth).catch(err => console.error("Błąd wylogowania:", err));
});

window.navigateTo = function(targetId) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) navigationHistory.push(currentScreen.id);
    updateView(targetId);
}

window.goBack = function() {
    if (navigationHistory.length > 0) {
        const lastId = navigationHistory.pop();
        updateView(lastId);
    }
}

function updateView(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
}