const DEFAULT_CONFIG = {
    enabled: true,
    mode: 'exclude',
    excludeList: [
        'mail.google.com',
        'docs.google.com',
        'sheets.google.com',
        'slides.google.com',
        'drive.google.com',
        'calendar.google.com',
        'keep.google.com',
        'meet.google.com',
        'youtube.com',
        'github.com',
        'stackoverflow.com',
        'linkedin.com',
        'whatsapp.com',
        'slack.com',
        'notion.so'
    ],
    includeList: [],
    rotationInterval: 0,
    presets: {},
    identities: [
        { title: 'Google', domain: 'google.com' },
        { title: 'google.com/search?q=weather+in+my+area', domain: 'google.com' },
        { title: '({randint(1,12)}) Instagram', domain: 'instagram.com' },
        { title: 'Home / X', domain: 'x.com' },
        { title: '({randint(1,5)}) Facebook', domain: 'facebook.com' },
        { title: 'Wikipedia', domain: 'wikipedia.org' },
        { title: 'The New York Times', domain: 'nytimes.com' },
        { title: 'Amazon', domain: 'amazon.com' },
        { title: 'Reddit - The heart of the internet', domain: 'reddit.com' },
        { title: 'Spotify', domain: 'spotify.com' },
        { title: 'GitHub', domain: 'github.com' }
    ],
    uniformMode: {
        enabled: false,
        title: 'HUSH',
        iconUrl: ''
    }
};

const masterSwitch = document.getElementById('master-switch');
const notIndicator = document.getElementById('not-indicator');

const modeOptions = document.querySelectorAll('.mode-option');
const excludeTextarea = document.getElementById('exclude-textarea');
const includeTextarea = document.getElementById('include-textarea');
const rotationSelect = document.getElementById('rotation-select');
const saveBtn = document.getElementById('save-btn');
const revertBtn = document.getElementById('revert-btn');
const statusMsg = document.getElementById('status-msg');

const dotHideAll = document.getElementById('dot-hide-all');
const dotExclude = document.getElementById('dot-exclude');
const dotInclude = document.getElementById('dot-include');
const listDotExclude = document.getElementById('list-dot-exclude');
const listDotInclude = document.getElementById('list-dot-include');

const presetSelect = document.getElementById('preset-select');
const savePresetBtn = document.getElementById('save-preset-btn');
const deletePresetBtn = document.getElementById('delete-preset-btn');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const identitiesList = document.getElementById('identities-list');
const newIdentityTitle = document.getElementById('new-identity-title');
const newIdentityDomain = document.getElementById('new-identity-domain');
const addIdentityBtn = document.getElementById('add-identity-btn');
const revertIdentitiesBtn = document.getElementById('revert-identities-btn');

const uniformToggle = document.getElementById('uniform-toggle');
const uniformSettings = document.getElementById('uniform-settings');
const uniformTitle = document.getElementById('uniform-title');
const uniformIcon = document.getElementById('uniform-icon');

const helpIcons = document.querySelectorAll('.help-icon');
const helpModal = document.getElementById('help-modal');
const helpText = document.getElementById('help-text');
const closeModal = document.querySelector('.close-modal');

let currentConfig = { ...DEFAULT_CONFIG };

chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
        currentConfig = { ...DEFAULT_CONFIG, ...result.config };
        if (!currentConfig.identities) currentConfig.identities = DEFAULT_CONFIG.identities;
        if (!currentConfig.uniformMode) currentConfig.uniformMode = DEFAULT_CONFIG.uniformMode;
        if (currentConfig.enabled === undefined) currentConfig.enabled = true;
    }
    updateUI();
    updatePresetsDropdown();
    renderIdentities();
});

function updateUI() {
    masterSwitch.checked = currentConfig.enabled;
    if (currentConfig.enabled) {
        notIndicator.classList.add('hidden');
    } else {
        notIndicator.classList.remove('hidden');
    }

    modeOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.value === currentConfig.mode) {
            opt.classList.add('active');
        }
    });

    excludeTextarea.value = currentConfig.excludeList.join('\n');
    includeTextarea.value = currentConfig.includeList.join('\n');

    rotationSelect.value = currentConfig.rotationInterval;

    updateDots();

    uniformToggle.checked = currentConfig.uniformMode.enabled;
    uniformTitle.value = currentConfig.uniformMode.title;
    uniformIcon.value = currentConfig.uniformMode.iconUrl;

    if (currentConfig.uniformMode.enabled) {
        uniformSettings.classList.remove('hidden');
    } else {
        uniformSettings.classList.add('hidden');
    }
}

function updateDots() {
    dotHideAll.className = 'status-dot';
    dotExclude.className = 'status-dot';
    dotInclude.className = 'status-dot';
    listDotExclude.className = 'status-dot small';
    listDotInclude.className = 'status-dot small';

    if (currentConfig.mode === 'hide_all') {
        dotHideAll.classList.add('active-green');
        listDotExclude.classList.add('active-red');
        listDotInclude.classList.add('active-red');
    } else if (currentConfig.mode === 'exclude') {
        dotExclude.classList.add('active-green');
        listDotExclude.classList.add('active-green');
        listDotInclude.classList.add('active-red');
    } else if (currentConfig.mode === 'include') {
        dotInclude.classList.add('active-green');
        listDotInclude.classList.add('active-green');
        listDotExclude.classList.add('active-red');
    }
}

function updatePresetsDropdown() {
    presetSelect.innerHTML = '<option value="default">Default</option>';
    Object.keys(currentConfig.presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        presetSelect.appendChild(option);
    });
}

function renderIdentities() {
    identitiesList.innerHTML = '';
    currentConfig.identities.forEach((id, index) => {
        const item = document.createElement('div');
        item.className = 'identity-item';

        const info = document.createElement('div');
        info.className = 'identity-info';

        const title = document.createElement('span');
        title.className = 'identity-title';
        title.textContent = id.title;

        const domain = document.createElement('span');
        domain.className = 'identity-domain';
        domain.textContent = id.domain;

        info.appendChild(title);
        info.appendChild(domain);

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-identity-btn';
        delBtn.textContent = 'X';
        delBtn.onclick = () => {
            currentConfig.identities.splice(index, 1);
            renderIdentities();
        };

        item.appendChild(info);
        item.appendChild(delBtn);
        identitiesList.appendChild(item);
    });
}

masterSwitch.addEventListener('change', () => {
    currentConfig.enabled = masterSwitch.checked;
    updateUI();
    chrome.storage.local.set({ config: currentConfig });
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

modeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        currentConfig.mode = opt.dataset.value;
        updateUI();
    });
});

saveBtn.addEventListener('click', () => {
    saveConfig('Settings Saved!');
});

revertBtn.addEventListener('click', () => {
    currentConfig.mode = DEFAULT_CONFIG.mode;
    currentConfig.excludeList = [...DEFAULT_CONFIG.excludeList];
    currentConfig.includeList = [...DEFAULT_CONFIG.includeList];
    currentConfig.rotationInterval = DEFAULT_CONFIG.rotationInterval;

    updateUI();
    showStatus('Reverted to Defaults');
});

function saveConfig(msg) {
    const exclude = excludeTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
    const include = includeTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
    const interval = parseInt(rotationSelect.value, 10);

    currentConfig.excludeList = exclude;
    currentConfig.includeList = include;
    currentConfig.rotationInterval = interval;

    currentConfig.uniformMode = {
        enabled: uniformToggle.checked,
        title: uniformTitle.value || 'HUSH',
        iconUrl: uniformIcon.value
    };

    currentConfig.enabled = masterSwitch.checked;

    chrome.storage.local.set({ config: currentConfig }, () => {
        if (msg) showStatus(msg);
    });
}

savePresetBtn.addEventListener('click', () => {
    const name = prompt('Enter a name for this preset:');
    if (name) {
        currentConfig.excludeList = excludeTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
        currentConfig.includeList = includeTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
        currentConfig.rotationInterval = parseInt(rotationSelect.value, 10);
        currentConfig.mode = document.querySelector('.mode-option.active').dataset.value;

        currentConfig.presets[name] = {
            mode: currentConfig.mode,
            excludeList: currentConfig.excludeList,
            includeList: currentConfig.includeList,
            rotationInterval: currentConfig.rotationInterval
        };

        saveConfig('Preset Saved!');
        updatePresetsDropdown();
        presetSelect.value = name;
    }
});

deletePresetBtn.addEventListener('click', () => {
    const name = presetSelect.value;
    if (name !== 'default' && currentConfig.presets[name]) {
        if (confirm(`Delete preset "${name}"?`)) {
            delete currentConfig.presets[name];
            saveConfig('Preset Deleted');
            updatePresetsDropdown();
            presetSelect.value = 'default';
        }
    }
});

presetSelect.addEventListener('change', () => {
    const name = presetSelect.value;
    if (name === 'default') {
        const presets = currentConfig.presets;
        const identities = currentConfig.identities;
        const uniform = currentConfig.uniformMode;
        const enabled = currentConfig.enabled;

        currentConfig = { ...DEFAULT_CONFIG };
        currentConfig.presets = presets;
        currentConfig.identities = identities;
        currentConfig.uniformMode = uniform;
        currentConfig.enabled = enabled;

        updateUI();
    } else if (currentConfig.presets[name]) {
        const p = currentConfig.presets[name];
        currentConfig.mode = p.mode;
        currentConfig.excludeList = [...p.excludeList];
        currentConfig.includeList = [...p.includeList];
        currentConfig.rotationInterval = p.rotationInterval;
        updateUI();
    }
});

addIdentityBtn.addEventListener('click', () => {
    const title = newIdentityTitle.value.trim();
    const domain = newIdentityDomain.value.trim();

    if (title && domain) {
        currentConfig.identities.push({ title, domain });
        newIdentityTitle.value = '';
        newIdentityDomain.value = '';
        renderIdentities();
    }
});

revertIdentitiesBtn.addEventListener('click', () => {
    if (confirm('Revert all identities to default?')) {
        currentConfig.identities = [...DEFAULT_CONFIG.identities];
        renderIdentities();
        showStatus('Identities Reverted');
    }
});

uniformToggle.addEventListener('change', () => {
    if (uniformToggle.checked) {
        uniformSettings.classList.remove('hidden');
    } else {
        uniformSettings.classList.add('hidden');
    }
});

helpIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = icon.dataset.help;
        helpText.textContent = text;
        helpModal.classList.remove('hidden');
    });
});

closeModal.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

function showStatus(msg) {
    statusMsg.textContent = msg;
    setTimeout(() => {
        statusMsg.textContent = '';
    }, 2000);
}
