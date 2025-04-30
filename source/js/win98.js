// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
    const windowContainer = document.getElementById('window-container');
    if (!windowContainer) {
        console.error("关键错误：未在页面中找到 #window-container 元素！");
        return;
    }
    let highestZIndex = 10;
    let isInitialLoad = true; // Flag for initial auto-open URL handling
    const baseTitle = document.body.dataset.baseTitle || 'Desktop'; // Get base title once
    const pathMap = { "/about/": "关于我", "/links/": "友情链接", "/archives/": "存档", "/guestbook/": "留言板" }; // Add trailing slash for consistency

    // ===============================================
    //  1. 函数定义部分
    // ===============================================

    /**
     * Creates a new window.
     * @param {string} title - The initial title for the window and browser.
     * @param {string} contentIdentifier - URL to fetch or identifier (like image src).
     * @param {object} [options={}] - Options for creation.
     * @param {number} [options.sourceX] - X coordinate of the click source.
     * @param {number} [options.sourceY] - Y coordinate of the click source.
     * @param {boolean} [options.animateFromSource=false] - Animate from source coordinates?
     * @param {boolean} [options.isAutoOpen=false] - Is this window being opened automatically on page load?
     * @param {boolean} [options.isImagePopup=false] - Is this a dedicated image viewer window?
     * @param {string} [options.windowIdToUse] - Optional specific ID to use for the window (used by popstate recreate).
     */
    function createWindow(title, contentIdentifier, options = {}) {
        const {
            sourceX,
            sourceY,
            animateFromSource = false,
            isAutoOpen = false,
            isImagePopup = false,
            windowIdToUse // <-- New option for popstate
        } = options;

        highestZIndex++;
        const windowId = windowIdToUse || `window-${Date.now()}`; // Use provided ID or generate new
        const contentUrl = !isImagePopup ? contentIdentifier : null; // Store actual URL only if not image popup
        const imageSrc = isImagePopup ? contentIdentifier : null; // Store image source if it is an image popup

        // --- Check if window with this ID already exists (robustness for popstate) ---
        if (document.getElementById(windowId)) {
            console.warn(`[Win98 Create] Window with ID ${windowId} already exists. Focusing instead.`);
            const existingWindow = document.getElementById(windowId);
            existingWindow.dispatchEvent(new Event('pointerdown', { bubbles: true })); // Trigger bringToFront
            return existingWindow; // Return existing window
        }

        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute';
        windowDiv.style.zIndex = highestZIndex;
        if (contentUrl) {
            windowDiv.dataset.contentUrl = contentUrl; // Store URL for focusing and history
        }
        if (imageSrc) {
             windowDiv.dataset.imageSrc = imageSrc; // Store image src for identification if needed
        }


        // --- Calculate final position and size ---
        const screenWidth = window.innerWidth;
        const mobileBreakpoint = 768;
        const defaultWidth = screenWidth < mobileBreakpoint ? Math.min(screenWidth - 20, 300) : 530;
        const defaultHeight = screenWidth < mobileBreakpoint ? Math.min(window.innerHeight - 50, 400) : 640;
        const targetWidth = defaultWidth;
        const targetHeight = defaultHeight;
        const margin = 10;
        const clampedWidth = Math.min(targetWidth, screenWidth - 2 * margin);
        const clampedHeight = Math.min(targetHeight, window.innerHeight - 2 * margin - 30);
        const maxLeft = screenWidth - clampedWidth - margin;
        const maxTop = window.innerHeight - clampedHeight - margin - 30;
        // Make initial placement slightly less random if not animating
        const placementOffset = (windowContainer.childElementCount % 5) * 20; // Cascade slightly
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft - 100)) + placementOffset); // Avoid far right initially
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop - 100)) + placementOffset); // Avoid bottom initially
        const finalLeft = randomLeft;
        const finalTop = randomTop;
        const finalWidth = clampedWidth;
        const finalHeight = clampedHeight;


        // --- Set Initial State (for animation) ---
         if (animateFromSource && sourceX !== undefined && sourceY !== undefined) {
            windowDiv.style.left = `${sourceX}px`;
            windowDiv.style.top = `${sourceY}px`;
            windowDiv.style.width = '32px';
            windowDiv.style.height = '32px';
            windowDiv.style.opacity = '0';
            windowDiv.style.transform = 'scale(0.1)';
            windowDiv.style.transformOrigin = 'center center';
        } else {
            windowDiv.style.left = `${finalLeft}px`;
            windowDiv.style.top = `${finalTop}px`;
            windowDiv.style.width = `${finalWidth}px`;
            windowDiv.style.height = `${finalHeight}px`;
            windowDiv.style.opacity = '1';
            windowDiv.style.transform = 'scale(1)';
        }

        // --- 标题栏 ---
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        const titleText = document.createElement('div');
        titleText.className = 'title-bar-text';
        titleText.textContent = title; // Use the passed title
        titleBar.appendChild(titleText);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'title-bar-controls';
        const closeButton = document.createElement('button');
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.onclick = (e) => {
            e.stopPropagation();
            const windowIdToRemove = windowDiv.id;
            const closedWindowUrlPath = windowDiv.dataset.contentUrl; // Path part
            windowDiv.remove();
            const remainingWindows = windowContainer.querySelectorAll('.window');
            const currentPath = location.pathname;
            const currentSearch = location.search;

            if (remainingWindows.length === 0) {
                const baseUrl = '/';
                if (currentPath !== baseUrl || currentSearch !== '') {
                    console.log('[Window Close] Last window closed. Reverting URL and Title to base.');
                    try {
                        // Don't clear Gitalk params if they exist on the base URL when last window closes
                        const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                        history.replaceState({ windowUrl: targetUrl }, baseTitle, targetUrl);
                        document.title = baseTitle;
                    } catch (error) {
                        console.error("[History API] Error reverting to base URL on close:", error);
                    }
                }
            } else {
                // Check if the closed window's path matches the current path
                if (closedWindowUrlPath && closedWindowUrlPath === currentPath) {
                     let newTopWindow = null;
                     let maxZ = 0;
                     remainingWindows.forEach(win => {
                         const z = parseInt(win.style.zIndex || '0');
                         if (z > maxZ) {
                             maxZ = z;
                             newTopWindow = win;
                         }
                     });

                     if (newTopWindow) {
                         const newTopUrlPath = newTopWindow.dataset.contentUrl;
                         const newTopTitle = newTopWindow.querySelector('.title-bar-text').textContent || baseTitle;
                         const newTopWindowId = newTopWindow.id;

                         if (newTopUrlPath) { // If the new top window is a content window
                            // If the new top window's path is different OR current URL has no Gitalk params, update history
                            const hasGitalkParams = currentSearch.includes('code=') || currentSearch.includes('state=');
                            let targetUrl = newTopUrlPath;
                            // Preserve params only if new top path matches current path AND params exist
                            if (newTopUrlPath === currentPath && hasGitalkParams) {
                                targetUrl += currentSearch;
                            }

                            if (location.pathname !== targetUrl.split('?')[0] || location.search !== (targetUrl.includes('?') ? targetUrl.substring(targetUrl.indexOf('?')) : '')) {
                                console.log('[Window Close] Active URL window closed. Updating URL/Title to new top window:', targetUrl);
                                try {
                                    history.replaceState({ windowUrl: targetUrl, windowId: newTopWindowId }, newTopTitle, targetUrl);
                                    document.title = newTopTitle;
                                } catch (error) {
                                    console.error("[History API] Error updating URL/Title to new top window on close:", error);
                                }
                            } else if (document.title !== newTopTitle) {
                                 document.title = newTopTitle; // Just update title if URL matches
                            }
                         } else { // If new top window is an image popup or similar (no contentUrl)
                            const baseUrl = '/';
                            const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                            if (location.pathname !== targetUrl.split('?')[0] || location.search !== (targetUrl.includes('?') ? targetUrl.substring(targetUrl.indexOf('?')) : '')) {
                                try {
                                    history.replaceState({ windowUrl: targetUrl }, baseTitle, targetUrl);
                                    document.title = baseTitle;
                                } catch (error) {
                                     console.error("[History API] Error reverting to base URL (new top has no URL):", error);
                                }
                            } else if (document.title !== baseTitle) {
                                document.title = baseTitle;
                            }
                         }
                     } else { // Fallback if no top window found (should not happen if remainingWindows > 0)
                         const baseUrl = '/';
                         const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                         if (location.pathname !== targetUrl.split('?')[0] || location.search !== (targetUrl.includes('?') ? targetUrl.substring(targetUrl.indexOf('?')) : '')) {
                             try {
                                history.replaceState({ windowUrl: targetUrl }, baseTitle, targetUrl);
                                document.title = baseTitle;
                             } catch (error) {
                                 console.error("[History API] Error reverting to base URL (fallback on close):", error);
                             }
                         } else if (document.title !== baseTitle) {
                             document.title = baseTitle;
                         }
                     }
                }
                // If closed window's path didn't match current path, URL/Title remain unchanged
            }
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        // --- 窗口内容区域 ---
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        if (isImagePopup) {
            contentDiv.classList.add('image-popup-body');
        }

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (更新以处理 Gitalk 参数) ---
        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;

                const windowUrlPath = windowDiv.dataset.contentUrl; // Path part
                const currentTitle = titleText.textContent;

                // Update Browser URL/Title only for content windows
                if (windowUrlPath && !isImagePopup) {
                    const currentPath = location.pathname;
                    const currentSearch = location.search;
                    const hasGitalkParams = currentSearch.includes('code=') || currentSearch.includes('state=');
                    let targetUrlForHistory = windowUrlPath; // Start with the window's path

                    // Preserve search params IF the window's path matches the current path AND Gitalk params exist
                    if (windowUrlPath === currentPath && hasGitalkParams) {
                        targetUrlForHistory += currentSearch;
                        console.log("[History API & Title] Preserving Gitalk query parameters on focus:", currentSearch);
                    }

                    const stateUrl = targetUrlForHistory;
                    const stateTitle = currentTitle;

                    // Check if URL or Title needs update
                    const needsUpdate = (location.pathname !== stateUrl.split('?')[0] || location.search !== (stateUrl.includes('?') ? stateUrl.substring(stateUrl.indexOf('?')) : '')) || document.title !== stateTitle;

                    if (needsUpdate) {
                         try {
                            // Use replaceState on focus, don't push new history entries just for focusing
                            history.replaceState({ windowUrl: stateUrl, windowId: windowId }, stateTitle, stateUrl);
                            document.title = stateTitle;
                            console.log(`[History API & Title] Replaced state/title for focus: ${stateUrl}, Title: ${stateTitle}`);
                         } catch (error) {
                            console.error("[History API & Title] Error calling replaceState/setting title on focus:", error);
                         }
                    }
                } else if (!isImagePopup && document.title !== currentTitle) {
                    // If it's not a content window (e.g., image popup was focused), but title is wrong, fix title.
                    // Or if it is a content window but only title was wrong.
                    document.title = currentTitle;
                }
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true); // Capture phase

        // --- 使窗口可拖动 ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 ---
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer';
        resizer.style.cssText = `position: absolute; right: 0; bottom: 0; cursor: nwse-resize; z-index: 1; touch-action: none;`;
        windowDiv.appendChild(resizer);
        makeResizable(windowDiv, resizer);

        // --- 将窗口添加到容器 ---
        windowContainer.appendChild(windowDiv);

        // --- Apply Animation ---
         if (animateFromSource) {
            windowDiv.classList.add('window-opening');
            requestAnimationFrame(() => {
                windowDiv.style.left = `${finalLeft}px`;
                windowDiv.style.top = `${finalTop}px`;
                windowDiv.style.width = `${finalWidth}px`;
                windowDiv.style.height = `${finalHeight}px`;
                windowDiv.style.opacity = '1';
                windowDiv.style.transform = 'scale(1)';
            });
            windowDiv.addEventListener('transitionend', () => {
                windowDiv.classList.remove('window-opening');
            }, { once: true });
        }

        // --- Update Browser URL and Title on Create (Handle Gitalk Params) ---
        if (contentUrl && !isImagePopup) {
           const historyMethod = (isInitialLoad && isAutoOpen) ? 'replaceState' : 'pushState';
           const currentPath = location.pathname;
           const currentSearch = location.search;
           const hasGitalkParams = currentSearch.includes('code=') || currentSearch.includes('state=');
           let targetUrlForHistory = contentUrl; // Target is the window's content path

           // **Crucial Part for Gitalk**: If this is the initial auto-open AND
           // the target path matches the current path AND the current URL has Gitalk params,
           // then the URL we put into history should INCLUDE those params.
           if (isInitialLoad && isAutoOpen && contentUrl === currentPath && hasGitalkParams) {
               targetUrlForHistory += currentSearch;
               console.log("[History API & Title] Preserving Gitalk query parameters for initial auto-open:", currentSearch);
           }

           // Check if history needs updating (URL path/search or title mismatch)
           const needsPush = historyMethod === 'pushState' && (currentPath !== targetUrlForHistory.split('?')[0] || currentSearch !== (targetUrlForHistory.includes('?') ? targetUrlForHistory.substring(targetUrlForHistory.indexOf('?')) : ''));
           const needsReplace = historyMethod === 'replaceState' && (currentPath !== targetUrlForHistory.split('?')[0] || currentSearch !== (targetUrlForHistory.includes('?') ? targetUrlForHistory.substring(targetUrlForHistory.indexOf('?')) : ''));
           const titleNeedsUpdate = document.title !== title;

            // Only call history method if needed
           if (needsPush || needsReplace || titleNeedsUpdate) {
                try {
                   history[historyMethod]({ windowUrl: targetUrlForHistory, windowId: windowId }, title, targetUrlForHistory);
                   document.title = title;
                   console.log(`[History API & Title] Called ${historyMethod}/set title on create: ${targetUrlForHistory}, Title: ${title}`);
                } catch (error) {
                   console.error(`[History API & Title] Error calling ${historyMethod}/setting title on create:`, error);
                }
           }
            // Reset initial load flag *after* potential history update for the auto-opened window
            if (isInitialLoad && isAutoOpen) {
               isInitialLoad = false;
            }
        } else if (isInitialLoad && isAutoOpen) {
             // If auto-open wasn't a content window (e.g., image), still reset flag.
             isInitialLoad = false;
        }

        // --- 处理内容：加载或直接设置 ---
        if (isImagePopup && imageSrc) {
            contentDiv.innerHTML = `<img src="${imageSrc}" alt="${title}">`;
            console.log(`[Win98 Image Popup] Created window for image: ${imageSrc}`);
        } else if (contentUrl) {
            contentDiv.innerHTML = '<p>加载中...</p>';
            fetch(contentUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP 错误！状态: ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const mainContent = doc.querySelector('#content-main');

                    if (mainContent) {
                        const h1Element = mainContent.querySelector('h1');
                        let fetchedTitle = title; // Use initial title as fallback
                        if (h1Element && h1Element.textContent.trim()) {
                            fetchedTitle = h1Element.textContent.trim();
                            titleText.textContent = fetchedTitle;
                        }

                        // Update history state title and browser title ONLY if this window is currently active
                        // AND the title actually changed from the initial one.
                        if (parseInt(windowDiv.style.zIndex) === highestZIndex && document.title !== fetchedTitle) {
                             // Use the URL currently in the address bar for replaceState
                             const currentUrlInBar = location.pathname + location.search;
                             try {
                                 // Update the state object with the new title, keep URL and windowId
                                history.replaceState({ windowUrl: currentUrlInBar, windowId: windowId }, fetchedTitle, currentUrlInBar);
                                document.title = fetchedTitle;
                                console.log(`[Win98 & Title] Content loaded, active window title updated to: ${fetchedTitle}`);
                             } catch (error) {
                                 console.error("[History API & Title] Error updating title in replaceState/document after fetch:", error);
                             }
                        } else if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                            // If window is active but title didn't change, still log for clarity
                             console.log(`[Win98] Content loaded for active window, title remains: ${fetchedTitle}`);
                        } else {
                            // If window is not active, just update its title bar, don't touch history/document title
                            console.log(`[Win98] Content loaded for inactive window, title bar updated to: ${fetchedTitle}`);
                        }

                        contentDiv.innerHTML = '';
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild);
                        }
                        console.log("[Win98] Appended fetched content to window body.");

                        const gitalkPlaceholder = contentDiv.querySelector('#gitalk-container-placeholder');
                        if (gitalkPlaceholder && typeof initializeGitalkForWindow === 'function') {
                            console.log("[Win98] Found Gitalk placeholder.");
                            const uniqueGitalkId = `gitalk-container-${windowId}`;
                            gitalkPlaceholder.id = uniqueGitalkId;
                            // Use the canonical contentUrl (path) for Gitalk ID, not the full URL with params
                            initializeGitalkForWindow(uniqueGitalkId, contentUrl);
                        } else if (gitalkPlaceholder) {
                            console.error("[Win98] Error: Global function 'initializeGitalkForWindow' not found!");
                            gitalkPlaceholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
                        }

                        setupWindowInteractions(contentDiv);

                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        const errorTitle = title + " (内容加载失败)";
                        titleText.textContent = errorTitle;
                        if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                            document.title = errorTitle; // Update browser title if active
                        }
                        console.warn("[Win98] Cannot find selector '#content-main' in fetched HTML:", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('[Win98] Error fetching content:', contentUrl, error);
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    const errorTitle = title + " (加载错误)";
                    titleText.textContent = errorTitle;
                     if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                        document.title = errorTitle; // Update browser title if active
                    }
                });
        } else if (!isImagePopup) {
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            const noContentTitle = title + " (无内容)";
            titleText.textContent = noContentTitle;
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                 document.title = noContentTitle; // Update browser title if active
            }
        }

        return windowDiv;
    }

    // --- makeDraggable function (unchanged) ---
    function makeDraggable(element, handle) {
         let isDragging = false, pointerId = null, startX, startY, initialLeft, initialTop;
        const onPointerMove = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
            let newLeft = initialLeft + deltaX, newTop = initialTop + deltaY;
            const VpWidth = window.innerWidth, VpHeight = window.innerHeight;
            const elWidth = element.offsetWidth, elHeight = element.offsetHeight;
            const handleHeight = handle.offsetHeight;
            const minTop = -handleHeight + 10;
            const maxTopAllowed = VpHeight - handleHeight - 5;
            newLeft = Math.max(0 - elWidth + 50, Math.min(newLeft, VpWidth - 50));
            newTop = Math.max(minTop, Math.min(newTop, maxTopAllowed));
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        };
        const onPointerUp = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            isDragging = false;
            handle.style.cursor = 'grab';
            element.style.removeProperty('user-select');
            document.body.style.removeProperty('user-select');
            document.body.classList.remove('is-dragging-window');
            if (handle.hasPointerCapture(pointerId)) {
                try { handle.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
            }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: false });
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
        const onPointerDown = (e) => {
            if (e.target.closest('.title-bar-controls') || (e.pointerType === 'mouse' && e.button !== 0) || e.target.classList.contains('window-resizer')) return;
            isDragging = true;
            pointerId = e.pointerId;
            startX = e.clientX; startY = e.clientY;
            initialLeft = element.offsetLeft; initialTop = element.offsetTop;
            handle.style.cursor = 'grabbing';
            element.style.userSelect = 'none';
            document.body.style.userSelect = 'none';
            document.body.classList.add('is-dragging-window');
            // bringToFront is handled by capture listener on windowDiv
            e.preventDefault();
            e.stopPropagation();
            handle.style.touchAction = 'none'; // Prevent scroll on touch drag
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (drag):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        handle.style.cursor = 'grab';
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent native drag
    }


    // --- makeResizable function (unchanged) ---
    function makeResizable(element, handle) {
         let isResizing = false, pointerId = null, startX, startY, initialWidth, initialHeight, initialLeft, initialTop;
        const onPointerMove = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let newWidth = initialWidth + deltaX;
            let newHeight = initialHeight + deltaY;
            const computedStyle = window.getComputedStyle(element);
            const minWidth = parseInt(computedStyle.minWidth || '150', 10);
            const minHeight = parseInt(computedStyle.minHeight || '100', 10);
            newWidth = Math.max(minWidth, newWidth);
            newHeight = Math.max(minHeight, newHeight);
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
        };
        const onPointerUp = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            isResizing = false;
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('cursor'); // Remove resize cursor
            if (handle.hasPointerCapture(pointerId)) {
                try { handle.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
            }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: false });
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return; // Only left mouse button
            isResizing = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize'; // Apply resize cursor immediately
            // bringToFront is handled by capture listener on windowDiv
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to prevent drag start
            handle.style.touchAction = 'none'; // Prevent scroll on touch resize
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (resize):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent native drag
    }


    // --- setupWindowInteractions (Handles Links and Image Popups) ---
    function setupWindowInteractions(parentElement) {
        if (!parentElement || (parentElement.dataset && parentElement.dataset.interactionListenerAttached === 'true')) {
             // console.log(`[Win98 Interactions] Listener already attached or parent invalid for ${parentElement?.nodeName || 'UnknownElement'}. Skipping.`);
             return;
        }
        const elementName = parentElement.nodeName || parentElement.tagName || 'UnknownElement';
        console.log(`[Win98 Interactions] Attaching listener to ${elementName}`);

        parentElement.addEventListener('click', (event) => {
            const target = event.target;

            // --- Handle Image Clicks (Popup) ---
            const windowBody = target.closest('.window-body');
            if (target.tagName === 'IMG' && windowBody && !windowBody.classList.contains('image-popup-body')) {
                event.preventDefault();
                event.stopPropagation();
                const imgElement = target;
                const imgSrc = imgElement.src;
                const imgAlt = imgElement.alt;
                const filename = imgSrc.substring(imgSrc.lastIndexOf('/') + 1);
                const title = imgAlt || filename || 'Image Viewer';
                const rect = imgElement.getBoundingClientRect();
                createWindow(title, imgSrc, {
                    isImagePopup: true,
                    sourceX: rect.left + (rect.width / 2),
                    sourceY: rect.top + (rect.height / 2),
                    animateFromSource: true
                });
                return;
            }

            // --- Handle Link Clicks (Open Window or Focus Existing) ---
            // Includes desktop icons and internal links inside windows (excluding image popups and specific classes)
             const link = target.closest(
                'a.desktop-icon[data-window-title], .window-body:not(.image-popup-body) a[href^="/"]:not([href="/"]):not(.no-window):not([target="_blank"])'
             );

            if (link && parentElement.contains(link)) {
                 // Prevent handling clicks on images inside links if the image handler should take precedence
                if (target.tagName === 'IMG' && link.contains(target) && !link.classList.contains('desktop-icon')) {
                     console.log("[Win98 Link Click] Ignoring click on image within link (handled by image click logic).");
                     return;
                }

                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href');
                // Ensure trailing slash for consistency when looking for existing windows / using pathMap
                const targetPath = (url.endsWith('/') || url.includes('?') || url.includes('#')) ? url : url + '/';
                const title = link.dataset.windowTitle || link.textContent.trim() || pathMap[targetPath] || '窗口';
                let existingWindow = null;

                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    // Match based on the data-content-url (which should have trailing slash if it's a directory)
                    if (win.dataset.contentUrl === targetPath) {
                        existingWindow = win;
                        break;
                    }
                }

                if (existingWindow) {
                    existingWindow.dispatchEvent(new Event('pointerdown', { bubbles: true })); // Trigger bringToFront
                    existingWindow.classList.add('window-shake');
                    setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
                } else {
                    const rect = link.getBoundingClientRect();
                    createWindow(title, targetPath, { // Use targetPath with trailing slash
                        sourceX: rect.left + (rect.width / 2),
                        sourceY: rect.top + (rect.height / 2),
                        animateFromSource: true,
                        isAutoOpen: false,
                        isImagePopup: false
                    });
                }
            }
        });

        if (parentElement.dataset) {
             parentElement.dataset.interactionListenerAttached = 'true';
             // console.log(`[Win98 Interactions] Marked <${parentElement.tagName}> as attached.`);
        }
    }


    // ===============================================
    //  2. 初始化和执行逻辑部分
    // ===============================================

    setupWindowInteractions(document); // Setup for desktop icons

    // --- Auto Open Logic (Handle Gitalk Params) ---
    const currentPathRaw = window.location.pathname;
    // Ensure trailing slash for directory-like paths, unless it's the root or has an extension
    const currentPath = (currentPathRaw !== '/' && !currentPathRaw.endsWith('/') && !currentPathRaw.includes('.')) ? currentPathRaw + '/' : currentPathRaw;
    const currentSearch = window.location.search;
    const isHomePage = (currentPath === '/' || currentPath.endsWith('/index.html'));
    let autoOpenTitle = null;
    let autoOpenUrl = null; // Should include trailing slash if applicable

    if (pathMap[currentPath]) { // Check map using path with trailing slash
        autoOpenTitle = pathMap[currentPath];
        autoOpenUrl = currentPath;
    } else if (!isHomePage && !currentPath.includes('.')) { // Auto-open non-mapped paths if they look like directories
        autoOpenTitle = "加载中...";
        autoOpenUrl = currentPath;
    }
     // Handle case where URL has extension (e.g., /some/post.html) - don't auto-open usually, treat as page asset?
     // Or decide if .html should be treated as a page to open. Let's assume not for now.

    if (autoOpenUrl) {
        console.log(`[Win98 Auto Open] Detected auto-open URL: ${autoOpenUrl}${currentSearch}`);
        createWindow(autoOpenTitle, autoOpenUrl, { // Pass URL path part
             animateFromSource: false,
             isAutoOpen: true,
             isImagePopup: false
        });
        // The createWindow function now handles preserving search params if needed during initial load.
    } else {
         // If no window is auto-opened, ensure the initial load flag is set to false.
         isInitialLoad = false;
         // If it's the homepage or a page not auto-opened, ensure history state is set correctly.
         const expectedUrl = currentPath + currentSearch;
         const expectedTitle = baseTitle; // Assume base title if no window opened
         if (!history.state || history.state.windowUrl !== expectedUrl || document.title !== expectedTitle) {
             try {
                history.replaceState({ windowUrl: expectedUrl }, expectedTitle, expectedUrl);
                document.title = expectedTitle;
                console.log(`[Win98 Auto Open] No auto-open window. Set initial state for: ${expectedUrl}`);
             } catch(error) {
                 console.error("[History API] Error replacing state/title for non-auto-opened page:", error);
             }
         }
    }

    // --- Add CSS Styles (unchanged) ---
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; }
        /* Resizer styles moved to style.css */
    `;
    document.head.appendChild(styleSheet);


    // --- PopState listener (Handle Gitalk Params Robustly) ---
    window.addEventListener('popstate', (event) => {
        console.log('[PopState] Navigated. Current Location:', location.href, 'State:', event.state);
        const stateObject = event.state;
        const currentPath = location.pathname;
        const currentSearch = location.search;
        const hasGitalkParams = currentSearch.includes('code=') || currentSearch.includes('state=');

        // Determine the target URL path and ID from the state, if available
        const targetUrlPathFromState = stateObject ? stateObject.windowUrl?.split('?')[0] : null;
        const targetWindowId = stateObject ? stateObject.windowId : null;

        // Determine the canonical path to work with (ensure trailing slash for dirs)
        let canonicalPath = (currentPath !== '/' && !currentPath.endsWith('/') && !currentPath.includes('.')) ? currentPath + '/' : currentPath;

        console.log(`[PopState] Canonical path: ${canonicalPath}, Search: ${currentSearch}, State path: ${targetUrlPathFromState}, State ID: ${targetWindowId}`);

        // --- Scenario 1: Navigated to a URL corresponding to a content window ---
        if (canonicalPath !== '/') {
            let windowToFocus = null;

            // Try finding by ID first, if state provides one
            if (targetWindowId) {
                 windowToFocus = document.getElementById(targetWindowId);
                 // Verify it's a content window and its path matches the current canonical path
                 if (windowToFocus && (!windowToFocus.dataset.contentUrl || windowToFocus.dataset.contentUrl !== canonicalPath)) {
                     console.log(`[PopState] Window found by ID ${targetWindowId}, but path mismatch or not content window. Ignoring.`);
                     windowToFocus = null;
                 }
            }

            // If not found by ID, try finding by matching the canonical path
            if (!windowToFocus) {
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === canonicalPath) {
                        console.log(`[PopState] Found existing window by path: ${canonicalPath}`);
                        windowToFocus = win;
                        break;
                    }
                }
            }

            if (windowToFocus) {
                console.log('[PopState] Bringing existing window to front:', canonicalPath);
                 // Triggering 'pointerdown' handles bringing to front AND updating history state correctly (including preserving params)
                 windowToFocus.dispatchEvent(new Event('pointerdown', { bubbles: true }));
                 // Ensure title is correct (bringToFront might update it)
                 const expectedTitle = windowToFocus.querySelector('.title-bar-text').textContent || baseTitle;
                 if (document.title !== expectedTitle) {
                    document.title = expectedTitle;
                 }
            } else {
                 // Window not found, need to recreate it
                 console.log('[PopState] Window not found for path, recreating:', canonicalPath);
                 let title = '窗口'; // Default title
                 // Try getting title from pathMap or state first
                 const titleFromMap = pathMap[canonicalPath];
                 const titleFromState = stateObject ? stateObject.windowTitle : null;
                 if (titleFromMap) {
                     title = titleFromMap;
                 } else if (titleFromState) {
                     title = titleFromState;
                 } else {
                     // Try finding desktop icon as fallback title source
                     const matchingIcon = document.querySelector(`.desktop-icon[href^="${canonicalPath}"]`);
                     if (matchingIcon && matchingIcon.dataset.windowTitle) {
                        title = matchingIcon.dataset.windowTitle;
                     } else {
                         // Use a generic title if path looks like a post
                         title = canonicalPath.split('/').filter(Boolean).pop() || '窗口';
                     }
                 }

                 // Create the window using the canonical path
                 // Pass the state's windowId if available so the new window gets the correct ID for future navigation
                 const newWindow = createWindow(title, canonicalPath, {
                    animateFromSource: false,
                    isAutoOpen: false, // Definitely not auto-open
                    isImagePopup: false,
                    windowIdToUse: targetWindowId // Reuse ID from state if possible
                 });

                 // After creating (or getting existing if createWindow found it again),
                 // explicitly ensure the history state and title are correct for the *current* location.
                 const finalUrlForHistory = canonicalPath + currentSearch; // Use current path + search
                 const finalTitle = newWindow.querySelector('.title-bar-text').textContent || title; // Get title from window
                 const finalWindowId = newWindow.id; // Get the actual ID used/generated

                 // Only replace state if it doesn't match exactly what's needed
                  if (!history.state || history.state.windowUrl !== finalUrlForHistory || history.state.windowId !== finalWindowId || document.title !== finalTitle) {
                     try {
                         history.replaceState({ windowUrl: finalUrlForHistory, windowId: finalWindowId }, finalTitle, finalUrlForHistory);
                         document.title = finalTitle;
                         console.log('[PopState - Recreate] Explicitly replaced history/title after create:', finalUrlForHistory);
                     } catch (error) {
                         console.error("[PopState - Recreate] Error calling replaceState/setting title:", error);
                     }
                 }
            }
        }
        // --- Scenario 2: Navigated to the root URL ('/') ---
        else {
             console.log('[PopState] Navigated to root path (/).');
             // If there are still content windows open, the top one should dictate the state.
             const remainingWindows = windowContainer.querySelectorAll('.window[data-content-url]');
             let topWin = null, maxZ = 0;
             remainingWindows.forEach(win => {
                 const z = parseInt(win.style.zIndex || '0');
                 if (z > maxZ) { maxZ = z; topWin = win; }
             });

             if (topWin) {
                  console.log('[PopState - Root] Still windows open. Focusing top window instead.');
                  // Focus the top window, which will handle history update
                  topWin.dispatchEvent(new Event('pointerdown', { bubbles: true }));
             } else {
                 // No content windows left, ensure state is root URL (preserving params if present) and base title.
                 const rootUrl = '/' + currentSearch; // Preserve params
                 const rootTitle = baseTitle;
                 if (!history.state || history.state.windowUrl !== rootUrl || document.title !== rootTitle) {
                     try {
                         history.replaceState({ windowUrl: rootUrl }, rootTitle, rootUrl);
                         document.title = rootTitle;
                         console.log('[PopState - Root] No windows left. Set state to root:', rootUrl);
                     } catch (error) {
                         console.error("[PopState - Root] Error replacing state to root:", error);
                     }
                 }
             }
        }
    }); // End of popstate listener

}); // End of DOMContentLoaded listener

