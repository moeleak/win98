// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
    const windowContainer = document.getElementById('window-container');
    if (!windowContainer) {
        console.error("关键错误：未在页面中找到 #window-container 元素！");
        return;
    }
    let highestZIndex = 10;

    // ===============================================
    //  1. 函数定义部分
    // ===============================================

    function createWindow(title, contentUrl) {
        highestZIndex++;
        const windowId = `window-${Date.now()}`;

        const windowDiv = document.createElement('div');
        // ... (设置 windowDiv class, id, style, position, size etc. - 保持不变)
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute';
        // ... (Rest of the initial position/size calculations - unchanged) ...
        const screenWidth = window.innerWidth;
        const mobileBreakpoint = 768;
        const initialWidth = screenWidth < mobileBreakpoint ? 250 : 521;
        const initialHeight = 350;
        const margin = 10;
        const clampedWidth = Math.min(initialWidth, screenWidth - 2 * margin);
        const clampedHeight = Math.min(initialHeight, window.innerHeight - 2 * margin);
        const maxLeft = screenWidth - clampedWidth - margin;
        const maxTop = window.innerHeight - clampedHeight - margin - 30;
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft)));
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop)));
        windowDiv.style.left = `${randomLeft}px`;
        windowDiv.style.top = `${randomTop}px`;
        windowDiv.style.width = `${clampedWidth}px`;
        windowDiv.style.height = `${clampedHeight}px`;
        windowDiv.style.zIndex = highestZIndex;
        windowDiv.dataset.contentUrl = contentUrl;


        // --- 标题栏 (保持不变) ---
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
            windowDiv.remove();
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        // --- 窗口内容区域 ---
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        contentDiv.innerHTML = '<p>加载中...</p>'; // Initial loading message

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (保持不变) ---
        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true);

        // --- 使窗口可拖动 (保持不变) ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 (保持不变) ---
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

        // --- 异步加载内容 ---
        if (contentUrl) {
            fetch(contentUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP 错误！状态: ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const mainContent = doc.querySelector('#content-main'); // Find #content-main in fetched HTML

                    if (mainContent) {
                        // --- 更新窗口标题 (逻辑保持不变) ---
                        const h1Element = mainContent.querySelector('h1');
                        if (h1Element && h1Element.textContent.trim()) {
                            titleText.textContent = h1Element.textContent.trim();
                            console.log(`[Win98] Window title updated to: ${titleText.textContent}`);
                        } else {
                            console.log("[Win98] H1 not found in loaded content, keeping initial title:", title);
                        }

                        // --- New Content Handling ---
                        contentDiv.innerHTML = ''; // Clear loading message

                        // 1. Append all children of fetched #content-main to the window body
                        //    This preserves the structure, including the placeholder div
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild); // Moves nodes
                        }
                        console.log("[Win98] Appended fetched content to window body.");

                        // 2. Find the Gitalk placeholder *within the live* window body
                        const gitalkPlaceholder = contentDiv.querySelector('#gitalk-container-placeholder');

                        if (gitalkPlaceholder) {
                            console.log("[Win98] Found Gitalk placeholder.");
                            // 3. Create a unique ID for the actual container
                            const uniqueGitalkId = `gitalk-container-${windowId}`;
                            // 4. Rename the placeholder's ID
                            gitalkPlaceholder.id = uniqueGitalkId;
                            console.log(`[Win98] Renamed placeholder ID to: ${uniqueGitalkId}`);

                            // 5. Call the global initialization function (defined in layout.ejs)
                            if (typeof initializeGitalkForWindow === 'function') {
                                // Pass the unique container ID and the content URL as the unique page ID
                                initializeGitalkForWindow(uniqueGitalkId, contentUrl);
                            } else {
                                console.error("[Win98] Error: Global function 'initializeGitalkForWindow' not found!");
                                gitalkPlaceholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
                            }
                        } else {
                             console.log("[Win98] Gitalk placeholder (#gitalk-container-placeholder) not found in the fetched content.");
                             // Check if comments were expected for this page (optional)
                             // If the original page.comments was true, this might indicate an issue.
                        }

                        // 6. Setup links within the newly loaded content (remains the same)
                        setupWindowLinks(contentDiv);

                    } else {
                        // Error handling: #content-main not found (remains the same)
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        titleText.textContent = title + " (内容加载失败)";
                        console.warn("[Win98] Cannot find selector '#content-main' in fetched HTML:", contentUrl);
                    }
                })
                .catch(error => {
                    // Error handling: Fetch request failed (remains the same)
                    console.error('[Win98] Error fetching content:', contentUrl, error);
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    titleText.textContent = title + " (加载错误)";
                });
        } else {
            // Case where no contentUrl was provided (remains the same)
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            titleText.textContent = title + " (无内容)";
        }

        return windowDiv; // Return the created window element
    }

    // --- makeDraggable function (保持不变) ---
    function makeDraggable(element, handle) {
        let isDragging = false, pointerId = null, startX, startY, initialLeft, initialTop;
        // ... (Implementation is the same as provided before) ...
        const onPointerMove = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
            let newLeft = initialLeft + deltaX, newTop = initialTop + deltaY;
            const VpWidth = window.innerWidth, VpHeight = window.innerHeight;
            const elWidth = element.offsetWidth, elHeight = element.offsetHeight;
            newLeft = Math.max(0 - elWidth + 50, Math.min(newLeft, VpWidth - 50));
            newTop = Math.max(0, Math.min(newTop, VpHeight - handle.offsetHeight));
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
                try { handle.releasePointerCapture(pointerId); } catch (err) { console.error("释放拖动指针捕获时出错:", err); }
            }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: false });
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
        const onPointerDown = (e) => {
            if (e.target.closest('.title-bar-controls')) return;
            if ((e.pointerType === 'mouse' && e.button !== 0) || e.target.style.cursor === 'nwse-resize') return;
            isDragging = true;
            pointerId = e.pointerId;
            startX = e.clientX; startY = e.clientY;
            initialLeft = element.offsetLeft; initialTop = element.offsetTop;
            handle.style.cursor = 'grabbing';
            element.style.userSelect = 'none';
            document.body.style.userSelect = 'none';
            document.body.classList.add('is-dragging-window');
            if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) {
                highestZIndex++;
                element.style.zIndex = highestZIndex;
            }
            e.preventDefault();
            e.stopPropagation();
            handle.style.touchAction = 'none';
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("设置拖动指针捕获时出错:", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        handle.style.cursor = 'grab';
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; }
    }


    // --- makeResizable function (保持不变) ---
    function makeResizable(element, handle) {
        let isResizing = false, pointerId = null, startX, startY, initialWidth, initialHeight;
        // ... (Implementation is the same as provided before) ...
        const onPointerMove = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
            let newWidth = initialWidth + deltaX, newHeight = initialHeight + deltaY;
            const computedStyle = window.getComputedStyle(element);
            const minWidth = parseInt(computedStyle.minWidth || '150');
            const minHeight = parseInt(computedStyle.minHeight || '100');
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
                try { handle.releasePointerCapture(pointerId); } catch (err) { console.error("释放缩放指针捕获时出错:", err); }
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
            startX = e.clientX; startY = e.clientY;
            initialWidth = element.offsetWidth; initialHeight = element.offsetHeight;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize';
            if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) {
                highestZIndex++;
                element.style.zIndex = highestZIndex;
            }
            e.preventDefault();
            e.stopPropagation();
            handle.style.touchAction = 'none';
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("设置缩放指针捕获时出错:", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; }
    }


    // --- setupWindowLinks function (保持不变) ---
    function setupWindowLinks(parentElement = document) {
        const windowLinks = parentElement.querySelectorAll(
            'a.desktop-icon[data-window-title], a[href^="/"]:not([href="/"]):not(.no-window)'
        );
        // ... (Implementation is the same as provided before) ...
        windowLinks.forEach(link => {
            if (link.dataset.windowListenerAttached === 'true') return;
            link.addEventListener('click', (event) => {
                event.preventDefault();
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
                    highestZIndex++;
                    existingWindow.style.zIndex = highestZIndex;
                    existingWindow.classList.add('window-shake');
                    setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
                } else {
                    createWindow(title, url);
                }
            });
            link.dataset.windowListenerAttached = 'true';
        });
    }

    // ===============================================
    //  2. 初始化和执行逻辑部分 (保持不变)
    // ===============================================

    setupWindowLinks();

    // --- Auto Open Logic (保持不变) ---
    const currentPath = window.location.pathname;
    const isHomePage = (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath === '');
    let autoOpenTitle = null;
    let autoOpenUrl = null;
    // ... (Switch statement and logic to determine autoOpenUrl/Title - unchanged) ...
    console.log("--- Auto Open Logic Start ---");
    console.log("Current Pathname:", currentPath);
    console.log("Is Homepage?", isHomePage);
    switch (currentPath) {
        case '/about/': case '/about/index.html':
            autoOpenTitle = "关于我"; autoOpenUrl = "/about/"; console.log("Path matched: /about/"); break;
        case '/links/': case '/links/index.html':
            autoOpenTitle = "友情链接"; autoOpenUrl = "/links/"; console.log("Path matched: /links/"); break;
        case '/archives/': case '/archives/index.html':
            autoOpenTitle = "存档"; autoOpenUrl = "/archives/"; console.log("Path matched: /archives/"); break;
        case '/guestbook/': case '/guestbook/index.html':
            autoOpenTitle = "留言板"; autoOpenUrl = "/guestbook/"; console.log("Path matched: /guestbook/"); break;
    }
     console.log("After switch check - Title:", autoOpenTitle, "URL:", autoOpenUrl);
    if (!isHomePage && !autoOpenTitle) {
        console.log("Not homepage or special page, assuming post/page.");
        autoOpenTitle = "加载中...";
        autoOpenUrl = currentPath;
        console.log("Set Auto Open Title:", autoOpenTitle, "URL:", autoOpenUrl);
    } else {
         console.log("Condition for post/page not met. Homepage:", isHomePage, "Matched Special:", !!autoOpenTitle);
    }
     console.log("Final check - Title:", autoOpenTitle, "URL:", autoOpenUrl);
    if (autoOpenTitle && autoOpenUrl) {
        console.log(`>>> Trying to create window: Title='${autoOpenTitle}', URL='${autoOpenUrl}'`);
        const autoOpenedWindow = createWindow(autoOpenTitle, autoOpenUrl);
        if (autoOpenedWindow) { console.log("<<< Window creation called (title might update after load)."); }
        else { console.error(`<<< Window creation call seems to have failed for ${autoOpenUrl}`); }
    } else { console.log(">>> No window to auto-open based on checks."); }
    console.log("--- Auto Open Logic End ---");


    // --- 添加 CSS 样式 (保持不变) ---
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; }
    `;
    document.head.appendChild(styleSheet);

}); // End of DOMContentLoaded listener

