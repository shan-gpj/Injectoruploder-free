// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBgvtWuPEM9vF7ZZr0spiNL9v_0C4f0s0Y",
  authDomain: "webapp-198f9.firebaseapp.com",
  databaseURL: "https://webapp-198f9-default-rtdb.firebaseio.com",
  projectId: "webapp-198f9",
  storageBucket: "webapp-198f9.firebasestorage.app",
  messagingSenderId: "911534322604",
  appId: "1:911534322604:web:5c5947c9822aed0e414009",
  measurementId: "G-VFPBLMFYMV"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Pages
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');

// Login elements
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');

// Logout
const logoutBtn = document.getElementById('logoutBtn');

// Current user
let currentUser = localStorage.getItem('apkUser') || "";

// Apps
let apps = [];
let lastUploadedAPK = null;

// Check login state
function checkLogin() {
  if(currentUser) {
    loginPage.style.display='none';
    mainApp.style.display='flex';
    document.getElementById('profileName').textContent = `Name: ${currentUser}`;
    loadApps();
  } else {
    loginPage.style.display='flex';
    mainApp.style.display='none';
  }
}

// Login/Register
loginBtn.addEventListener('click', ()=>{
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username || !password) return alert("Fill username and password");

  const userRef = database.ref('users/' + username);
  userRef.get().then(snapshot => {
    if(snapshot.exists()){
      const data = snapshot.val();
      if(data.password === password){
        currentUser = username;
        localStorage.setItem('apkUser', currentUser);
        checkLogin();
      } else alert("Incorrect password for this username");
    } else {
      // Register new user
      userRef.set({password: password}).then(()=>{
        currentUser = username;
        localStorage.setItem('apkUser', currentUser);
        checkLogin();
      }).catch(err=>{
        console.error(err);
        alert("Failed to register user");
      });
    }
  }).catch(err=>{
    console.error(err);
    alert("Firebase login failed");
  });
});

// Logout
logoutBtn.addEventListener('click', ()=>{
  currentUser="";
  localStorage.removeItem('apkUser');
  checkLogin();
});

// Navigation
const navBtns = document.querySelectorAll('.navBtn');
const pages = document.querySelectorAll('.page');
navBtns.forEach(btn=>{
  btn.addEventListener('click',()=>{
    pages.forEach(p=>p.style.display='none');
    document.getElementById(btn.dataset.page).style.display='block';
  });
});

// Tabs
const tabs = document.querySelectorAll('.tabBtn');
tabs.forEach(tab=>{
  tab.addEventListener('click', ()=>{
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderApps(tab.dataset.tab);
  });
});

// Upload APK
const apkInput = document.getElementById('apkInput');
const iconInput = document.getElementById('iconInput');
const descInput = document.getElementById('descInput');
const appNameInput = document.getElementById('appNameInput');
const uploadBtnElm = document.getElementById('uploadBtn');
const appGallery = document.getElementById('appGallery');
const iconPreviewImg = document.getElementById('iconPreviewImg');
const defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/3/3e/Android_icon.png";
const uploadProgress = document.getElementById('uploadProgress');

// Icon preview
iconInput.addEventListener('change', async ()=>{
  const file = iconInput.files[0];
  if(file){
    const base64 = await fileToBase64(file);
    iconPreviewImg.src = base64;
  } else iconPreviewImg.src = defaultIcon;
});

// Convert file -> base64 with progress
function fileToBase64(file, onProgress=null){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onprogress = e=>{
      if(onProgress && e.lengthComputable){
        const percent = Math.round((e.loaded/e.total)*100);
        onProgress(percent);
      }
    }
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = err=>reject(err);
    reader.readAsDataURL(file);
  });
}

// Upload handler
uploadBtnElm.addEventListener('click', async ()=>{
  const apkFile = apkInput.files[0];
  const iconFile = iconInput.files[0];
  const appName = appNameInput.value.trim();
  const desc = descInput.value.trim();
  if(!apkFile || !desc || !appName) return alert("Fill all fields");

  uploadProgress.style.display='block';
  uploadProgress.value=0;

  let iconBase64 = defaultIcon;
  if(iconFile){
    iconBase64 = await fileToBase64(iconFile, percent=>{
      uploadProgress.value = percent/2; // first half for icon
    });
  }

  const apkBase64 = await fileToBase64(apkFile, percent=>{
    uploadProgress.value = 50 + percent/2; // second half for APK
  });

  const sizeMB = (apkFile.size/(1024*1024)).toFixed(2);
  const id = Date.now();

  const appData = {
    id,
    name: appName,
    iconBase64,
    apkBase64,
    desc,
    sizeMB,
    downloads: 0,
    uploader: currentUser,
    timestamp: id
  };

  database.ref('apps/' + id).set(appData).then(()=>{
    alert("Upload complete!");
    uploadProgress.style.display='none';
    apkInput.value=''; iconInput.value=''; descInput.value=''; appNameInput.value=''; iconPreviewImg.src = defaultIcon;
  }).catch(err=>{
    console.error(err);
    alert("Failed to upload APK");
    uploadProgress.style.display='none';
  });
});

// Load apps from Firebase
function loadApps(){
  database.ref('apps').on('value', snapshot=>{
    apps = [];
    snapshot.forEach(child=>{
      apps.push(child.val());
    });
    const activeTab = document.querySelector('.tabBtn.active')?.dataset.tab || 'latest';
    renderApps(activeTab);
  });
}

// Render apps with tab filter
function renderApps(filter){
  appGallery.innerHTML='';
  let sorted = [...apps];
  if(filter==='downloads'){
    sorted.sort((a,b)=>b.downloads-a.downloads);
    sorted = sorted.slice(0,20);
  } else if(filter==='myuploads'){
    sorted = sorted.filter(a=>a.uploader===currentUser);
    sorted.sort((a,b)=>b.timestamp-a.timestamp);
  } else sorted.sort((a,b)=>b.timestamp-a.timestamp);
  sorted.forEach(app=>createAppCard(app));
}

// Create app card
function createAppCard(app){
  const card = document.createElement('div');
  card.className='app-card';
  const showMenu = app.uploader===currentUser;
  const menuHtml = showMenu ? `<span class="menuDots" style="cursor:pointer;font-size:20px;">⋮</span>` : '';

  card.innerHTML=`
    <img src="${app.iconBase64}">
    <div class="info">
      <p><strong>${app.name}</strong></p>
      <p style="font-size:0.9em;color:#555;">Uploaded by: ${app.uploader}</p>
      <p>${app.desc}</p>
      <div class="size">${app.sizeMB} MB</div>
      <div class="downloads">Downloads: <span class="count">${app.downloads}</span></div>
      <div class="progress-container"><div class="progress-bar"></div></div>
      <button class="downloadBtn">Download</button>
    </div>
    ${menuHtml}
  `;
  appGallery.appendChild(card);

  const downloadBtn = card.querySelector('.downloadBtn');
  const progressBar = card.querySelector('.progress-bar');
  const countDisplay = card.querySelector('.count');

  downloadBtn.addEventListener('click', ()=>{
    const isUpdate = downloadBtn.textContent==='Update Now';
    downloadBtn.disabled=true;
    let downloaded=0;
    const totalMB=parseFloat(app.sizeMB);
    const interval=setInterval(()=>{
      downloaded+=0.1;
      if(downloaded>totalMB) downloaded=totalMB;
      const percent=(downloaded/totalMB)*100;
      progressBar.style.width=percent+'%';
      downloadBtn.textContent=`${downloaded.toFixed(1)}MB / ${totalMB}MB`;
      if(downloaded>=totalMB){
        clearInterval(interval);
        downloadBtn.textContent='Done';
        app.downloads++;
        countDisplay.textContent=app.downloads;
        database.ref('apps/' + app.id + '/downloads').set(app.downloads);
        lastUploadedAPK={name:app.name,url:app.apkBase64};
        showInstallModal();
        if(isUpdate) alert("APK update!");
      }
    },100);
  });

  if(showMenu){
    const menuBtn=card.querySelector('.menuDots');
    const dropdown=document.createElement('div');
    dropdown.className='menuDropdown';
    dropdown.innerHTML=`
      <button class="updateBtn">Update APK</button>
      <button class="deleteBtn">Delete</button>
    `;
    card.appendChild(dropdown);

    menuBtn.addEventListener('click', e=>{
      e.stopPropagation();
      document.querySelectorAll('.menuDropdown').forEach(d=>d.style.display='none');
      dropdown.style.display='flex';
    });
    document.addEventListener('click', ()=>dropdown.style.display='none');

    dropdown.querySelector('.updateBtn').addEventListener('click', ()=>{
      const f=document.createElement('input'); f.type='file'; f.accept='.apk';
      f.onchange=async e=>{
        const nf=e.target.files[0]; 
        if(nf){   
          const apkBase64 = await fileToBase64(nf);
          app.apkBase64 = apkBase64;
          app.name = nf.name;
          app.sizeMB = (nf.size/(1024*1024)).toFixed(2);
          database.ref('apps/' + app.id).update({apkBase64: app.apkBase64, name: app.name, sizeMB: app.sizeMB});
          downloadBtn.textContent = 'Update Now';
          alert(`APK updated! New size: ${app.sizeMB} MB`);
        }
      }; f.click(); dropdown.style.display='none';
    });

    dropdown.querySelector('.deleteBtn').addEventListener('click', ()=>{
      if(confirm('Delete this APK?')){
        database.ref('apps/' + app.id).remove();
      }
      dropdown.style.display='none';
    });
  }
}

// Install modal
const installModal = document.getElementById('installModal');
const installBtn = document.getElementById('installBtn');
const cancelBtn = document.getElementById('cancelBtn');

installBtn.addEventListener('click', ()=>{
  if(lastUploadedAPK && lastUploadedAPK.url){
    const a = document.createElement('a');
    a.href = lastUploadedAPK.url;
    a.download = lastUploadedAPK.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("APP SUCCESSFUL DOWNLOAD");
  }
  installModal.style.display='none';
});

cancelBtn.addEventListener('click', ()=>installModal.style.display='none');

function showInstallModal(){ installModal.style.display='flex'; }

// Search
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', ()=>{
  const query = searchInput.value.toLowerCase();
  const filtered = apps.filter(a => a.name.toLowerCase().includes(query));
  appGallery.innerHTML='';
  filtered.forEach(app => createAppCard(app));
});

// Initialize
checkLogin();