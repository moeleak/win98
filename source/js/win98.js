// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
    // 全局变量，在 DOMContentLoaded 作用域内
    const windowContainer = document.getElementById('window-container');
    if (!windowContainer) {
        console.error("关键错误：未在页面中找到 #window-container 元素！窗口功能将无法使用。");
        return; // 如果没有容器，后续代码无法执行
    }
    let highestZIndex = 10; // 用于管理窗口层叠顺序

    // ===============================================
    //  1. 函数定义部分 (必须放在调用它们的代码之前！)
    // ===============================================

    /**
     * 创建一个新的窗口元素并添加到页面中
     * @param {string} title - 窗口的初始标题
     * @param {string} contentUrl - 要异步加载并显示在窗口中的内容的 URL
     * @returns {HTMLElement|null} 创建的窗口元素，如果创建失败则返回 null
     */
    function createWindow(title, contentUrl) {
        highestZIndex++;
        const windowId = `window-${Date.now()}`;

        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute'; // 必须是绝对定位

        // --- 初始位置和尺寸计算 (移动端友好) ---
        const screenWidth = window.innerWidth;
        const mobileBreakpoint = 768; // Threshold for mobile devices (adjust as needed)
        const initialWidth = screenWidth < mobileBreakpoint ? 250 : 450; // Use 250 for mobile, 450 for desktop

        const initialHeight = 350; // 默认初始高度
        const margin = 10; // 距离屏幕边缘的最小间距

        // Clamp width and height based on available space
        const clampedWidth = Math.min(initialWidth, screenWidth - 2 * margin);
        const clampedHeight = Math.min(initialHeight, window.innerHeight - 2 * margin);
        
        // Calculate maximum possible positions
        const maxLeft = screenWidth - clampedWidth - margin;
        const maxTop = window.innerHeight - clampedHeight - margin - 30; // 为顶部状态栏留出空间 (assuming 30px status bar height)
        
        // Ensure random position is within bounds and at least 'margin' distance
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft)));
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop)));

        windowDiv.style.left = `${randomLeft}px`;
        windowDiv.style.top = `${randomTop}px`;
        windowDiv.style.width = `${clampedWidth}px`;
        windowDiv.style.height = `${clampedHeight}px`;
        windowDiv.style.zIndex = highestZIndex;
        windowDiv.dataset.contentUrl = contentUrl; // 存储内容URL，用于后续检查

        // --- 标题栏 ---
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
        contentDiv.innerHTML = '<p>加载中...</p>';

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (提升层级) ---
        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true);

        // --- 使窗口可拖动 ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 ---
        const resizer = document.createElement('div');
        resizer.style.cssText = `
            width: 15px; height: 15px; position: absolute;
            right: 0; bottom: 0; cursor: nwse-resize;
            z-index: 1; touch-action: none;
        `; // 设置多个样式
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
                    const mainContent = doc.querySelector('#content-main');

                    if (mainContent) {
                        // 尝试提取并更新标题
                        const h1Element = mainContent.querySelector('h1');
                        if (h1Element && h1Element.textContent.trim()) {
                            titleText.textContent = h1Element.textContent.trim();
                            console.log("窗口标题已更新为:", titleText.textContent);
                        } else {
                            console.log("加载的内容中未找到 H1，保留初始标题:", title);
                        }
                        contentDiv.innerHTML = mainContent.innerHTML;
                        setupWindowLinks(contentDiv); // 为新内容设置链接
                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        titleText.textContent = title + " (内容加载失败)";
                        console.warn("无法在获取的 HTML 中找到选择器 '#content-main':", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('加载内容时出错:', contentUrl, error);
                    contentDiv.innerHTML = `<p>加载内容出错: ${error.message}</p>`;
                    titleText.textContent = title + " (加载错误)";
                });
        } else {
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            titleText.textContent = title + " (无内容)";
        }

        return windowDiv;
    }

    /**
     * 使指定元素可通过拖动其句柄来移动 (支持触摸和鼠标)
     * @param {HTMLElement} element - 要使其可拖动的窗口元素
     * @param {HTMLElement} handle - 用于拖动的句柄元素 (通常是标题栏)
     */
    function makeDraggable(element, handle) {
        let isDragging = false, pointerId = null, startX, startY, initialLeft, initialTop;

        const onPointerMove = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
            let newLeft = initialLeft + deltaX, newTop = initialTop + deltaY;
            const VpWidth = window.innerWidth, VpHeight = window.innerHeight;
            const elWidth = element.offsetWidth, elHeight = element.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, VpWidth - elWidth));
            newTop = Math.max(0, Math.min(newTop, VpHeight - elHeight));
            if (elWidth > VpWidth) newLeft = 0;
            if (elHeight > VpHeight) newTop = 0;
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
            if (handle.hasPointerCapture(pointerId)) try { handle.releasePointerCapture(pointerId); } catch (err) { console.error("释放拖动指针捕获时出错:", err); }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { passive: false, capture: false });
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
            if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) { highestZIndex++; element.style.zIndex = highestZIndex; }
            e.preventDefault(); e.stopPropagation();
            handle.style.touchAction = 'none';
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("设置拖动指针捕获时出错:", err); }
            document.addEventListener('pointermove', onPointerMove, { passive: false, capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        handle.style.cursor = 'grab';
        if (handle.ondragstart !== undefined) handle.ondragstart = () => false;
    }

    /**
     * 使指定元素可通过拖动其右下角句柄来调整大小 (支持触摸和鼠标)
     * @param {HTMLElement} element - 要使其可调整大小的窗口元素
     * @param {HTMLElement} handle - 用于调整大小的句柄元素
     */
    function makeResizable(element, handle) {
        let isResizing = false, pointerId = null, startX, startY, initialWidth, initialHeight;

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
            if (handle.hasPointerCapture(pointerId)) try { handle.releasePointerCapture(pointerId); } catch (err) { console.error("释放缩放指针捕获时出错:", err); }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { passive: false, capture: false });
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
            if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) { highestZIndex++; element.style.zIndex = highestZIndex; }
            e.preventDefault(); e.stopPropagation();
            handle.style.touchAction = 'none'; // 已经在 style.cssText 设置，这里是双保险
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("设置缩放指针捕获时出错:", err); }
            document.addEventListener('pointermove', onPointerMove, { passive: false, capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        if (handle.ondragstart !== undefined) handle.ondragstart = () => false;
    }


    /**
     * 设置页面中的链接，使其点击时在窗口中打开
     * @param {Document|HTMLElement} parentElement - 在哪个父元素下查找链接，默认为整个文档
     */
    function setupWindowLinks(parentElement = document) {
        const windowLinks = parentElement.querySelectorAll(
            'a.desktop-icon[data-window-title], a[href^="/"]:not([href="/"]):not(.no-window)'
        );
        windowLinks.forEach(link => {
            if (link.dataset.windowListenerAttached === 'true') return;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const url = link.getAttribute('href');
                const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
                let existingWindow = null;
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === url) { existingWindow = win; break; }
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
    //  2. 初始化和执行逻辑部分
    // ===============================================

    // --- 2.1 设置初始的链接点击行为 ---
    setupWindowLinks();

    // --- 2.2 根据访问的 URL 自动打开窗口 ---
    const currentPath = window.location.pathname;
    const isHomePage = (currentPath === '/' || currentPath === '/index.html' || currentPath === '');
    let autoOpenTitle = null;
    let autoOpenUrl = null;

    console.log("--- Auto Open Logic Start ---");
    console.log("Current Pathname:", currentPath);
    console.log("Is Homepage?", isHomePage);

    switch (currentPath) {
        case '/about/': case '/about/index.html':
            autoOpenTitle = "关于我"; autoOpenUrl = "/about/";
            console.log("Path matched: /about/"); break;
        case '/links/': case '/links/index.html':
            autoOpenTitle = "友情链接"; autoOpenUrl = "/links/";
            console.log("Path matched: /links/"); break;
        case '/archives/': case '/archives/index.html':
            autoOpenTitle = "存档"; autoOpenUrl = "/archives/";
            console.log("Path matched: /archives/"); break;
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
        if (autoOpenedWindow) {
            console.log("<<< Window creation called (title might update after load).");
        } else {
            console.error(`<<< Window creation call seems to have failed for ${autoOpenUrl}`);
        }
    } else {
        console.log(">>> No window to auto-open based on checks.");
    }
    console.log("--- Auto Open Logic End ---");

    // --- 2.3 添加必要的 CSS 样式 ---
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; }
    `;
    document.head.appendChild(styleSheet);

}); // End of DOMContentLoaded listener


