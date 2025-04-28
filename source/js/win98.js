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

    // ===============================================
    //  1. 函数定义部分
    // ===============================================

    /**
     * Creates a new window.
     * @param {string} title - The initial title for the window and browser.
     * @param {string} contentUrl - The URL to fetch content from.
     * @param {object} [options={}] - Options for creation.
     * @param {number} [options.sourceX] - X coordinate of the click source.
     * @param {number} [options.sourceY] - Y coordinate of the click source.
     * @param {boolean} [options.animateFromSource=false] - Animate from source coordinates?
     * @param {boolean} [options.isAutoOpen=false] - Is this window being opened automatically on page load?
     */
    function createWindow(title, contentUrl, options = {}) {
        const { sourceX, sourceY, animateFromSource = false, isAutoOpen = false } = options;

        highestZIndex++;
        const windowId = `window-${Date.now()}`;

        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute';
        windowDiv.style.zIndex = highestZIndex;
        windowDiv.dataset.contentUrl = contentUrl; // Store URL for focusing and history

        // --- Calculate final position and size ---
        // ... (calculation logic remains the same) ...
        const screenWidth = window.innerWidth;
        const mobileBreakpoint = 768;
        const targetWidth = screenWidth < mobileBreakpoint ? Math.min(screenWidth - 20, 300) : 521;
        const targetHeight = screenWidth < mobileBreakpoint ? Math.min(window.innerHeight - 50, 400) : 350;
        const margin = 10;
        const clampedWidth = Math.min(targetWidth, screenWidth - 2 * margin);
        const clampedHeight = Math.min(targetHeight, window.innerHeight - 2 * margin - 30);
        const maxLeft = screenWidth - clampedWidth - margin;
        const maxTop = window.innerHeight - clampedHeight - margin - 30;
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft)));
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop)));
        const finalLeft = randomLeft;
        const finalTop = randomTop;
        const finalWidth = clampedWidth;
        const finalHeight = clampedHeight;


        // --- Set Initial State (for animation) ---
        // ... (logic remains the same) ...
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
        // --- Updated Close Button Logic ---
        closeButton.onclick = (e) => {
            e.stopPropagation();

            const windowIdToRemove = windowDiv.id;
            const closedWindowUrl = windowDiv.dataset.contentUrl;

            windowDiv.remove();

            const remainingWindows = windowContainer.querySelectorAll('.window');

            if (remainingWindows.length === 0) {
                // Last window closed
                const baseUrl = '/';
                if (location.pathname !== baseUrl) {
                    console.log('[Window Close] Last window closed. Reverting URL and Title to base.');
                    try {
                        history.replaceState({ windowUrl: baseUrl }, baseTitle, baseUrl);
                        document.title = baseTitle; // Update browser title
                    } catch (error) {
                        console.error("[History API] Error reverting to base URL on close:", error);
                    }
                }
            } else {
                // Other windows remain, check if the closed one was active
                if (location.pathname === closedWindowUrl) {
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
                         const newTopUrl = newTopWindow.dataset.contentUrl;
                         const newTopTitle = newTopWindow.querySelector('.title-bar-text').textContent || baseTitle; // Get title from new top window
                         if (newTopUrl && location.pathname !== newTopUrl) {
                             console.log('[Window Close] Active window closed. Updating URL and Title to new top window:', newTopUrl);
                             try {
                                 history.replaceState({ windowUrl: newTopUrl, windowId: newTopWindow.id }, newTopTitle, newTopUrl);
                                 document.title = newTopTitle; // Update browser title
                             } catch (error) {
                                 console.error("[History API] Error updating URL/Title to new top window on close:", error);
                             }
                         }
                     } else {
                         // Fallback: Revert to base if no top window found (shouldn't happen)
                         const baseUrl = '/';
                          if (location.pathname !== baseUrl) {
                             try {
                                history.replaceState({ windowUrl: baseUrl }, baseTitle, baseUrl);
                                document.title = baseTitle;
                             } catch (error) {
                                 console.error("[History API] Error reverting to base URL (fallback on close):", error);
                             }
                          }
                     }
                }
                // If closed window wasn't active, URL and Title remain unchanged
            }
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        // --- 窗口内容区域 ---
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        contentDiv.innerHTML = '<p>加载中...</p>';

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (更新以包含 URL 和标题更新) ---
        const bringToFront = () => {
            // Only act if it's not already the topmost
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;

                const currentContentUrl = windowDiv.dataset.contentUrl;
                const currentTitle = titleText.textContent; // Get current title from title bar

                // Update Browser URL and Title on Focus if they don't match
                if (currentContentUrl && (location.pathname !== currentContentUrl || document.title !== currentTitle)) {
                    try {
                        history.replaceState({ windowUrl: currentContentUrl, windowId: windowId }, currentTitle, currentContentUrl);
                        document.title = currentTitle; // Update browser title
                        console.log(`[History API & Title] Replaced state/title for focus: ${currentContentUrl}, Title: ${currentTitle}`);
                    } catch (error) {
                        console.error("[History API & Title] Error calling replaceState/setting title:", error);
                    }
                }
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true); // Capture phase

        // --- 使窗口可拖动 (不变) ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 (不变) ---
        // ... (resizer creation and makeResizable call remains the same) ...
        const resizer = document.createElement('div');
        resizer.style.cssText = `
            width: 15px; height: 15px; position: absolute;
            right: 0; bottom: 0; cursor: nwse-resize;
            z-index: 1; touch-action: none;
        `;
        windowDiv.appendChild(resizer);
        makeResizable(windowDiv, resizer);


        // --- 将窗口添加到容器 ---
        windowContainer.appendChild(windowDiv);

        // --- Apply Animation (if animating from source) ---
        // ... (animation logic remains the same) ...
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

        // --- Update Browser URL and Title on Create ---
        if (contentUrl) {
           const historyMethod = isInitialLoad && isAutoOpen ? 'replaceState' : 'pushState';
           if (location.pathname !== contentUrl || (historyMethod === 'pushState' && document.title !== title) || (historyMethod === 'replaceState' && document.title !== title && isInitialLoad)) {
                try {
                   history[historyMethod]({ windowUrl: contentUrl, windowId: windowId }, title, contentUrl);
                   document.title = title; // Set browser title on creation
                   console.log(`[History API & Title] Called ${historyMethod}/set title for new window: ${contentUrl}, Title: ${title}`);
                   if (isInitialLoad && isAutoOpen) {
                       isInitialLoad = false;
                   }
                } catch (error) {
                   console.error(`[History API & Title] Error calling ${historyMethod}/setting title:`, error);
                }
           } else if (isInitialLoad && isAutoOpen) {
                // Ensure initial load flag is handled even if URL/Title match
                isInitialLoad = false;
                 // Still replace state to ensure state object exists for popstate
                 try {
                    history.replaceState({ windowUrl: contentUrl, windowId: windowId }, title, contentUrl);
                    // Ensure title matches if somehow it diverged
                    if (document.title !== title) document.title = title;
                 } catch (error) {
                     console.error("[History API & Title] Error calling replaceState/setting title for initial match:", error);
                 }
           }
        }


        // --- 异步加载内容 (更新标题同步逻辑) ---
        if (contentUrl) {
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
                        // --- 更新窗口标题 和 浏览器标题 (如果找到H1且窗口是活动的) ---
                        const h1Element = mainContent.querySelector('h1');
                        if (h1Element && h1Element.textContent.trim()) {
                            const newTitle = h1Element.textContent.trim();
                            titleText.textContent = newTitle; // Update window title bar

                            // Update history state title and browser title ONLY if this window is currently active
                            if (parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                                try {
                                    history.replaceState({ windowUrl: contentUrl, windowId: windowId }, newTitle, contentUrl);
                                    document.title = newTitle; // Update browser title
                                    console.log(`[Win98 & Title] Content loaded, active window title updated to: ${newTitle}`);
                                } catch (error) {
                                     console.error("[History API & Title] Error updating title in replaceState/document:", error);
                                }
                            } else {
                                 console.log(`[Win98] Window title updated to: ${newTitle} (window not active, browser title unchanged)`);
                            }
                        } else {
                            console.log("[Win98] H1 not found in loaded content, keeping initial title:", title);
                        }

                        // --- 内容处理 和 Gitalk (逻辑不变) ---
                        contentDiv.innerHTML = '';
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild);
                        }
                        console.log("[Win98] Appended fetched content to window body.");

                        const gitalkPlaceholder = contentDiv.querySelector('#gitalk-container-placeholder');
                        if (gitalkPlaceholder) {
                            console.log("[Win98] Found Gitalk placeholder.");
                            const uniqueGitalkId = `gitalk-container-${windowId}`;
                            gitalkPlaceholder.id = uniqueGitalkId;
                            console.log(`[Win98] Renamed placeholder ID to: ${uniqueGitalkId}`);
                            if (typeof initializeGitalkForWindow === 'function') {
                                initializeGitalkForWindow(uniqueGitalkId, contentUrl);
                            } else {
                                console.error("[Win98] Error: Global function 'initializeGitalkForWindow' not found!");
                                gitalkPlaceholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
                            }
                        } else {
                             console.log("[Win98] Gitalk placeholder (#gitalk-container-placeholder) not found in the fetched content.");
                        }

                        // --- 设置窗口内链接 (不变) ---
                        setupWindowLinks(contentDiv);

                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        titleText.textContent = title + " (内容加载失败)";
                         // Update browser title if this was the active window
                        if (parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                            document.title = title + " (内容加载失败)";
                        }
                        console.warn("[Win98] Cannot find selector '#content-main' in fetched HTML:", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('[Win98] Error fetching content:', contentUrl, error);
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    const errorTitle = title + " (加载错误)";
                    titleText.textContent = errorTitle;
                    // Update browser title if this was the active window
                    if (parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                        document.title = errorTitle;
                    }
                });
        } else {
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            const noContentTitle = title + " (无内容)";
            titleText.textContent = noContentTitle;
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                 document.title = noContentTitle; // Also update browser title if active
            }
        }

        return windowDiv; // Return the created window element
    }

    // --- makeDraggable function (不变) ---
    function makeDraggable(element, handle) {
        // ... (Implementation is the same) ...
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
            if (e.target.closest('.title-bar-controls') || (e.pointerType === 'mouse' && e.button !== 0) || e.target.style.cursor === 'nwse-resize') return;
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
            handle.style.touchAction = 'none';
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (drag):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        handle.style.cursor = 'grab';
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; }
    }


    // --- makeResizable function (不变) ---
    function makeResizable(element, handle) {
        // ... (Implementation is the same) ...
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
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            isResizing = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize';
            // bringToFront is handled by capture listener on windowDiv
            e.preventDefault();
            e.stopPropagation();
            handle.style.touchAction = 'none';
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (resize):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; }
    }


    // --- setupWindowLinks function (不变) ---
    function setupWindowLinks(parentElement = document) {
        // ... (Implementation is the same) ...
         const windowLinks = parentElement.querySelectorAll(
             'a.desktop-icon[data-window-title], .window-body a[href^="/"]:not([href="/"]):not(.no-window)'
        );
        windowLinks.forEach(link => {
            if (link.dataset.windowListenerAttached === 'true') return;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href');
                const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
                let existingWindow = null;
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === url) {
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
                    const clickX = rect.left + (rect.width / 2);
                    const clickY = rect.top + (rect.height / 2);
                    createWindow(title, url, { // Pass the title here
                        sourceX: clickX,
                        sourceY: clickY,
                        animateFromSource: true,
                        isAutoOpen: false
                    });
                }
            });
            link.dataset.windowListenerAttached = 'true';
        });
    }

    // ===============================================
    //  2. 初始化和执行逻辑部分 (不变)
    // ===============================================

    setupWindowLinks(); // Setup links on the main document

    // --- Auto Open Logic (不变, 但确保传递初始 title) ---
    const currentPath = window.location.pathname;
    const normalizedPath = (currentPath !== '/' && currentPath.endsWith('/')) ? currentPath.slice(0, -1) : currentPath;
    const isHomePage = (normalizedPath === '/' || normalizedPath.endsWith('/index.html') || normalizedPath === '');
    let autoOpenTitle = null;
    let autoOpenUrl = null;
    // ... (pathMap logic remains the same) ...
    const pathMap = { "/about": "关于我", "/links": "友情链接", "/archives": "存档", "/guestbook": "留言板" };
    if (pathMap[normalizedPath]) {
        autoOpenTitle = pathMap[normalizedPath];
        autoOpenUrl = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    } else if (!isHomePage) {
        autoOpenTitle = "加载中..."; // Initial title before content loads
        autoOpenUrl = currentPath;
    }

    if (autoOpenTitle && autoOpenUrl) {
        // Pass the determined or initial title to createWindow
        createWindow(autoOpenTitle, autoOpenUrl, {
             animateFromSource: false,
             isAutoOpen: true
        });
    } else {
         isInitialLoad = false; // Ensure flag is handled if no auto-open
         // Ensure history state reflects homepage if landing there
         if (isHomePage && (!history.state || history.state.windowUrl !== location.pathname)) {
             try {
                history.replaceState({ windowUrl: location.pathname }, baseTitle, location.pathname);
                // Ensure initial document title is correct if not set by auto-open
                if (document.title !== baseTitle && !autoOpenUrl) {
                    document.title = baseTitle;
                }
             } catch(error) {
                 console.error("[History API] Error replacing state/title for homepage:", error);
             }
         }
    }

    // --- 添加 CSS 样式 (不变) ---
    // ... (shake animation, body class, touch-action styles remain the same) ...
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; }
        #window-container > .window > div[style*="cursor: nwse-resize"] { touch-action: none; }
    `;
    document.head.appendChild(styleSheet);


    // --- PopState listener (更新以处理标题) ---
    window.addEventListener('popstate', (event) => {
        console.log('[PopState] Navigated:', event.state);
        const stateUrl = event.state ? event.state.windowUrl : null;
        const stateTitle = event.state ? event.state.windowTitle : null; // Assuming title might be stored in future

        if (stateUrl) {
            const targetUrl = stateUrl;
            const targetWindowId = event.state.windowId;
            let windowToFocus = null;

            if (targetWindowId) {
                 windowToFocus = document.getElementById(targetWindowId);
            }
            if (!windowToFocus) {
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === targetUrl) {
                        windowToFocus = win;
                        break;
                    }
                }
            }

            if (windowToFocus) {
                console.log('[PopState] Found existing window, bringing to front:', targetUrl);
                 const windowTitle = windowToFocus.querySelector('.title-bar-text').textContent || baseTitle;
                 if (parseInt(windowToFocus.style.zIndex) < highestZIndex) {
                     highestZIndex++;
                     windowToFocus.style.zIndex = highestZIndex;
                 }
                 // Ensure browser title matches the focused window
                 if (document.title !== windowTitle) {
                    document.title = windowTitle;
                 }
            } else {
                // Window not found, recreate it
                 console.log('[PopState] Window not found for URL, attempting to recreate:', targetUrl);
                 let title = stateTitle || '窗口'; // Use title from state if available
                 const matchingIcon = document.querySelector(`.desktop-icon a[href="${targetUrl}"]`);
                 if(matchingIcon && matchingIcon.dataset.windowTitle) {
                    title = matchingIcon.dataset.windowTitle;
                 } else if (targetUrl === '/') {
                     title = baseTitle; // Use base title for base URL
                 }
                 // Recreate without animation, ensure title is set
                 createWindow(title, targetUrl, { animateFromSource: false, isAutoOpen: false });
                 // The createWindow function will handle setting the document.title
            }
        } else {
             // State is null or invalid (e.g., navigated back to initial page load state before JS ran, or to base URL state)
             console.log('[PopState] State is null or URL invalid. Reverting to base state.');
             // Check if any windows are open. If so, maybe focus the top one? If not, set base title.
             const remainingWindows = windowContainer.querySelectorAll('.window');
             if (remainingWindows.length === 0) {
                 if (document.title !== baseTitle) {
                     document.title = baseTitle; // Set base title
                 }
                 // Ensure URL is base URL if state is null/invalid
                 if(location.pathname !== '/') {
                      try {
                         history.replaceState({ windowUrl: '/' }, baseTitle, '/');
                      } catch(e) {/*ignore*/}
                 }
             } else {
                 // Maybe find top window and ensure title matches? Or do nothing.
                 // For simplicity, let's just ensure the title isn't stuck on something invalid.
                 // Find top window and sync title
                 let topWin = null, maxZ = 0;
                 remainingWindows.forEach(win => {
                     const z = parseInt(win.style.zIndex || '0');
                     if (z > maxZ) { maxZ = z; topWin = win; }
                 });
                 if (topWin) {
                     const topTitle = topWin.querySelector('.title-bar-text').textContent || baseTitle;
                     if (document.title !== topTitle) document.title = topTitle;
                 } else if (document.title !== baseTitle) { // Fallback if no top window found
                     document.title = baseTitle;
                 }
             }
        }
    });

}); // End of DOMContentLoaded listener

