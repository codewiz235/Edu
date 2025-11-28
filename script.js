let applications = JSON.parse(localStorage.getItem('universityApps')) || [];
let editIndex = -1;

renderApplications();

// !!! IMPORTANT: Replace 'YOUR_IMGBB_API_KEY' with your actual key !!!
const IMGBB_API_KEY = '2b93ffefc6046d8d0c535726b8301224'; 

// Function to handle ImgBB Upload
async function uploadImageToImgBB(imageFile) {
// ... (uploadImageToImgBB function remains unchanged) ...
    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url;
        } else {
            console.error('ImgBB Upload Error:', data.error.message);
            alert(`Logo upload failed: ${data.error.message}`);
            return '';
        }
    } catch (error) {
        console.error('Network or ImgBB API Error:', error);
        alert('An error occurred during image upload. Check console for details.');
        return '';
    }
}

function renderApplications(filter = 'all') {
    const list = document.getElementById('applications-list');
    list.innerHTML = '';

    const filteredApps = filter === 'all' ? applications : applications.filter(a => a.status === filter);

    if (filteredApps.length === 0) {
        list.innerHTML = '<div id="empty-state">No applications yet.<br>Tap + to add one.</div>';
        return;
    }

    filteredApps.forEach((app, i) => {
        const originalIndex = applications.indexOf(app);
        const card = document.createElement('div');
        card.className = 'application-card';
        card.innerHTML = `
            <div class="card-header">
                <img src="${app.logo || 'https://img.icons8.com/color/100/university.png'}" class="uni-logo">
                <div class="uni-info">
                    <h3>${app.name}</h3>
                    <div class="degree">Degree: ${app.qualification}</div>
                    <span class="status ${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="icon-btn icon-portal" onclick="window.open('${app.portalUrl}', '_blank')" title="Go to Portal">
                    <img src="https://img.icons8.com/ios-glyphs/45/000000/external-link.png">
                </button>
                <button class="icon-btn icon-details" onclick="this.closest('.application-card').querySelector('.details-content').classList.toggle('open')" title="View Details">
                    <img src="https://img.icons8.com/ios-glyphs/45/000000/expand-arrow--v1.png">
                </button>
                <button class="icon-btn icon-edit" onclick="editApp(${originalIndex})" title="Edit">
                    <img src="https://img.icons8.com/ios-glyphs/40/000000/edit--v1.png">
                </button>
                <button class="icon-btn icon-delete" onclick="deleteApp(${originalIndex})" title="Delete">
                    <img src="https://img.icons8.com/ios-glyphs/45/000000/trash--v1.png">
                </button>
            </div>
            <div class="details-content">${(app.details || 'No details').replace(/\n/g, '<br>')}</div>
        `;
        list.appendChild(card);
    });
}

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderApplications(btn.dataset.status);
    };
});

// Add / Edit / Modal
document.getElementById('add-btn').onclick = () => {
    editIndex = -1;
    document.getElementById('modal-title').textContent = 'Add University';
    document.getElementById('uni-form').reset();
    
    // Reset logo fields
    document.getElementById('logo-upload').value = null; 
    document.getElementById('logo').value = ''; 
    document.getElementById('logo-status').textContent = 'Select University Logo (optional)';
    
    document.getElementById('modal').style.display = 'flex';
};

// Cancel Button Fix (uses .closest() to catch icon clicks)
document.getElementById('modal').onclick = (e) => {
    if (e.target === document.getElementById('modal') || e.target.closest('#cancel-btn')) {
        document.getElementById('modal').style.display = 'none';
    }
};

// Form Submission with ImgBB Upload
document.getElementById('uni-form').onsubmit = async (e) => {
    e.preventDefault();

    const logoFile = document.getElementById('logo-upload').files[0];
    let logoUrl = document.getElementById('logo').value; // Get URL from hidden field (either existing or empty)

    // 1. Handle new image upload
    if (logoFile) {
        const saveBtn = document.getElementById('save-btn');
        const logoStatus = document.getElementById('logo-status');
        
        logoStatus.textContent = 'Uploading... Please wait.'; // Show status
        saveBtn.disabled = true; // Prevent multiple clicks

        logoUrl = await uploadImageToImgBB(logoFile);

        saveBtn.disabled = false;

        if (!logoUrl) {
            // If upload failed, prevent saving and keep modal open
            logoStatus.textContent = 'Upload Failed. Try again.';
            return;
        }
        logoStatus.textContent = 'Upload Complete!';
    }
    
    // 2. Build the application object with the new/existing URL
    const app = {
        name: e.target.name.value,
        logo: logoUrl || '', // Use the uploaded URL or the hidden field value
        qualification: e.target.qualification.value,
        status: e.target.status.value,
        portalUrl: e.target.portalUrl.value,
        details: e.target.details.value
    };

    if (editIndex >= 0) applications[editIndex] = app;
    else applications.push(app);

    localStorage.setItem('universityApps', JSON.stringify(applications));
    document.getElementById('modal').style.display = 'none';
    renderApplications(document.querySelector('.filter-btn.active').dataset.status);

    // Reset logo status/fields after successful save
    document.getElementById('logo-upload').value = null; 
    document.getElementById('logo').value = ''; 
    document.getElementById('logo-status').textContent = 'Select University Logo (optional)';
};

window.editApp = (i) => {
    editIndex = i;
    const app = applications[i];
    document.getElementById('modal-title').textContent = 'Edit University';
    document.getElementById('name').value = app.name;
    document.getElementById('qualification').value = app.qualification;
    document.getElementById('status').value = app.status;
    document.getElementById('portalUrl').value = app.portalUrl;
    document.getElementById('details').value = app.details || '';
    
    // Handle logo fields for editing
    document.getElementById('logo-upload').value = null; // Clear file input
    document.getElementById('logo-status').textContent = 'Select New Logo (optional)';
    document.getElementById('logo').value = app.logo; // Put existing URL into hidden field
    
    document.getElementById('modal').style.display = 'flex';
};

window.deleteApp = (i) => {
    if (confirm('Delete this application?')) {
        applications.splice(i, 1);
        localStorage.setItem('universityApps', JSON.stringify(applications));
        renderApplications(document.querySelector('.filter-btn.active').dataset.status);
    }
};

