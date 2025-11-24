let state = {
    isActive: true,
    shouldObfuscate: false,
    fakeIdentity: null,
    faviconDataUri: null,
    config: null
};

const originalState = {
    title: document.title,
    favicon: getFaviconHref()
};

function getFaviconHref() {
    const link = document.querySelector("link[rel*='icon']");
    return link ? link.href : '';
}

function setFavicon(url) {
    if (!url) return;

    const current = getFaviconHref();
    if (current === url) return;

    const links = document.querySelectorAll("link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    links.forEach(l => l.remove());

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = url;
    document.head.appendChild(link);
}

function getSanitizedTitle(title) {
    if (!state.config || !state.config.privacy || !state.config.privacy.sanitizeEmails) {
        return title;
    }

    if (location.hostname.includes('mail.google.com')) {
        const match = title.match(/^(.*?\))/);
        if (match) return match[1];
    }

    if (location.hostname.includes('proton.me') || location.hostname.includes('protonmail.com')) {
        const match = title.match(/^(.*?) \|/);
        if (match) return match[1];
    }

    return title;
}

function applyState() {
    if (!state.isActive && state.shouldObfuscate && state.fakeIdentity) {
        if (document.title !== state.fakeIdentity.title) {
            document.title = state.fakeIdentity.title;
        }
        if (state.faviconDataUri) {
            setFavicon(state.faviconDataUri);
        }
    } else {
        const targetTitle = getSanitizedTitle(originalState.title);
        if (document.title !== targetTitle) {
            document.title = targetTitle;
        }

        if (originalState.favicon) {
            setFavicon(originalState.favicon);
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_STATE') {
        state.isActive = message.isActive;
        state.shouldObfuscate = message.shouldObfuscate;
        state.fakeIdentity = message.fakeIdentity;
        state.faviconDataUri = message.faviconDataUri;
        state.config = message.config;
        applyState();
    } else if (message.type === 'ROTATE') {
        if (!state.isActive && state.shouldObfuscate) {
            state.fakeIdentity = message.fakeIdentity;
            state.faviconDataUri = message.faviconDataUri;
            applyState();
        }
    }
});

function setupObservers() {
    const target = document.querySelector('title');
    if (target) {
        new MutationObserver(() => {
            handleTitleChange(document.title);
        }).observe(target, { childList: true, characterData: true, subtree: true });
    }

    if (document.head) {
        new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.addedNodes) {
                    m.addedNodes.forEach(n => {
                        if (n.nodeName === 'TITLE') {
                            new MutationObserver(() => handleTitleChange(document.title)).observe(n, { childList: true, characterData: true, subtree: true });
                        }
                    });
                }

                let iconAdded = false;
                if (m.addedNodes) {
                    m.addedNodes.forEach(n => {
                        if (n.nodeName === 'LINK' && (n.rel.includes('icon') || n.rel === 'shortcut icon' || n.rel === 'apple-touch-icon')) {
                            iconAdded = true;
                        }
                    });
                }

                if (iconAdded) {
                    if (state.shouldObfuscate && state.faviconDataUri) {
                        const current = getFaviconHref();
                        if (current !== state.faviconDataUri) {
                            setFavicon(state.faviconDataUri);
                        }
                    } else {
                        const current = getFaviconHref();
                        if (current !== originalState.favicon) {
                            originalState.favicon = current;
                        }
                    }
                }
            });
        }).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel'] });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObservers);
} else {
    setupObservers();
}

function handleTitleChange(newTitle) {
    if (state.shouldObfuscate && state.fakeIdentity && newTitle === state.fakeIdentity.title) {
        return;
    }

    if (state.isActive && newTitle === getSanitizedTitle(originalState.title)) {
        return;
    }

    originalState.title = newTitle;
    applyState();
}

originalState.title = document.title;
originalState.favicon = getFaviconHref();
