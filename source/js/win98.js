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
     * @param {string} contentIdentifier - URL to fetch or identifier (like image src).
     * @param {object} [options={}] - Options for creation.
     * @param {number} [options.sourceX] - X coordinate of the click source.
     * @param {number} [options.sourceY] - Y coordinate of the click source.
     * @param {boolean} [options.animateFromSource=false] - Animate from source coordinates?
     * @param {boolean} [options.isAutoOpen=false] - Is this window being opened automatically on page load?
     * @param {boolean} [options.isImagePopup=false] - Is this a dedicated image viewer window?
     */
    function createWindow(title, contentIdentifier, options = {}) {
        const {
            sourceX,
            sourceY,
            animateFromSource = false,
            isAutoOpen = false,
            isImagePopup = false // <-- New option
        } = options;

        highestZIndex++;
        const windowId = `window-${Date.now()}`;
        const contentUrl = !isImagePopup ? contentIdentifier : null; // Store actual URL only if not image popup
        const imageSrc = isImagePopup ? contentIdentifier : null; // Store image source if it is an image popup

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
        // Adjust default size for image popups potentially? Or keep same? Let's keep same for now.
        const defaultWidth = screenWidth < mobileBreakpoint ? Math.min(screenWidth - 20, 300) : 521;
        const defaultHeight = screenWidth < mobileBreakpoint ? Math.min(window.innerHeight - 50, 400) : 350;
        const targetWidth = defaultWidth;
        const targetHeight = defaultHeight;
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
        // --- Updated Close Button Logic (No changes needed for image popups here) ---
        closeButton.onclick = (e) => {
            e.stopPropagation();

            const windowIdToRemove = windowDiv.id;
            const closedWindowUrl = windowDiv.dataset.contentUrl; // Will be null/undefined for image popups

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
                // Other windows remain, check if the closed one was active AND HAD A URL
                if (closedWindowUrl && location.pathname === closedWindowUrl) {
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
                         const newTopUrl = newTopWindow.dataset.contentUrl; // Check if the new top window has a URL
                         const newTopTitle = newTopWindow.querySelector('.title-bar-text').textContent || baseTitle;
                         if (newTopUrl && location.pathname !== newTopUrl) {
                             console.log('[Window Close] Active URL window closed. Updating URL and Title to new top window:', newTopUrl);
                             try {
                                 history.replaceState({ windowUrl: newTopUrl, windowId: newTopWindow.id }, newTopTitle, newTopUrl);
                                 document.title = newTopTitle;
                             } catch (error) {
                                 console.error("[History API] Error updating URL/Title to new top window on close:", error);
                             }
                         } else if (!newTopUrl) { // If new top window is e.g. an image popup
                            const baseUrl = '/';
                            if (location.pathname !== baseUrl) {
                                try {
                                    history.replaceState({ windowUrl: baseUrl }, baseTitle, baseUrl);
                                    document.title = baseTitle;
                                } catch (error) {
                                     console.error("[History API] Error reverting to base URL (new top has no URL):", error);
                                }
                            }
                         }
                     } else {
                         // Fallback: Revert to base if no top window found
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
                // If closed window wasn't active OR was an image popup, URL and Title remain unchanged
            }
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        // --- 窗口内容区域 ---
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        // Add specific class for image popups for styling
        if (isImagePopup) {
            contentDiv.classList.add('image-popup-body');
        }

        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (更新以包含 URL 和标题更新, skip for image popups) ---
        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;

                const currentContentUrl = windowDiv.dataset.contentUrl; // Will be null for image popups
                const currentTitle = titleText.textContent;

                // Update Browser URL and Title on Focus ONLY IF it's not an image popup and they don't match
                if (currentContentUrl && !isImagePopup && (location.pathname !== currentContentUrl || document.title !== currentTitle)) {
                    try {
                        history.replaceState({ windowUrl: currentContentUrl, windowId: windowId }, currentTitle, currentContentUrl);
                        document.title = currentTitle;
                        console.log(`[History API & Title] Replaced state/title for focus: ${currentContentUrl}, Title: ${currentTitle}`);
                    } catch (error) {
                        console.error("[History API & Title] Error calling replaceState/setting title:", error);
                    }
                } else if (!isImagePopup && document.title !== currentTitle) {
                    // Still update title if it got out of sync, even if URL matches
                    document.title = currentTitle;
                }
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true); // Capture phase

        // --- 使窗口可拖动 (不变) ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 (不变) ---
        // --- 使窗口可调整大小 (增大触摸区域) ---
        // --- 使窗口可调整大小 (使用 CSS 类控制大小) ---
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer'; // <--- 添加 CSS 类名

        // --- 从 style.cssText 中移除 width 和 height ---
        // 让 CSS 文件来控制尺寸
        resizer.style.cssText = `
            /* width 和 height 已移除 */
            position: absolute;
            right: 0;           /* 定位保持不变 */
            bottom: 0;          /* 定位保持不变 */
            cursor: nwse-resize; /* 光标样式保持不变 */
            z-index: 1;         /* z-index 保持不变 */
            touch-action: none; /* 防止页面滚动 */
            /* 可选: 添加一个半透明背景或边框用于调试，完成后删除 */
            /* border: 1px dashed rgba(255, 0, 0, 0.5); */
        `;
        windowDiv.appendChild(resizer);
        // makeResizable 函数仍然使用这个带有新类名的 resizer 元素
        makeResizable(windowDiv, resizer);

        // --- 将窗口添加到容器 ---
        windowContainer.appendChild(windowDiv);

        // --- Apply Animation (if animating from source) ---
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

        // --- Update Browser URL and Title on Create (Skip for image popups) ---
        if (contentUrl && !isImagePopup) {
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
                isInitialLoad = false;
                 try {
                    history.replaceState({ windowUrl: contentUrl, windowId: windowId }, title, contentUrl);
                    if (document.title !== title) document.title = title;
                 } catch (error) {
                     console.error("[History API & Title] Error calling replaceState/setting title for initial match:", error);
                 }
           }
        } else if (isInitialLoad && isAutoOpen && !isImagePopup) {
            // Handle initial load flag even if URL matches and it's not an image popup
             isInitialLoad = false;
        }

        // --- 处理内容：加载或直接设置 ---
        if (isImagePopup && imageSrc) {
            // --- Handle Image Popup Directly ---
            contentDiv.innerHTML = `<img src="${imageSrc}" alt="${title}">`; // Use title as alt
            console.log(`[Win98 Image Popup] Created window for image: ${imageSrc}`);
            // No fetching, no history updates needed here.

        } else if (contentUrl) {
            // --- 异步加载页面内容 ---
            contentDiv.innerHTML = '<p>加载中...</p>'; // Loading indicator
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
                        // --- 更新窗口标题 和 浏览器标题 (如果找到H1且窗口是活动的, 且非image popup) ---
                        const h1Element = mainContent.querySelector('h1');
                        if (h1Element && h1Element.textContent.trim()) {
                            const newTitle = h1Element.textContent.trim();
                            titleText.textContent = newTitle; // Update window title bar

                            // Update history state title and browser title ONLY if this window is currently active AND NOT image popup
                            if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                                try {
                                    history.replaceState({ windowUrl: contentUrl, windowId: windowId }, newTitle, contentUrl);
                                    document.title = newTitle;
                                    console.log(`[Win98 & Title] Content loaded, active window title updated to: ${newTitle}`);
                                } catch (error) {
                                     console.error("[History API & Title] Error updating title in replaceState/document:", error);
                                }
                            } else {
                                 console.log(`[Win98] Window title updated to: ${newTitle} (window not active or image popup, browser title unchanged)`);
                            }
                        } else {
                            console.log("[Win98] H1 not found in loaded content, keeping initial title:", title);
                        }

                        // --- 内容处理 和 Gitalk ---
                        contentDiv.innerHTML = ''; // Clear loading message
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild);
                        }
                        console.log("[Win98] Appended fetched content to window body.");

                        // --- Gitalk Initialization ---
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

                        // --- 设置窗口内链接 (包括图片点击) ---
                        setupWindowInteractions(contentDiv); // Call the unified handler setup

                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        const errorTitle = title + " (内容加载失败)";
                        titleText.textContent = errorTitle;
                        if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                            document.title = errorTitle;
                        }
                        console.warn("[Win98] Cannot find selector '#content-main' in fetched HTML:", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('[Win98] Error fetching content:', contentUrl, error);
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    const errorTitle = title + " (加载错误)";
                    titleText.textContent = errorTitle;
                     if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                        document.title = errorTitle;
                    }
                });
        } else if (!isImagePopup) {
            // Only show "No URL" if it's not an image popup
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            const noContentTitle = title + " (无内容)";
            titleText.textContent = noContentTitle;
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                 document.title = noContentTitle;
            }
        }

        return windowDiv; // Return the created window element
    }

    // --- makeDraggable function (不变) ---
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


    // --- setupWindowInteractions (Handles both Links and Image Popups via Delegation) ---
    function setupWindowInteractions(parentElement) {
        // Use parentElement which is typically the '.window-body' after content load,
        // or the main 'document' for desktop icons initially.

        // ***** CORRECTED SECTION START *****
        // Ensure parentElement is valid before proceeding
        if (!parentElement) {
            console.error("[Win98 Interactions] Attempted to attach listener to an invalid element (null or undefined).");
            return;
        }

        // Check if parentElement has dataset AND if the listener is already attached
        // Note: 'document' object does not have a 'dataset' property
        if (parentElement.dataset && parentElement.dataset.interactionListenerAttached === 'true') {
             console.log(`[Win98 Interactions] Listener already attached to <${parentElement.tagName}>. Skipping.`);
             return; // Prevent double-binding on elements like contentDiv
        }
        // ***** CORRECTED SECTION END *****


        // Determine the element to log (use nodeName for document, tagName for elements)
        const elementName = parentElement.nodeName || parentElement.tagName || 'UnknownElement';
        console.log(`[Win98 Interactions] Attaching listener to ${elementName}`);

        parentElement.addEventListener('click', (event) => {
            const target = event.target;

            // --- Handle Image Clicks ---
            // Make sure target is an IMG and it's inside a '.window-body' that is NOT an image popup itself.
            const windowBody = target.closest('.window-body');
            if (target.tagName === 'IMG' && windowBody && !windowBody.classList.contains('image-popup-body')) {
                event.preventDefault(); // Prevent default if image is wrapped in <a>
                event.stopPropagation(); // Stop propagation to prevent link handling below if wrapped

                const imgElement = target;
                const imgSrc = imgElement.src;
                const imgAlt = imgElement.alt;
                const filename = imgSrc.substring(imgSrc.lastIndexOf('/') + 1);
                const title = imgAlt || filename || 'Image Viewer'; // Use alt, fallback to filename, then generic

                const rect = imgElement.getBoundingClientRect();
                const clickX = rect.left + (rect.width / 2);
                const clickY = rect.top + (rect.height / 2);

                console.log(`[Win98 Img Click] Detected click on: ${imgSrc}`);
                createWindow(title, imgSrc, {
                    isImagePopup: true,
                    sourceX: clickX,
                    sourceY: clickY,
                    animateFromSource: true
                });
                return; // Handled image click, exit
            }

            // --- Handle Link Clicks (Desktop Icons or Internal Links in regular windows) ---
            // Link selector ensures it's a desktop icon OR an internal link within a regular window body
             const link = target.closest(
                'a.desktop-icon[data-window-title], .window-body:not(.image-popup-body) a[href^="/"]:not([href="/"]):not(.no-window)'
             );


            // Check if the found link is valid and within the scope of this listener
            if (link && parentElement.contains(link)) {
                 // Ensure we are not processing a click *on* an image that might be *inside* a link
                 // (The image click handler above should catch clicks inside regular windows first)
                if (target.tagName === 'IMG' && link.contains(target)) {
                    // If it's a desktop icon image, let the link logic proceed.
                    // If it's an image inside a regular window link, it should have been handled above.
                    if (!link.classList.contains('desktop-icon')) {
                         console.log("[Win98 Link Click] Ignoring click on image within link (handled by image click logic).");
                         return;
                    }
                }

                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href');
                const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
                let existingWindow = null;
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    // Match only windows with a contentUrl (ignore image popups for finding existing pages)
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
                    createWindow(title, url, {
                        sourceX: clickX,
                        sourceY: clickY,
                        animateFromSource: true,
                        isAutoOpen: false,
                        isImagePopup: false // Ensure this is false for links
                    });
                }
            }
        });

        // ***** CORRECTED SECTION START *****
        // Mark as attached only if parentElement has a dataset (elements only, not document)
        if (parentElement.dataset) {
             parentElement.dataset.interactionListenerAttached = 'true';
             console.log(`[Win98 Interactions] Marked <${parentElement.tagName}> as attached.`);
        }
        // ***** CORRECTED SECTION END *****
    }


    // ===============================================
    //  2. 初始化和执行逻辑部分
    // ===============================================

    setupWindowInteractions(document); // Setup interactions for desktop icons initially

    // --- Auto Open Logic (不变, title passed to createWindow) ---
    const currentPath = window.location.pathname;
    const normalizedPath = (currentPath !== '/' && currentPath.endsWith('/')) ? currentPath.slice(0, -1) : currentPath;
    const isHomePage = (normalizedPath === '/' || normalizedPath.endsWith('/index.html') || normalizedPath === '');
    let autoOpenTitle = null;
    let autoOpenUrl = null;
    const pathMap = { "/about": "关于我", "/links": "友情链接", "/archives": "存档", "/guestbook": "留言板" };
    if (pathMap[normalizedPath]) {
        autoOpenTitle = pathMap[normalizedPath];
        autoOpenUrl = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    } else if (!isHomePage) {
        autoOpenTitle = "加载中..."; // Initial title before content loads
        autoOpenUrl = currentPath;
    }

    if (autoOpenTitle && autoOpenUrl) {
        createWindow(autoOpenTitle, autoOpenUrl, {
             animateFromSource: false,
             isAutoOpen: true,
             isImagePopup: false // Ensure this is false
        });
    } else {
         isInitialLoad = false;
         if (isHomePage && (!history.state || history.state.windowUrl !== location.pathname)) {
             try {
                history.replaceState({ windowUrl: location.pathname }, baseTitle, location.pathname);
                if (document.title !== baseTitle && !autoOpenUrl) {
                    document.title = baseTitle;
                }
             } catch(error) {
                 console.error("[History API] Error replacing state/title for homepage:", error);
             }
         }
    }

    // --- 添加 CSS 样式 (不变) ---
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; }
        #window-container > .window > div[style*="cursor: nwse-resize"] { touch-action: none; }
    `;
    document.head.appendChild(styleSheet);


    // --- PopState listener (更新以处理标题, ignore image popups implicitly) ---
    window.addEventListener('popstate', (event) => {
        console.log('[PopState] Navigated:', event.state);
        const stateUrl = event.state ? event.state.windowUrl : null;
        const stateTitle = event.state ? event.state.windowTitle : null; // Title might be in state

        if (stateUrl) {
            const targetUrl = stateUrl;
            const targetWindowId = event.state.windowId;
            let windowToFocus = null;

            // Try finding by ID first, then by URL (only for non-image windows)
            if (targetWindowId) {
                 windowToFocus = document.getElementById(targetWindowId);
                 // Verify it's not an image popup by checking dataset.contentUrl
                 if (windowToFocus && !windowToFocus.dataset.contentUrl) {
                     windowToFocus = null; // Don't focus image popups via history
                 }
            }
            if (!windowToFocus) {
                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    if (win.dataset.contentUrl === targetUrl) { // Match only windows with contentUrl
                        windowToFocus = win;
                        break;
                    }
                }
            }

            if (windowToFocus) {
                console.log('[PopState] Found existing content window, bringing to front:', targetUrl);
                 const windowTitle = windowToFocus.querySelector('.title-bar-text').textContent || baseTitle;
                 if (parseInt(windowToFocus.style.zIndex) < highestZIndex) {
                     highestZIndex++;
                     windowToFocus.style.zIndex = highestZIndex;
                 }
                 if (document.title !== windowTitle) {
                    document.title = windowTitle;
                 }
            } else {
                 // Window not found, recreate it (if it's not supposed to be an image popup)
                 console.log('[PopState] Content window not found for URL, attempting to recreate:', targetUrl);
                 let title = '窗口'; // Default title
                 // Try to get title from known mappings or state
                 const knownTitle = pathMap[targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl] || stateTitle;
                 if (knownTitle) title = knownTitle;

                 // Check if a corresponding desktop icon exists to get a title
                 const matchingIcon = document.querySelector(`.desktop-icon[href="${targetUrl}"]`);
                 if(matchingIcon && matchingIcon.dataset.windowTitle) {
                    title = matchingIcon.dataset.windowTitle;
                 } else if (targetUrl === '/') {
                     title = baseTitle;
                 }

                 // Recreate only if it's a content URL, not implicitly an image
                 createWindow(title, targetUrl, {
                    animateFromSource: false,
                    isAutoOpen: false,
                    isImagePopup: false // Ensure false when recreating from history
                 });
                 // createWindow will handle setting the document.title
            }
        } else {
             // State is null or invalid (likely means back to base URL state)
             console.log('[PopState] State is null or URL invalid. Reverting to base state.');
             const remainingWindows = windowContainer.querySelectorAll('.window[data-content-url]'); // Only count content windows
             if (remainingWindows.length === 0) {
                 if (document.title !== baseTitle) {
                     document.title = baseTitle;
                 }
                 if(location.pathname !== '/') {
                      try {
                         history.replaceState({ windowUrl: '/' }, baseTitle, '/');
                      } catch(e) {/*ignore*/}
                 }
             } else {
                 // Find top content window and sync title
                 let topWin = null, maxZ = 0;
                 remainingWindows.forEach(win => {
                     const z = parseInt(win.style.zIndex || '0');
                     if (z > maxZ) { maxZ = z; topWin = win; }
                 });
                 if (topWin) {
                     const topTitle = topWin.querySelector('.title-bar-text').textContent || baseTitle;
                     if (document.title !== topTitle) document.title = topTitle;
                 } else if (document.title !== baseTitle) {
                     document.title = baseTitle;
                 }
             }
        }
    });

}); // End of DOMContentLoaded listener

