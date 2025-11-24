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

let tabStates = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['config'], (result) => {
    if (!result.config) {
      chrome.storage.local.set({ config: DEFAULT_CONFIG });
    } else {
      const newConfig = { ...DEFAULT_CONFIG, ...result.config };
      if (newConfig.enabled === undefined) newConfig.enabled = true;

      if (newConfig.identities) {
        newConfig.identities = newConfig.identities.filter(id => id.title !== 'Gmail');
      }
      chrome.storage.local.set({ config: newConfig });
    }
  });
});

function parseTitle(title) {
  return title.replace(/\{randint\((\d+),(\d+)\)\}/g, (match, min, max) => {
    const minInt = parseInt(min, 10);
    const maxInt = parseInt(max, 10);
    const rand = Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    return rand.toString();
  });
}

function matchesList(url, list) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    return list.some(item => hostname.includes(item));
  } catch (e) {
    return false;
  }
}

function shouldObfuscate(url, config) {
  if (!config.enabled) return false;

  if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    if (
      (hostname.includes('google.') && (pathname.startsWith('/search') || pathname.startsWith('/webhp'))) ||
      (hostname.includes('bing.com') && pathname.startsWith('/search')) ||
      (hostname.includes('duckduckgo.com')) ||
      (hostname.includes('yahoo.com') && pathname.startsWith('/search'))
    ) {
      return true;
    }
  } catch (e) { }

  if (config.mode === 'hide_all') return true;

  if (config.mode === 'exclude') {
    return !matchesList(url, config.excludeList);
  }

  if (config.mode === 'include') {
    return matchesList(url, config.includeList);
  }

  return false;
}

function getFakeIdentity(tabId, config) {
  if (config.uniformMode && config.uniformMode.enabled) {
    return {
      title: config.uniformMode.title,
      domain: null,
      customIconUrl: config.uniformMode.iconUrl
    };
  }

  if (!tabStates[tabId]) {
    tabStates[tabId] = {};
  }

  if (!tabStates[tabId].fakeIdentity) {
    const usedTitles = new Set();
    Object.values(tabStates).forEach(state => {
      if (state.fakeIdentity) usedTitles.add(state.fakeIdentity.title);
    });

    const available = config.identities.filter(id => !usedTitles.has(id.title));
    const pool = available.length > 0 ? available : config.identities;

    const index = Math.floor(Math.random() * pool.length);
    const selected = pool[index];

    tabStates[tabId].fakeIdentity = selected;
    tabStates[tabId].displayTitle = parseTitle(selected.title);
  }

  return {
    ...tabStates[tabId].fakeIdentity,
    title: tabStates[tabId].displayTitle || parseTitle(tabStates[tabId].fakeIdentity.title)
  };
}

async function getFaviconDataUri(identity) {
  if (identity.customIconUrl) {
    if (identity.customIconUrl.startsWith('data:')) return identity.customIconUrl;
    try {
      const response = await fetch(identity.customIconUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return '';
    }
  }

  const domain = identity.domain;
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return '';
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    updateTab(tab);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateTab(tab);
  });

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(t => {
      if (t.id !== activeInfo.tabId) {
        updateTab(t);
      }
    });
  });
});

async function updateTab(tab) {
  if (!tab || !tab.url) return;

  const { config } = await chrome.storage.local.get(['config']);
  if (!config) return;

  const isActive = tab.active;
  const shouldHide = shouldObfuscate(tab.url, config);

  let fakeIdentity = null;
  let faviconDataUri = null;

  if (shouldHide) {
    fakeIdentity = getFakeIdentity(tab.id, config);

    if (!tabStates[tab.id].faviconDataUri ||
      tabStates[tab.id].lastDomain !== fakeIdentity.domain) {

      tabStates[tab.id].lastDomain = fakeIdentity.domain;
      tabStates[tab.id].faviconDataUri = await getFaviconDataUri(fakeIdentity);
    }
    faviconDataUri = tabStates[tab.id].faviconDataUri;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_STATE',
      isActive: isActive,
      shouldObfuscate: shouldHide,
      fakeIdentity: fakeIdentity,
      faviconDataUri: faviconDataUri,
      config: config
    });
  } catch (e) {
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rotate') {
    rotateTabs();
  }
});

function rotateTabs() {
  chrome.storage.local.get(['config'], (result) => {
    const config = result.config;
    if (!config || config.rotationInterval === 0 || !config.enabled) return;

    if (config.uniformMode && config.uniformMode.enabled) return;

    chrome.tabs.query({ active: false }, async (tabs) => {
      const usedTitles = new Set();

      for (const tab of tabs) {
        if (shouldObfuscate(tab.url, config)) {
          const available = config.identities.filter(id => !usedTitles.has(id.title));
          const pool = available.length > 0 ? available : config.identities;
          const index = Math.floor(Math.random() * pool.length);
          const selected = pool[index];

          usedTitles.add(selected.title);

          if (!tabStates[tab.id]) tabStates[tab.id] = {};
          tabStates[tab.id].fakeIdentity = selected;
          tabStates[tab.id].displayTitle = parseTitle(selected.title);
          tabStates[tab.id].lastDomain = selected.domain;
          tabStates[tab.id].faviconDataUri = await getFaviconDataUri(selected);

          const identityToSend = {
            ...selected,
            title: tabStates[tab.id].displayTitle
          };

          chrome.tabs.sendMessage(tab.id, {
            type: 'ROTATE',
            fakeIdentity: identityToSend,
            faviconDataUri: tabStates[tab.id].faviconDataUri
          }).catch(() => { });
        }
      }
    });
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.config) {
    const newConfig = changes.config.newValue;
    if (newConfig.rotationInterval > 0) {
      chrome.alarms.create('rotate', { periodInMinutes: newConfig.rotationInterval / 60000 });
    } else {
      chrome.alarms.clear('rotate');
    }

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => updateTab(t));
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});
