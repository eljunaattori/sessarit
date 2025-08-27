// ===== MAP SETUP =====
const map = L.map('map').setView([60.45159, 22.26700], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ===== DOM ELEMENTS =====
const addSpotBtn = document.getElementById('addSpotBtn');
const spotForm = document.getElementById('spotForm');
const addSpotForm = document.getElementById('addSpotForm');
const cancelSpot = document.getElementById('cancelSpot');
const imageUrlInput = document.getElementById('spotImageUrl');
const imagePreview = document.getElementById('imagePreview');
const filterBtn = document.getElementById('filterBtn');
const filterPanel = document.getElementById('filterPanel');
const authModal = document.getElementById('authModal');
const authBtn = document.getElementById('authBtn');
const closeAuth = document.getElementById('closeAuth');

let addingSpot = false;
let tempLatLng = null;
let selectedTags = [];
let selectedFilterTags = [];
let markers = [];

document.addEventListener("DOMContentLoaded", () => {
    loadSpots();
  });

// ========= LOGIN PASKAA =======
// Sign up new user
async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email to confirm!");
  }
  
  // Sign in existing user
  async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else alert("Signed in!");
  }
  
  // Sign out
  async function signOut() {
    await supabase.auth.signOut();
    alert("Signed out!");
  }

// ===== FILTER PANEL TOGGLE =====
filterBtn.addEventListener('click', () => {
    filterPanel.style.display = filterPanel.style.display === 'flex' ? 'none' : 'flex';
});

// ===== ADD SPOT MODE =====
addSpotBtn.addEventListener('click', e => {
    e.stopPropagation();
    addingSpot = !addingSpot;
    addSpotBtn.textContent = addingSpot ? "Paina kartasta" : "Lisää Spotti";
});

// ===== MAP CLICK =====
map.on('click', e => {
    if (!addingSpot) return;
    tempLatLng = e.latlng;
    spotForm.style.display = 'flex';

    addingSpot = false;
    addSpotBtn.textContent = "Lisää Spotti";
});

// ===== TAG SELECTION =====
document.querySelectorAll('.tagBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.textContent.trim();
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
            btn.classList.remove('selected');
        } else {
            selectedTags.push(tag);
            btn.classList.add('selected');
        }
    });
});

// ===== IMAGE PREVIEW =====
if (imagePreview) {
    imageUrlInput.addEventListener('input', () => {
        const url = imageUrlInput.value.trim();
        imagePreview.innerHTML = url ? `<img src="${url}" style="max-width:100%;" alt="Preview">` : '';
    });
}

// ===== DELETE MARKER =====
window.deleteMarker = async (leafletId, spotId = null) => {
    const markerObj = markers.find(m => m.marker._leaflet_id === leafletId);
    if (!markerObj) return;

    if (confirm('Haluatko varmasti poistaa tämän spotin?')) {
        map.removeLayer(markerObj.marker);
        markers = markers.filter(m => m !== markerObj);

        if (spotId) {
            const { error } = await supabase.from('spots').delete().eq('id', spotId);
            if (error) console.error('Error deleting spot:', error.message);
        }
    }
};

// ===== ADD MARKER FUNCTION (SUPABASE INSERT) =====
async function addMarkerWithImage(imageUrl) {
    if (!tempLatLng) return;

    const title = document.getElementById('spotTitle').value.trim();
    const desc = document.getElementById('spotDesc').value.trim();
    const tags = [...selectedTags];
    const lat = tempLatLng.lat;
    const lng = tempLatLng.lng;

    // Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("You must be logged in to add a spot!");
        return;
    }

    // Insert spot into Supabase with user_id
    const { data, error } = await supabase
        .from('spots')
        .insert([{ 
            title, 
            description: desc, 
            image_url: imageUrl, 
            tags, 
            lat, 
            lng,
            user_id: user.id   // 👈 save spot owner
        }])
        .select();

    if (error) {
        alert('Error saving spot: ' + error.message);
        return;
    }

    const savedSpot = data[0];

    // Add marker to map (same as before)
    const marker = L.marker([lat, lng]).addTo(map);
    const tagsHtml = tags.length ? `<br><small>Tägit: ${tags.join(', ')}</small>` : '';
    const imageHtml = imageUrl ? `<br><img src="${imageUrl}" style="max-width:100%;" alt="Kuva spotista">` : '';
    const popupContent = `
        <div>
            <b>${title}</b><br>
            ${desc}${imageHtml}${tagsHtml}<br>
            <small>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</small><br>
            <button onclick="deleteMarker(${marker._leaflet_id}, ${savedSpot.id})">Poista</button>
        </div>
    `;
    marker.bindPopup(popupContent);

    markers.push({ marker, tags, imageUrl, id: savedSpot.id });

    // Reset form
    spotForm.style.display = 'none';
    addSpotForm.reset();
    imagePreview.innerHTML = '';
    selectedTags = [];
    document.querySelectorAll('.tagBtn').forEach(btn => btn.classList.remove('selected'));
    tempLatLng = null;
}

// ===== FORM SUBMISSION =====
addSpotForm.addEventListener('submit', e => {
    e.preventDefault();
    const url = imageUrlInput.value.trim() || null;
    addMarkerWithImage(url);
});

// ===== CANCEL BUTTON =====
cancelSpot.addEventListener('click', () => {
    spotForm.style.display = 'none';
    addSpotForm.reset();
    selectedTags = [];
    document.querySelectorAll('.tagBtn').forEach(btn => btn.classList.remove('selected'));
    tempLatLng = null;
    imagePreview.innerHTML = '';
});

// ===== LOAD SPOTS FROM SUPABASE =====
async function loadSpots() {
    try {
      const { data, error } = await supabase
        .from("spots")
        .select("id, title, description, image_url, tags, lat, lng, user_id");
  
      if (error) {
        console.error("Error loading spots:", error.message);
        return;
      }
  
      console.log("Loaded spots:", data);
  
      data.forEach(spot => {
        const marker = L.marker([spot.lat, spot.lng]).addTo(map);
  
        let popupContent = `<b>${spot.title}</b><br>${spot.description || ""}<br>`;
  
        if (spot.image_url) {
          popupContent += `<img src="${spot.image_url}" style="max-width:150px; display:block; margin-top:5px;">`;
        }
  
        if (spot.tags && spot.tags.length > 0) {
          popupContent += `<br><i>Tags: ${spot.tags.join(", ")}</i>`;
        }
  
        marker.bindPopup(popupContent);
      });
    } catch (err) {
      console.error("Unexpected error loading spots:", err);
    }
  }

// Call on page load
loadSpots();

// ===== FILTER LOGIC =====
document.querySelectorAll('.filterOption').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.dataset.tag.trim();

        if (selectedFilterTags.includes(tag)) {
            selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
            btn.classList.remove('selected');
        } else {
            selectedFilterTags.push(tag);
            btn.classList.add('selected');
        }

        // Update marker visibility
        markers.forEach(obj => {
            const hasTag = obj.tags.some(t => selectedFilterTags.includes(t));
            if (selectedFilterTags.length === 0 || hasTag) {
                obj.marker.addTo(map);
            } else {
                map.removeLayer(obj.marker);
            }
        });
    });
});

// ===== AUTH MODAL =====
authBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
});

closeAuth.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

// Close if user clicks outside content
window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    authModal.classList.add('hidden');
  }
});