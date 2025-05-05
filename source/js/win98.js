document.addEventListener('DOMContentLoaded', () => {
    const windowContainer = document.getElementById('window-container');
    if (!windowContainer) {
        return;
    }
    let highestZIndex = 10;
    let isInitialLoad = true;
    const blogTitle = document.body.dataset.blogTitle;
    const DESKTOP_TITLE_PLACEHOLDER = "Desktop";

    function setDocumentTitle(pageTitle) {
        const effectiveTitle = pageTitle || DESKTOP_TITLE_PLACEHOLDER;
        const fullTitle = `[${effectiveTitle}] - ${blogTitle}`;
        document.title = fullTitle;
        return fullTitle;
    }

    function createWindow(title, contentIdentifier, options = {}) {
        const {
            sourceX,
            sourceY,
            animateFromSource = false,
            isAutoOpen = false,
            isImagePopup = false,
            windowIdToUse
        } = options;

        highestZIndex++;
        const windowId = windowIdToUse || `window-${Date.now()}`;
        const contentUrl = !isImagePopup ? contentIdentifier : null;
        const imageSrc = isImagePopup ? contentIdentifier : null;

        if (document.getElementById(windowId)) {
            const existingWindow = document.getElementById(windowId);
            existingWindow.dispatchEvent(new Event('pointerdown', { bubbles: true }));
            return existingWindow;
        }

        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute';
        windowDiv.style.zIndex = highestZIndex;
        if (contentUrl) {
            windowDiv.dataset.contentUrl = contentUrl;
        }
        if (imageSrc) {
             windowDiv.dataset.imageSrc = imageSrc;
        }

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
        const placementOffset = (windowContainer.childElementCount % 5) * 20;
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft - 100)) + placementOffset);
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop - 100)) + placementOffset);
        const finalLeft = randomLeft;
        const finalTop = randomTop;
        const finalWidth = clampedWidth;
        const finalHeight = clampedHeight;

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

        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        const titleText = document.createElement('div');
        titleText.className = 'title-bar-text';
        titleText.textContent = title;
        titleBar.appendChild(titleText);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'title-bar-controls';
        const closeButton = document.createElement('button');
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.onclick = (e) => {
            e.stopPropagation();
            const windowIdToRemove = windowDiv.id;
            const closedWindowUrlPath = windowDiv.dataset.contentUrl;
            windowDiv.remove();
            const remainingWindows = windowContainer.querySelectorAll('.window');
            const currentPath = location.pathname;
            const currentSearch = location.search;
            const currentFullUrl = location.pathname + location.search;

            if (remainingWindows.length === 0) {
                const baseUrl = '/';
                const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                const expectedFullDesktopTitle = setDocumentTitle(null); // 获取桌面标题
                if (currentFullUrl !== targetUrl || document.title !== expectedFullDesktopTitle) {
                    try {
                        history.replaceState({ windowUrl: targetUrl }, expectedFullDesktopTitle, targetUrl);
                    } catch (error) { /* ignore */ }
                }
            } else {
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
                    const newTopIsActive = (parseInt(newTopWindow.style.zIndex || '0') === maxZ);
                    const newTopUrlPath = newTopWindow.dataset.contentUrl;
                    const newTopTitle = newTopWindow.querySelector('.title-bar-text').textContent; // Use title bar text
                    const newTopWindowId = newTopWindow.id;

                    if (newTopUrlPath) {
                        const hasGitalkParams = currentSearch.includes('code=') || currentSearch.includes('state=');
                        let targetUrl = newTopUrlPath;
                        if (newTopUrlPath === currentPath && hasGitalkParams) {
                            targetUrl += currentSearch;
                        }
                        const expectedFullNewTopTitle = setDocumentTitle(newTopTitle);
                        if (currentFullUrl !== targetUrl || document.title !== expectedFullNewTopTitle) {
                            try {
                                history.replaceState({ windowUrl: targetUrl, windowId: newTopWindowId }, expectedFullNewTopTitle, targetUrl);
                            } catch (error) { /* ignore */ }
                        }
                    } else {
                        const baseUrl = '/';
                        const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                        // If the top window is non-content (e.g. image), revert to desktop title unless it has its own title bar text
                        const titleForNonContent = newTopTitle || null; // Use title bar text if available, else null for desktop
                        const expectedFullTitle = setDocumentTitle(titleForNonContent);
                        if (currentFullUrl !== targetUrl || document.title !== expectedFullTitle) {
                            try {
                                history.replaceState({ windowUrl: targetUrl }, expectedFullTitle, targetUrl);
                            } catch (error) { /* ignore */ }
                        }
                    }
                 } else {
                     // Should not happen if remainingWindows.length > 0, but handle defensively
                     const baseUrl = '/';
                     const targetUrl = baseUrl + (currentPath === baseUrl && (currentSearch.includes('code=') || currentSearch.includes('state=')) ? currentSearch : '');
                     const expectedFullDesktopTitle = setDocumentTitle(null);
                     if (currentFullUrl !== targetUrl || document.title !== expectedFullDesktopTitle) {
                         try {
                             history.replaceState({ windowUrl: targetUrl }, expectedFullDesktopTitle, targetUrl);
                         } catch (error) { /* ignore */ }
                     }
                 }
            }
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        if (isImagePopup) {
            contentDiv.classList.add('image-popup-body');
        }

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;
            }
            // Always ensure title is correct for the top window, even if z-index didn't change (e.g., content loaded)
             const windowUrlPath = windowDiv.dataset.contentUrl;
             const currentTitleInBar = titleText.textContent;

             if (windowUrlPath && !isImagePopup) { // Content window
                 const currentFullUrl = location.pathname + location.search;
                 const hasGitalkParams = location.search.includes('code=') || location.search.includes('state=');
                 let targetUrlForHistory = windowUrlPath;
                 if (windowUrlPath === location.pathname && hasGitalkParams) {
                     targetUrlForHistory += location.search;
                 }

                 const stateUrl = targetUrlForHistory;
                 const expectedFullTitle = setDocumentTitle(currentTitleInBar);

                 if (currentFullUrl !== stateUrl || document.title !== expectedFullTitle) {
                      try {
                         history.replaceState({ windowUrl: stateUrl, windowId: windowId }, expectedFullTitle, stateUrl);
                      } catch (error) { /* ignore */ }
                 }
             } else { // Non-content window (image popup etc.) or Desktop background interaction
                 const expectedFullTitle = setDocumentTitle(currentTitleInBar); // Use title bar text
                 // Don't change URL, just update title if needed
                 if (document.title !== expectedFullTitle) {
                    // setDocumentTitle handles setting document.title
                 } else {
                    setDocumentTitle(currentTitleInBar); // Ensure it's set even if not changed
                 }
             }
        };
        // Attach bringToFront to pointerdown. Use capture phase to ensure it runs before drag starts.
        windowDiv.addEventListener('pointerdown', bringToFront, true);

        makeDraggable(windowDiv, titleBar);

        const resizer = document.createElement('div');
        resizer.className = 'window-resizer';
        resizer.style.cssText = `position: absolute; right: 0; bottom: 0; cursor: nwse-resize; z-index: 1; touch-action: none;`;
        windowDiv.appendChild(resizer);
        makeResizable(windowDiv, resizer);

        windowContainer.appendChild(windowDiv);

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

        if (contentUrl && !isImagePopup) {
           const historyMethod = (isInitialLoad && isAutoOpen) ? 'replaceState' : 'pushState';
           const currentFullUrl = location.pathname + location.search;
           const hasGitalkParams = location.search.includes('code=') || location.search.includes('state=');
           let targetUrlForHistory = contentUrl;

           if (isInitialLoad && isAutoOpen && contentUrl === location.pathname && hasGitalkParams) {
               targetUrlForHistory += location.search;
           }

           const needsStateUpdate = historyMethod === 'pushState' ? (currentFullUrl !== targetUrlForHistory) : (currentFullUrl !== targetUrlForHistory);
           const expectedFullTitleOnCreate = setDocumentTitle(title);
           const titleNeedsUpdate = document.title !== expectedFullTitleOnCreate;

           if (needsStateUpdate || titleNeedsUpdate) {
                try {
                   history[historyMethod]({ windowUrl: targetUrlForHistory, windowId: windowId }, expectedFullTitleOnCreate, targetUrlForHistory);
                } catch (error) { /* ignore */ }
           }
           if (isInitialLoad && isAutoOpen) {
              isInitialLoad = false;
           }
        } else if (isInitialLoad && isAutoOpen) {
             isInitialLoad = false; // Mark initial load done even for non-content auto-open
             // Ensure title is set correctly if this non-content window is the only one
             if(windowContainer.querySelectorAll('.window').length === 1) {
                 setDocumentTitle(title);
             }
        }

        if (isImagePopup && imageSrc) {
            contentDiv.innerHTML = `<img src="${imageSrc}" alt="${title}">`;
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                setDocumentTitle(title);
            }
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
                        let fetchedTitle = title;
                        if (h1Element && h1Element.textContent.trim()) {
                            fetchedTitle = h1Element.textContent.trim();
                            titleText.textContent = fetchedTitle;
                        }

                        if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                             const currentFullUrl = location.pathname + location.search;
                             const expectedFullFetchedTitle = setDocumentTitle(fetchedTitle);
                             if (!history.state || history.state.title !== expectedFullFetchedTitle || document.title !== expectedFullFetchedTitle) {
                                 try {
                                    history.replaceState({ windowUrl: currentFullUrl, windowId: windowId }, expectedFullFetchedTitle, currentFullUrl);
                                 } catch (error) { /* ignore */ }
                             }
                        }

                        contentDiv.innerHTML = '';
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild);
                        }

                        const gitalkPlaceholder = contentDiv.querySelector('#gitalk-container-placeholder');
                        if (gitalkPlaceholder && typeof initializeGitalkForWindow === 'function') {
                            const uniqueGitalkId = `gitalk-container-${windowId}`;
                            gitalkPlaceholder.id = uniqueGitalkId;
                            initializeGitalkForWindow(uniqueGitalkId, contentUrl);
                        } else if (gitalkPlaceholder) {
                            gitalkPlaceholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
                        }

                        setupWindowInteractions(contentDiv);

                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        const errorTitle = title + " (内容加载失败)";
                        titleText.textContent = errorTitle;
                        if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                            setDocumentTitle(errorTitle);
                        }
                    }
                })
                .catch(error => {
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    const errorTitle = title + " (加载错误)";
                    titleText.textContent = errorTitle;
                     if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                        setDocumentTitle(errorTitle);
                    }
                });
        } else if (!isImagePopup) {
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            const noContentTitle = title + " (无内容)";
            titleText.textContent = noContentTitle;
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                 setDocumentTitle(noContentTitle);
            }
        }

        // Ensure bringToFront is called once after creation if it's the top window
        if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
             bringToFront();
        }


        return windowDiv;
    }

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
            // Prevent drag initiation on controls, resize handle, or non-left mouse clicks
            if (e.target.closest('.title-bar-controls') || (e.pointerType === 'mouse' && e.button !== 0) || e.target.classList.contains('window-resizer')) return;
            // Also ensure pointerdown on window activates it first (handled by capture phase listener)

            isDragging = true;
            pointerId = e.pointerId;
            startX = e.clientX; startY = e.clientY;
            initialLeft = element.offsetLeft; initialTop = element.offsetTop;
            handle.style.cursor = 'grabbing';
            element.style.userSelect = 'none'; // Prevent text selection during drag
            document.body.style.userSelect = 'none'; // Prevent text selection on body
            document.body.classList.add('is-dragging-window'); // Add class for potential global styles
            // e.preventDefault(); // Don't prevent default here, let capture phase listener run first
            e.stopPropagation(); // Stop propagation after handling
            handle.style.touchAction = 'none'; // Disable scrolling etc. on the handle during drag
            try { handle.setPointerCapture(pointerId); } catch (err) { /* ignore */ } // Capture pointer events to the handle
            document.addEventListener('pointermove', onPointerMove, { capture: false }); // Use non-capture for move/up
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown); // Use bubbling phase for drag initiation
        handle.style.cursor = 'grab';
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent native image drag
    }

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
            // Prevent resizing that pushes the window off-screen negatively
            // Note: This simple check doesn't prevent resizing off right/bottom, more complex checks needed if required
            // newWidth = Math.max(minWidth, initialLeft + newWidth > 0 ? newWidth : minWidth);
            // newHeight = Math.max(minHeight, initialTop + newHeight > 0 ? newHeight : minHeight);
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
        };
        const onPointerUp = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            isResizing = false;
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('cursor');
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
             // Ensure pointerdown on window activates it first (handled by capture phase listener)
            isResizing = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            document.body.style.userSelect = 'none'; // Prevent text selection during resize
            document.body.style.cursor = 'nwse-resize'; // Set appropriate cursor for body
            e.preventDefault(); // Prevent default actions like text selection
            e.stopPropagation(); // Stop propagation
            handle.style.touchAction = 'none'; // Disable scrolling etc. on the handle
            try { handle.setPointerCapture(pointerId); } catch (err) { /* ignore */ } // Capture pointer events
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent native drag
    }

    function setupWindowInteractions(parentElement) {
        if (!parentElement || (parentElement.dataset && parentElement.dataset.interactionListenerAttached === 'true')) {
             return;
        }

        parentElement.addEventListener('click', (event) => {
            const target = event.target;

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

             const link = target.closest(
                'a.desktop-icon, .window-body:not(.image-popup-body) a[href^="/"]:not([href="/"]):not(.no-window):not([target="_blank"])'
             );

            if (link && parentElement.contains(link)) {
                if (target.tagName === 'IMG' && link.contains(target) && !link.classList.contains('desktop-icon')) {
                     return;
                }

                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href');
                const targetPath = (url.endsWith('/') || url.includes('?') || url.includes('#')) ? url : url + '/';
                const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
                let existingWindow = null;

                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === targetPath) {
                        existingWindow = win;
                        break;
                    }
                }

                if (existingWindow) {
                    existingWindow.dispatchEvent(new Event('pointerdown', { bubbles: true }));
                    existingWindow.classList.add('window-shake');
                    setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
                } else {
                    const rect = link.getBoundingClientRect();
                    createWindow(title, targetPath, {
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
        }
    }

    setupWindowInteractions(document);

    const currentPathRaw = window.location.pathname;
    const currentPath = (currentPathRaw !== '/' && !currentPathRaw.endsWith('/') && !currentPathRaw.includes('.')) ? currentPathRaw + '/' : currentPathRaw;
    const currentSearch = window.location.search;
    const currentFullUrl = currentPath + currentSearch;
    const isHomePage = (currentPath === '/' || currentPath.endsWith('/index.html'));
    let autoOpenTitle = null;
    let autoOpenUrl = null;

    if (!isHomePage && !currentPath.includes('.')) {
        autoOpenTitle = "加载中...";
        autoOpenUrl = currentPath;
    }

    if (autoOpenUrl) {
        createWindow(autoOpenTitle, autoOpenUrl, {
             animateFromSource: false,
             isAutoOpen: true,
             isImagePopup: false
        });
    } else {
         isInitialLoad = false;
         const expectedUrl = currentFullUrl;
         const expectedFullDesktopTitle = setDocumentTitle(null); // Desktop title
         if (!history.state || history.state.windowUrl !== expectedUrl || document.title !== expectedFullDesktopTitle) {
             try {
                history.replaceState({ windowUrl: expectedUrl }, expectedFullDesktopTitle, expectedUrl);
             } catch(error) { /* ignore */ }
         }
    }

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; cursor: grabbing !important; }
        body.is-dragging-window * { cursor: grabbing !important; }

    `;
    document.head.appendChild(styleSheet);

    window.addEventListener('popstate', (event) => {
        const stateObject = event.state;
        const currentPath = location.pathname;
        const currentSearch = location.search;
        const currentFullUrl = currentPath + currentSearch;

        const targetUrlFromState = stateObject ? stateObject.windowUrl : null; // Get full URL from state if available
        const targetWindowId = stateObject ? stateObject.windowId : null;

        let canonicalPath = (currentPath !== '/' && !currentPath.endsWith('/') && !currentPath.includes('.')) ? currentPath + '/' : currentPath;

        if (canonicalPath !== '/') {
            let windowToFocus = null;

            if (targetWindowId) {
                 windowToFocus = document.getElementById(targetWindowId);
                 if (windowToFocus && (!windowToFocus.dataset.contentUrl || windowToFocus.dataset.contentUrl !== canonicalPath)) {
                     windowToFocus = null;
                 }
            }

            if (!windowToFocus) {
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === canonicalPath) {
                        windowToFocus = win;
                        break;
                    }
                }
            }

            if (windowToFocus) {
                 windowToFocus.dispatchEvent(new Event('pointerdown', { bubbles: true }));
            } else {
                 let title = '窗口';
                 const fullTitleFromState = stateObject ? stateObject.title : null; // History state often stores the full title string

                 if (fullTitleFromState) {
                    // Attempt to extract base title from full state title
                    const expectedSuffix = ` — ${blogTitle}`;
                    const expectedPrefix = "「";
                    const expectedSuffixEnd = "」";
                     if (typeof fullTitleFromState === 'string' && fullTitleFromState.startsWith(expectedPrefix) && fullTitleFromState.endsWith(expectedSuffix)) {
                        const endIndex = fullTitleFromState.lastIndexOf(expectedSuffixEnd + expectedSuffix);
                        if (endIndex > expectedPrefix.length) {
                           title = fullTitleFromState.substring(expectedPrefix.length, endIndex);
                        } else {
                           title = fullTitleFromState; // Fallback if extraction fails
                        }
                     } else {
                         title = fullTitleFromState; // Use directly if format doesn't match
                     }

                 } else {
                     const matchingIcon = document.querySelector(`.desktop-icon[href^="${canonicalPath}"]`);
                     if (matchingIcon && matchingIcon.dataset.windowTitle) {
                        title = matchingIcon.dataset.windowTitle;
                     } else {
                         title = canonicalPath.split('/').filter(Boolean).pop() || '窗口';
                     }
                 }

                 const newWindow = createWindow(title, canonicalPath, {
                    animateFromSource: false,
                    isAutoOpen: false,
                    isImagePopup: false,
                    windowIdToUse: targetWindowId
                 });

                 // Ensure history state is accurate after potential creation/update
                 const finalUrlForHistory = currentFullUrl; // Use the actual current URL
                 const finalTitle = newWindow.querySelector('.title-bar-text').textContent || title;
                 const finalWindowId = newWindow.id;
                 const expectedFullRecreateTitle = setDocumentTitle(finalTitle);

                 if (!history.state || history.state.windowUrl !== finalUrlForHistory || history.state.windowId !== finalWindowId || document.title !== expectedFullRecreateTitle) {
                     try {
                         history.replaceState({ windowUrl: finalUrlForHistory, windowId: finalWindowId }, expectedFullRecreateTitle, finalUrlForHistory);
                     } catch (error) { /* ignore */ }
                 }
            }
        }
        else { // Navigated to root '/'
             const remainingWindows = windowContainer.querySelectorAll('.window[data-content-url]');
             let topWin = null, maxZ = 0;
             remainingWindows.forEach(win => {
                 const z = parseInt(win.style.zIndex || '0');
                 if (z > maxZ) { maxZ = z; topWin = win; }
             });

             if (topWin) {
                  // If a content window still exists, navigating to '/' likely means we should focus it.
                  // Dispatching pointerdown will trigger bringToFront, which updates URL/title correctly.
                  topWin.dispatchEvent(new Event('pointerdown', { bubbles: true }));
             } else {
                 // No content windows left, ensure state is root URL and desktop title.
                 const rootUrl = currentFullUrl; // Use the actual current URL (which is '/' + search)
                 const expectedFullRootTitle = setDocumentTitle(null); // Desktop title
                 if (!history.state || history.state.windowUrl !== rootUrl || document.title !== expectedFullRootTitle) {
                     try {
                         history.replaceState({ windowUrl: rootUrl }, expectedFullRootTitle, rootUrl);
                     } catch (error) { /* ignore */ }
                 }
             }
        }
    });

});

