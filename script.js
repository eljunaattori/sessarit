// ===== MAP SETUP =====
const map = L.map('map', {
  doubleClickZoom: false,  // disables double-tap zoom
  zoomControl: true
}).setView([60.45159, 22.26700], 16);

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
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popupMessage");
const popupOkBtn = document.getElementById("popupOkBtn");
const locateBtn = document.getElementById("locateBtn");
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfile = document.getElementById('closeProfile');
const displayNameInput = document.getElementById('displayName');
const profilePicInput = document.getElementById('profilePic');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userEmailSpan = document.getElementById('userEmail');
const displayNameText = document.getElementById('displayNameText');
const emailText = document.getElementById('emailText');
const profilePicDisplay = document.getElementById('profilePicDisplay');
const profileEditDiv = document.getElementById('profileEdit');
const profileDisplayDiv = document.getElementById('profileDisplay');
const editProfileBtn = document.getElementById('editProfileBtn');
const pic = document.getElementById("userProfilePic");

let addingSpot = false;
let tempLatLng = null;
let selectedTags = [];
let selectedFilterTags = [];
let markers = [];
let userMarker = null; // keep track of the marker globally

document.addEventListener("DOMContentLoaded", () => {
    loadSpots();
});

// Function to update auth button visibility
async function updateAuthButton() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    authBtn.style.display = 'none';
    signOutBtn.style.display = 'block';
    profileBtn.style.display = 'block';
    userEmailSpan.style.display = 'inline';
    userEmailSpan.textContent = user.email;
    userInfo.style.display = "block";

    // Pre-fill profile fields if stored
    const { data: meta } = await supabase
    .from('users_meta')
    .select('display_name, profile_pic')
    .eq('id', user.id)
    .single();
    if (meta) {
      displayNameInput.value = meta.display_name || '';
      profilePicInput.value = meta.profile_pic || '';
    }

document.getElementById("userDisplayName").textContent = meta?.display_name 
  ? `"${meta.display_name}"`
  : ""; 
document.getElementById("userEmail").textContent = user.email || "";

  if (meta?.profile_pic) {
    pic.src = meta.profile_pic;
    pic.style.display = "block";
  } else {
    pic.style.display = "none";
  }

  } else {
    authBtn.style.display = 'block';
    signOutBtn.style.display = 'none';
    profileBtn.style.display = 'none';
    userEmailSpan.style.display = 'none';
    userEmailSpan.textContent = '';
    userInfo.style.display = "none";
  }
}

// Call on page load
updateAuthButton();

// ===== LOGIN =====
authSubmitBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showPopup("Täytä sekä sähköposti että salasana.");
    return;
  }

  try {
    // Try to sign in first
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInError) {
      showPopup("Kirjauduttu sisään!");
      authModal.classList.add('hidden');
      updateAuthButton(); // Update auth button
    } else if (signInError.message.includes("User not found")) {
      // Email not registered → sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        showPopup("Rekisteröinti epäonnistui: " + signUpError.message);
      } else {
        showPopup("Tili luotu! Tarkista sähköpostisi vahvistaaksesi tilin.");
        authModal.classList.add('hidden');
      }
    } else {
      showPopup("Kirjautuminen epäonnistui: " + signInError.message);
    }
  } catch (err) {
    console.error(err);
    showPopup("Tapahtui virhe: " + err.message);
  }
});

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showPopup("Kirjauduttu ulos!");
  updateAuthButton();
});

  async function openProfileModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showPopup("Et ole kirjautunut sisään.");

    const { data: meta } = await supabase.from('users_meta').select('display_name, profile_pic').eq('id', user.id).single();

    displayNameText.textContent = meta?.display_name || "(ei asetettu)";
    profilePicDisplay.src = meta?.profile_pic || "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png";
    emailText.textContent = user.email;

    displayNameInput.value = meta?.display_name || "";
    profilePicInput.value = meta?.profile_pic || "";

    profileDisplayDiv.style.display = 'block';
    profileEditDiv.style.display = 'none';
    editProfileBtn.style.display = 'inline-block';
    saveProfileBtn.style.display = 'none';

    profileModal.classList.remove('hidden');
  }

  editProfileBtn.addEventListener('click', () => {
    profileDisplayDiv.style.display = 'none';
    profileEditDiv.style.display = 'block';
    editProfileBtn.style.display = 'none';
    saveProfileBtn.style.display = 'inline-block';
  });

  saveProfileBtn.addEventListener('click', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showPopup("Et ole kirjautunut sisään.");

    const display_name = displayNameInput.value.trim();
    const profile_pic = profilePicInput.value.trim();

  // Upsert the user's profile meta
  const { data, error } = await supabase.from('users_meta').upsert({
    id: user.id,          // must match auth.uid()
    display_name,
    profile_pic
  });

    if (error) return showPopup("Profiilin tallennus epäonnistui: " + error.message);

    displayNameText.textContent = display_name || "(ei asetettu)";
    profilePicDisplay.src = profile_pic || "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png";

    profileDisplayDiv.style.display = 'block';
    profileEditDiv.style.display = 'none';
    editProfileBtn.style.display = 'inline-block';
    saveProfileBtn.style.display = 'none';

    showPopup("Profiili päivitetty!");
  });

  profileBtn.addEventListener('click', openProfileModal);

  closeProfile.addEventListener('click', () => profileModal.classList.add('hidden'));
  window.addEventListener('click', e => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

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

// ===== ADD MARKER FUNCTION =====
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
    showPopup("Sinun täytyy olla kirjautunut sisään luodaksesi spotin!");
    return;
  }

  const { data: meta } = await supabase
  .from("users_meta")
  .select("display_name")
  .eq("id", user.id)
  .single();

  const creator_display_name = meta?.display_name || "Tuntematon";

  const { data, error } = await supabase
    .from('spots')
    .insert([{
      title,
      description: desc,
      image_url: imageUrl,
      tags,
      lat,
      lng,
      user_id: user.id,
      creator_display_name }])
    .select();

  if (error) {
    showPopup('Ongelma tallentaessa spottia: ' + error.message);
    return;
  }

  const savedSpot = data[0];

  const creatorHtml = savedSpot.creator_display_name 
  ? `<br><small>By: "${savedSpot.creator_display_name}"</small>` 
  : "";

  const marker = L.marker([lat, lng]).addTo(map);
  const tagsHtml = tags.length ? `<br><small>Tägit: ${tags.join(', ')}</small>` : '';
  const imageHtml = imageUrl ? `<br><img src="${imageUrl}" style="max-width:100%;" alt="Kuva spotista">` : '';
  const popupContent = `
    <div>
      <b>${title}</b><br>
      ${desc}${imageHtml}${tagsHtml}<br>
      <small>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</small><br>
      ${creatorHtml}
      <button onclick="deleteMarker(${marker._leaflet_id}, ${savedSpot.id})">Poista</button>
    </div>
  `;
  marker.bindPopup(popupContent);

  markers.push({ marker, lat, lng, tags, imageUrl, id: savedSpot.id, user_id: user.id });

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
    const { data: spots, error } = await supabase
      .from("spots")
      .select("id, title, description, image_url, tags, lat, lng, user_id, creator_display_name");

    if (error) {
      console.error("Error loading spots:", error.message);
      return;
    }

    console.log("Loaded spots:", spots);

    // Remove any existing markers from the map and reset the markers array
    if (markers && markers.length) {
      markers.forEach(m => {
        try { if (m.marker && map.hasLayer(m.marker)) map.removeLayer(m.marker); }
        catch (e) { /* ignore */ }
      });
    }
    markers = [];

    // Add each spot and create popup content (creatorHtml is computed per spot)
    spots.forEach(spot => {
      const marker = L.marker([spot.lat, spot.lng]).addTo(map);

      const tagsHtml = spot.tags && spot.tags.length ? `<br><small>Tägit: ${spot.tags.join(", ")}</small>` : '';
      const imageHtml = spot.image_url ? `<br><img src="${spot.image_url}" style="max-width:150px; display:block; margin-top:5px;">` : '';
      const creatorHtml = spot.creator_display_name ? `<br><small>Tekijä: "${spot.creator_display_name}"</small>` : '';

      const popupContent = `
        <div>
          <b>${spot.title}</b><br>
          ${spot.description || ""}${imageHtml}${tagsHtml}<br>
          <small>Lat: ${spot.lat.toFixed(5)}, Lng: ${spot.lng.toFixed(5)}</small>
          ${creatorHtml}
        </div>
      `;

      marker.bindPopup(popupContent);

      markers.push({
        marker,
        lat: spot.lat,
        lng: spot.lng,
        tags: spot.tags || [],
        imageUrl: spot.image_url || null,
        id: spot.id,
        user_id: spot.user_id,
        creator_display_name: spot.creator_display_name || null
      });
    });

    // Enable filter buttons after markers loaded
    document.querySelectorAll('.filterOption').forEach(btn => btn.disabled = false);

  } catch (err) {
    console.error("Unexpected error loading spots:", err);
  }
}

// ===== FILTER LOGIC =====
document.querySelectorAll('.filterOption').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag.trim();
    if (selectedFilterTags.includes(tag)) selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
    else selectedFilterTags.push(tag);

    btn.classList.toggle('selected');

    markers.forEach(obj => {
      const visible = selectedFilterTags.length === 0 || obj.tags.some(t => selectedFilterTags.includes(t));
      if (visible && !map.hasLayer(obj.marker)) map.addLayer(obj.marker);
      if (!visible && map.hasLayer(obj.marker)) map.removeLayer(obj.marker);
    });
  });
});

// ===== AUTH MODAL =====
authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));
window.addEventListener('click', e => {
  if (e.target === authModal) authModal.classList.add('hidden');
});

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => map.invalidateSize());

// Function to show popup with a message
function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}

// Function to hide popup
function hidePopup() {
  popup.classList.add("hidden");
}

// Button & outside click
popupOkBtn.addEventListener("click", hidePopup);
popup.addEventListener("click", (e) => {
  if (e.target === popup) hidePopup();
});

// Location button & logic
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showPopup("Selaimesi ei tue GPS-paikannusta.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      // Move map to current location
      map.setView([latitude, longitude], 16);

      // Add or move a marker for the user
      if (!userMarker) {
        userMarker = L.marker([latitude, longitude], { 
          icon: L.icon({ 
            iconUrl: 'https://www.iconpacks.net/icons/2/free-location-pin-icon-2965-thumb.png', 
            iconSize: [40, 40], 
            iconAnchor: [20, 40], 
            popupAnchor: [0, -40] 
          }) 
        }).addTo(map)
          .bindPopup("Olet tässä.")
          .openPopup();
      } else {
        userMarker.setLatLng([latitude, longitude]).openPopup();
      }
    },
    (error) => {
      showPopup("GPS-paikannus epäonnistui: " + error.message);
    }
  );
});

// Locate user on page load
navigator.geolocation.getCurrentPosition(
  (pos) => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 14);
  }
);