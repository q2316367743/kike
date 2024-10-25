function initializeTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // 浏览器处于暗黑模式
        document.body.classList.add('dark');
    } else {
        // 浏览器处于普通模式
        document.body.classList.remove('dark');
    }
}

const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', initializeTheme);

initializeTheme();

function initializeDetach() {
    if (utools.getWindowType() === 'main') {
        document.body.classList.remove('detach');
    } else {
        document.body.classList.add('detach');
    }
}

utools.onPluginDetach(initializeDetach);

initializeDetach()
