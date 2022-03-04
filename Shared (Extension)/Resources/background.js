console.log("Loaded background.js");

const providerURL = "https://trot.to/";
const pattern = /https*:\/\/go\/(.*)/;
const mobileErrorPage = "data:text/html,";
const isMobile = navigator.standalone === false;

let path = "";
let tabId = 0;

function logState(phase) {
    console.log(`${phase}, ${tabId}, ${path}`);
}

function openOnTab() {
    logState("open");
    browser.tabs.update(tabId, {url: providerURL + path});
}

function detectFromBeforeNavigate(event) {
    if (event.frameId != 0 || event.parentFrameId != -1) return;

    // For iOS: open after the error page to avoid being ignored
    if (isMobile && event.url == mobileErrorPage && path) {
        logState("mobile error");
        openOnTab();
        path = "";
    }

    let result = pattern.exec(event.url);
    if (result) {
        path = result[1];
        tabId = event.tabId;

        logState("detect");

        // For macOS
        if (!isMobile) {
            // event.tabId can be 0 during load
            if (!tabId) {
                browser.tabs.getCurrent().then(function (tab) {
                    tabId = tab.id;
                    openOnTab();
                });
            } else {
                openOnTab();
            }
        }

    // For iOS: rewrite Google searches
    } else if (isMobile) {
        const url = new URL(event.url);
        if (url.hostname == "www.google.co.kr" || url.hostname == "www.google.com") {
            const query = url.searchParams.get("q");
            if (query && query.substring(0, 3) == "go/") {
                path = query.substring(3);
                tabId = event.tabId;
                openOnTab();
            }
        }
    }
}
browser.webNavigation.onBeforeNavigate.addListener(detectFromBeforeNavigate);
