import {
    createStyleElement,
    createStampElement,
    handleUpload,
    setupDragUpload
} from './imageElements.js';

// 全局缩放系数
let globalScaleFactor = 1;
window.globalScaleFactor = globalScaleFactor;

// 全局印花位置数据
const globalStampPosition = {
    x: 0,
    y: 0,
    width: 200,
    height: 200
};
window.globalStampPosition = globalStampPosition;

$(document).ready(function () {
    /**
     * 更新印花预览
     * @param {jQuery} styleItem 款式图片元素
     * @param {jQuery} marker 激活的位置标记
     */
    const updateStampPreview = (styleItem, marker, stampName) => {
        const previewImg = styleItem.find('.stampreview')[0];
        const markerImg = marker.find('img')[0];
        // 修复：没有图片时直接返回
        if (!markerImg || !markerImg.src) return;

        // 更新预览图片源和alt属性
        $(previewImg).attr('src', markerImg.src);
        $(previewImg).attr('alt', stampName);

        // 获取marker的实际尺寸(包括transform缩放)
        const markerRect = marker[0].getBoundingClientRect();
        const styleRect = styleItem[0].getBoundingClientRect();

        // 计算相对于款式图片的位置
        const left = markerRect.left - styleRect.left;
        const top = markerRect.top - styleRect.top;

        // 计算保持比例的尺寸
        const imgAspectRatio = markerImg.naturalWidth / markerImg.naturalHeight;
        const markerWidth = markerRect.width;
        const markerHeight = markerRect.height;

        let adjustedWidth, adjustedHeight;

        // 计算两种适配方式的尺寸
        const widthFitWidth = markerWidth;
        const widthFitHeight = widthFitWidth / imgAspectRatio;

        const heightFitHeight = markerHeight;
        const heightFitWidth = heightFitHeight * imgAspectRatio;

        // 选择不会超出色块的适配方式
        if (widthFitHeight <= markerHeight) {
            // 宽度适配不会超出高度
            adjustedWidth = widthFitWidth;
            adjustedHeight = widthFitHeight;
        } else {
            // 高度适配不会超出宽度
            adjustedWidth = heightFitWidth;
            adjustedHeight = heightFitHeight;
        }

        // 同步位置、尺寸和旋转到预览(顶部对齐)
        const angle = parseFloat(marker.attr('data-angle')) || 0;
        $(previewImg).css({
            left: left + 'px',
            top: top + 'px',
            width: adjustedWidth + 'px',
            height: adjustedHeight + 'px',
            'object-fit': 'cover',
            'object-position': 'top',
            'transform': `rotate(${angle}deg)`,
            'transform-origin': '50% 50%' // 以中心为旋转中心
        });

        // 存储实际尺寸到data属性，供合成使用
        marker.data('actualWidth', adjustedWidth);
        marker.data('actualHeight', adjustedHeight);

        // 蒙版预览
        const maskImage = styleItem.data('maskImage');
        if (maskImage) {
            // 在预览图上应用蒙版
            const previewCanvas = styleItem.find('.mask-preview-canvas');
            if (previewCanvas.length === 0) {
                styleItem.append(`<canvas class="mask-preview-canvas" style="position:absolute;top:0;left:0;pointer-events:none;z-index:20;"></canvas>`);
            }
            const canvas = styleItem.find('.mask-preview-canvas')[0];
            const styleImg = styleItem.find('.styleBg')[0];
            canvas.width = styleImg.naturalWidth;
            canvas.height = styleImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const maskImg = new Image();
            maskImg.src = maskImage;
            maskImg.onload = () => {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            };
        }
    };


    // 存储每个款式图片的激活色块
    const styleItemsData = new WeakMap();

    // 款式图片上传回调
    const styleUploadCallback = (imageData, fileName) => {
        const previewArea = $('#stylePreview');
        // 创建款式图片元素并添加序列号
        const { styleItem, img, deleteBtn } = createStyleElement(imageData);
        img.attr('alt', fileName.split('.')[0]);
        const sequenceNum = $('#stylePreview .style-item').length + 1;

        // 处理图片加载和缩放系数计算
        const imgElement = img[0]; // 获取原生DOM元素

        const handleImageLoad = () => {
            const renderWidth = img.width();
            const naturalWidth = imgElement.naturalWidth;
            if (naturalWidth > 0) {
                globalScaleFactor = (naturalWidth / renderWidth).toFixed(4);
            } else {
                console.warn('图片自然宽度为0，无法计算缩放系数');
            }
        };

        // 延迟检查以确保属性已设置
        setTimeout(() => {
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                console.log('图片已缓存，立即计算');
                handleImageLoad();
            } else {
                console.log('绑定onload/onerror事件');
                imgElement.onload = handleImageLoad;
                imgElement.onerror = () => {
                    console.error('图片加载失败:', imgElement.src);
                    console.error('错误状态:', {
                        complete: imgElement.complete,
                        naturalWidth: imgElement.naturalWidth
                    });
                };
            }
        }, 0);
        const sequenceTag = $(`<div class="sequence-number" data-tooltip="图片序号">${sequenceNum}</div>`);
        const fileNameTag = $(`<div class="file-name">${fileName.split('.')[0]}</div>`);
        styleItem.append(sequenceTag, fileNameTag);

        // 设置删除按钮事件
        deleteBtn.on('click', function (e) {
            e.stopPropagation();
            styleItem.remove();
            // 重新计算款式图片序列号
            $('#stylePreview .style-item').each(function (index) {
                $(this).find('.sequence-number').text(index + 1);
            });
        });

        // 初始化位置标记交互
        const markers = styleItem.find('.position-marker');
        const firstMarker = markers.first();
        styleItemsData.set(styleItem[0], {
            activeMarker: firstMarker,
            markers: markers
        });

        // 设置第一个色块为激活状态
        firstMarker.addClass('selected');

        markers.each(function () {
            const marker = $(this);
            const markerEl = marker[0];

            // 强制初始化标记图片和旋转控制点
            marker.find('img').remove(); // 移除现有图片
            marker.find('.rotate-handle').remove(); // 移除现有旋转按钮
            // 添加旋转控制点(使用更新后的样式)
            const rotateHandle = $('<div class="rotate-handle"></div>');
            marker.append(rotateHandle);
            
            // 为旋转按钮单独绑定旋转交互
            interact(rotateHandle[0]).draggable({
                onstart: function(event) {
                    const markerEl = $(event.target).closest('.position-marker')[0];
                    // 添加旋转角度显示
                    if (!$(markerEl).find('.rotate-angle').length) {
                        $(markerEl).append('<div class="rotate-angle">0°</div>');
                    }
                    $(markerEl).addClass('rotating');
                },
                onmove: function(event) {
                    const markerEl = $(event.target).closest('.position-marker')[0];
                    const rect = markerEl.getBoundingClientRect();
                    const center = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    // 计算相对于中心点的鼠标位置
                    const mouseX = event.clientX - center.x;
                    const mouseY = event.clientY - center.y;
                    
                    // 计算当前角度（0-360度）
                    let angle = Math.atan2(mouseY, mouseX) * 180 / Math.PI + 90;
                    angle = (angle + 360) % 360; // 确保角度在0-360范围内
                    
                    // 获取初始角度（第一次拖动时）
                    if (!markerEl.hasAttribute('data-init-angle')) {
                        const currentAngle = parseFloat(markerEl.getAttribute('data-angle')) || 0;
                        markerEl.setAttribute('data-init-angle', currentAngle - angle);
                    }
                    const initAngle = parseFloat(markerEl.getAttribute('data-init-angle'));
                    
                    // 应用旋转角度（初始角度 + 当前旋转角度）
                    const finalAngle = initAngle + angle;
                    
                    // 更新旋转角度
                    markerEl.setAttribute('data-angle', angle);
                    const x = parseFloat(markerEl.getAttribute('data-x')) || 0;
                    const y = parseFloat(markerEl.getAttribute('data-y')) || 0;
                    markerEl.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
                    
                    // 更新角度显示
                    $(markerEl).find('.rotate-angle').text(`${Math.round(angle)}°`);
                    
                    // 更新预览
                    const styleItem = $(markerEl).closest('.style-item');
                    const itemData = styleItemsData.get(styleItem[0]);
                    if (selectedStamp && $(markerEl).hasClass('selected')) {
                        updateStampPreview(styleItem, $(markerEl));
                    }
                },
                onend: function(event) {
                    const markerEl = $(event.target).closest('.position-marker')[0];
                    $(markerEl).removeClass('rotating');
                }
            });

            // 确保元素可见且可交互
            markerEl.style.pointerEvents = 'auto';
            markerEl.style.touchAction = 'none';

            try {
                // 拖动
                interact(markerEl).draggable({
                    inertia: false,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: 'parent',
                            endOnly: false
                        })
                    ],
                    listeners: {
                        move(event) {
                            // 完全自定义位移计算（覆盖 interact.js 的默认拖拽）
                            const target = event.target;
                            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                            // 获取当前旋转角度
                            const angle = parseFloat(target.getAttribute('data-angle')) || 0;
                            // 更新transform属性，确保旋转原点为左上角
                            target.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
                            target.style.transformOrigin = '50% 50%';
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);
                            
                            // 更新数据属性
                            target.setAttribute('data-width', target.offsetWidth);
                            target.setAttribute('data-height', target.offsetHeight);
                            
                            // 强制更新预览
                            const styleItem = $(target).closest('.style-item');
                            if (selectedStamp) {
                                updateStampPreview(styleItem, $(target));
                                // 同时更新激活标记的预览
                                const itemData = styleItemsData.get(styleItem[0]);
                                if (itemData && itemData.activeMarker.hasClass('selected')) {
                                    updateStampPreview(styleItem, itemData.activeMarker);
                                }
                            }
                        }
                    }
                });

                // 旋转功能(按住Shift键拖拽实现旋转)
                interact(markerEl).gesturable({
                    listeners: {
                        start(event) {
                            const target = event.target;
                            // 添加旋转角度显示元素
                            if (!$(target).find('.rotate-angle').length) {
                                $(target).append('<div class="rotate-angle">0°</div>');
                            }
                            // 添加旋转状态类
                            $(target).addClass('rotating');
                            // 保存初始旋转角度
                            target.setAttribute('data-angle', 
                                parseFloat(target.getAttribute('data-angle')) || 0);
                        },
                        move(event) {
                            const target = event.target;
                            const angle = (parseFloat(target.getAttribute('data-angle')) || 0) + event.da;
                            
                            // 更新旋转角度
                            target.setAttribute('data-angle', angle);
                            target.style.transform = 
                                `translate(${target.getAttribute('data-x') || 0}px, ${target.getAttribute('data-y') || 0}px) 
                                 rotate(${angle}deg)`;
                            
                            // 更新角度显示
                            $(target).find('.rotate-angle').text(`${Math.round(angle)}°`);
                            
                            // 更新预览
                            const styleItem = $(target).closest('.style-item');
                            const itemData = styleItemsData.get(styleItem[0]);
                            if (selectedStamp && $(target).hasClass('selected')) {
                                updateStampPreview(styleItem, $(target));
                            }
                        },
                        end(event) {
                            // 移除旋转状态类
                            $(event.target).removeClass('rotating');
                        }
                    }
                });

                //缩放(以左上角为原点，严格保持比例)
                interact(markerEl).resizable({
                    edges: { left: false, right: true, bottom: true, top: false },
                    preserveAspectRatio: true,
                    inertia: false,
                    modifiers: [
                        interact.modifiers.restrictSize({
                            min: { width: 30, height: 30 }
                        }),
                        interact.modifiers.aspectRatio({
                            ratio: 'preserve',
                            equalDelta: true // 强制保持比例
                        })
                    ],
                    listeners: {
                        start(event) {
                            const target = event.target;
                            // 保存初始位置和原始尺寸
                            target.style.width = `${target.offsetWidth}px`;
                            target.style.height = `${target.offsetHeight}px`;

                        },
                        move(event) {
                            const target = event.target;
                            const aspectRatio = parseFloat(target.style.width) / parseFloat(target.style.height);
                            // 根据拖动方向保持比例
                            let width, height;
                            if (event.edges.right) {
                                width = event.rect.width;
                                height = width / aspectRatio;
                            } else if (event.edges.bottom) {
                                height = event.rect.height;
                                width = height * aspectRatio;
                            }

                            // 应用保持比例的尺寸
                            target.style.width = `${width}px`;
                            target.style.height = `${height}px`;
                            // 更新预览
                            const itemData = styleItemsData.get(styleItem[0]);
                            if (selectedStamp && marker.hasClass('selected')) {
                                updateStampPreview(styleItem, itemData.activeMarker);
                            }
                        }
                    }
                });

                // 点击选择标记
                marker.on('mousedown touchstart', function (e) {
                    e.stopPropagation();
                    const itemData = styleItemsData.get(styleItem[0]);
                    itemData.activeMarker = marker;
                    itemData.markers.removeClass('selected');
                    marker.addClass('selected');

                    if (selectedStamp) {
                        updateStampPreview(styleItem, marker);
                    }
                });

                console.log('位置标记交互初始化完成');
            } catch (error) {
                console.error('初始化交互失败:', error);
            }
        });

        // 添加元素到DOM（添加到最前面）并添加新上传标记
        styleItem.append(img, deleteBtn);
        previewArea.prepend(styleItem);
    };

    // 印花图片上传回调
    const stampUploadCallback = (imageData, fileName) => {
        const previewArea = $('#stampPreview');
        // 创建印花图片元素并添加序列号
        const { stampItem, img, deleteBtn } = createStampElement(imageData);
        img.attr('alt', fileName.split('.')[0]);
        const sequenceNum = $('#stampPreview .stamp-item').length + 1;
        const sequenceTag = $(`<div class="sequence-number">${sequenceNum}</div>`);
        const fileNameTag = $(`<div class="file-name">${fileName.split('.')[0]}</div>`);
        stampItem.append(sequenceTag, fileNameTag);

        // 设置删除按钮事件
        deleteBtn.on('click', function (e) {
            e.stopPropagation();
            stampItem.remove();
            // 重新计算印花图片序列号
            $('#stampPreview .stamp-item').each(function (index) {
                $(this).find('.sequence-number').text(index + 1);
            });
        });

        // 点击印花图片选择位置
        stampItem.on('click', function (e) {
            const stampName = $(this).find('img').attr('alt')
            // 获取当前点击的印花图片
            const stampImgSrc = $(this).find('img').attr('src');

            // 更新所有款式图片中激活色块的图片
            $('#stylePreview .style-item').each(function () {
                const styleItem = $(this);
                const itemData = styleItemsData.get(styleItem[0]);

                if (itemData && itemData.activeMarker) {
                                                // 保存当前旋转角度
                                                const currentAngle = parseFloat(itemData.activeMarker.attr('data-angle')) || 0;
                                                // 更新激活色块中的图片
                                                itemData.activeMarker.find('img').attr('src', stampImgSrc);
                                                // 恢复旋转角度
                                                itemData.activeMarker.attr('data-angle', currentAngle);
                                                // 更新预览
                                                updateStampPreview(styleItem, itemData.activeMarker, stampName);
                }
            });
        });

        // 添加元素到DOM（添加到最前面）并添加视觉反馈
        stampItem.append(img, deleteBtn);
        previewArea.prepend(stampItem);
    };

    // 设置款式图片上传
    setupDragUpload(
        $('#styleUpload').parent('.upload-container'),
        '#styleUpload',
        'style',
        styleUploadCallback
    );

    // 设置印花图片上传
    setupDragUpload(
        $('#stampUpload').parent('.upload-container'),
        '#stampUpload',
        'stamp',
        stampUploadCallback
    );

    // 当前选中的印花图片
    let selectedStamp = null;

    // 印花点击事件 - 选择印花并更新所有款式图片中激活色块的图片
    $(document).on('click', '.stamp-item', function (e) {
        // 获取点击的印花图片
        const stampImg = $(this).find('img');
        selectedStamp = stampImg.attr('src');
        const stampName = stampImg.attr('alt') || '印花';

        // 更新所有款式图片中激活色块的图片
        $('#stylePreview .style-item').each(function () {
            const styleItem = $(this);
            const itemData = styleItemsData.get(styleItem[0]);

            if (itemData && itemData.activeMarker) {
                // 找到色块内的img
                let markerImg = itemData.activeMarker.find('img');
                if (markerImg.length === 0) {
                    // 如果没有img，添加一个
                    markerImg = $('<img>');
                    itemData.activeMarker.append(markerImg);
                }
                markerImg.attr('src', selectedStamp);
                markerImg.attr('alt', stampName);
            }
        });
    });


    // 显示下载蒙层
    function showDownloadOverlay(message, isError) {
        const overlay = document.querySelector('.download-overlay');
        const progressText = document.querySelector('.progress-text');
        const progressBar = document.querySelector('.progress-bar');

        progressText.textContent = message;
        if (isError) {
            progressBar.style.display = 'none';
        } else {
            progressBar.style.display = 'block';
            progressBar.style.width = '100%';
            progressBar.style.background = 'repeating-linear-gradient(45deg, #4CAF50, #4CAF50 10px, white 10px, white 20px)';
            progressBar.style.animation = 'progressAnimation 1s linear infinite';
        }
        overlay.classList.add('active');
    }

    // 隐藏下载蒙层
    function hideDownloadOverlay() {
        const overlay = document.querySelector('.download-overlay');
        overlay.classList.remove('active');
    }

    // 动画进度条
    function animateProgressBar(duration, progressCallback) {
        return new Promise((resolve) => {
            const progressBar = document.querySelector('.progress-bar');
            let start = null;
            
            function step(timestamp) {
                if (!start) start = timestamp;
                const progress = (timestamp - start) / duration;
                const percent = Math.min(progress * 100, 100);
                // progressBar.style.width = `${percent}%`;
                
                if (progressCallback) {
                    progressCallback(percent);
                }
                
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    resolve();
                }
            }
            
            window.requestAnimationFrame(step);
        });
    }

    // 删除全部款式按钮事件处理
    $('#clearAllStyles').on('click', function () {
        if (confirm('确定要删除所有款式图片吗？')) {
            $('#stylePreview').empty();
        }
    });

    // 删除全部印花按钮事件处理
    $('#clearAllStamps').on('click', function () {
        if (confirm('确定要删除所有印花图片吗？')) {
            $('#stampPreview').empty();
        }
    });

    // 合成按钮事件处理
    $('#mixbutton').on('click', async function () {
        $('.position-marker').hide();
        const styleItems = $('#stylePreview .style-item');
        const stampItems = $('#stampPreview .stamp-item');
        let successCount = 0;
        const zip = new JSZip();

        // 检查是否有款式和印花图片
        if (styleItems.length === 0 || stampItems.length === 0) {
            alert('请先上传款式和印花图片');
            $('.position-marker').show();
            return;
        }

        // 显示初始进度
        showDownloadOverlay('图片合成中...', false);
        // TODO: 在这里添加合成图标

        // 计算总任务数
        const totalTasks = styleItems.length * stampItems.length;
        let completedTasks = 0;

        // 使用for循环确保顺序执行
        for (let i = 0; i < styleItems.length; i++) {
            const styleItem = $(styleItems[i]);
            const styleImg = styleItem.find('img.styleBg')[0];

            try {
                // 等待款式图片加载完成
                if (!styleImg || !styleImg.complete || !styleImg.naturalWidth) {
                    await new Promise((resolve) => {
                        styleImg.onload = resolve;
                        styleImg.onerror = () => {
                            console.error('款式图片加载失败');
                            resolve();
                        };
                    });
                }

                // 检查款式图片是否有效
                if (!styleImg.naturalWidth) {
                    continue;
                }

                // 为每个印花图片创建合成任务
                for (let j = 0; j < stampItems.length; j++) {
                    const stampItem = $(stampItems[j]);
                    const stampImg = stampItem.find('img')[0];
                    const stampName = stampItem.find('img').attr('alt') || `印花${j + 1}`;

                    // 等待印花图片加载完成
                    if (!stampImg || !stampImg.complete || !stampImg.naturalWidth) {
                        await new Promise((resolve) => {
                            stampImg.onload = resolve;
                            stampImg.onerror = () => {
                                console.error('印花图片加载失败');
                                resolve();
                            };
                        });
                    }

                    // 检查印花图片是否有效
                    if (!stampImg.naturalWidth) {
                        continue;
                    }

                    // 创建独立Canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 执行合成
                    await new Promise((resolve) => {
                        setTimeout(async () => {
                            try {
                                const compositeResult = await compositeImages(styleItem, canvas, ctx, stampImg.src, stampName);
                                if (compositeResult) {
                                    successCount++;

                                    // 将合成结果添加到zip文件
                                    const styleName = styleItem.find('.styleBg').attr('alt') || '';
                                    const fileName = `${styleName.split('.')[0]}-${stampName.split('.')[0]}.jpg`;
                                    const blob = await fetch(compositeResult).then(r => r.blob());
                                    zip.file(fileName, blob);
                                }
                            } catch (e) {
                                console.error('合成失败:', e);
                            } finally {
                                // 更新完成的任务数
                                completedTasks++;
                                // 计算并更新进度 (0-50%为合成阶段)
                                const progress = Math.floor((completedTasks / totalTasks) * 50);
                                const progressBar = document.querySelector('.progress-bar');
                                // progressBar.style.width = `${progress}%`;
                                // 释放资源
                                canvas.width = 0;
                                canvas.height = 0;
                                resolve();
                            }
                        }, 200); // 添加延迟避免浏览器阻塞
                    });
                }
            } catch (e) {
                console.error('处理款式图片时出错:', e);
            }
        }

        // 显示合成结果统计
        $('.position-marker').show();
        if (successCount > 0) {
            try {
                // 更新进度文本
                const progressText = document.querySelector('.progress-text');
                // 生成zip文件
                progressText.textContent = '打包完成，已自动下载';
                const content = await zip.generateAsync({ type: 'blob' });
                
                // 自动下载
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = '图片合成.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // 2秒后隐藏进度条
                setTimeout(hideDownloadOverlay, 1000);
            } catch (e) {
                console.error('创建压缩包失败:', e);
                showDownloadOverlay('创建压缩包失败', true);
                setTimeout(hideDownloadOverlay, 1000);
            }
        } else {
            alert('合成失败，请检查图片和设置');
            hideDownloadOverlay();
        }
    });

    // 使用全局缩放系数的合成函数
    async function compositeImages(styleItem, canvas, ctx, stampImgSrc, stampName) {
        const styleImg = styleItem.find('img.styleBg')[0];
        // 使用图片自然尺寸设置Canvas
        const canvasWidth = styleImg.naturalWidth;
        const canvasHeight = styleImg.naturalHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 绘制基础款式图片
        ctx.drawImage(styleImg, 0, 0, canvasWidth, canvasHeight);

        // 应用蒙版（将蒙版区域设为透明，印花不可见）
        const maskImage = styleItem.data('maskImage');
        let maskData = null;
        if (maskImage) {
            const maskImg = new Image();
            maskImg.src = maskImage;
            await new Promise((resolve) => {
                maskImg.onload = resolve;
                maskImg.onerror = resolve;
            });
            // 创建maskCanvas
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvasWidth;
            maskCanvas.height = canvasHeight;
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx.drawImage(maskImg, 0, 0, canvasWidth, canvasHeight);
            maskData = maskCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            // 保持底图可见（原逻辑）
            const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            for (let i = 0; i < maskData.data.length; i += 4) {
                if (maskData.data[i + 3] > 0) {
                    imageData.data[i + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        // 获取激活的位置标记
        const marker = styleItem.find('.position-marker.selected');
        if (!marker.length) {
            console.error('未找到激活的位置标记');
            return false;
        }

        // 从marker的数据属性获取位置和尺寸
        const x = parseFloat(marker.attr('data-x')) || 0;
        const y = parseFloat(marker.attr('data-y')) || 0;
        const width = parseFloat(marker.attr('data-width')) || 0;
        const height = parseFloat(marker.attr('data-height')) || 0;

        // 创建临时图片元素用于加载印花
        const stampImg = new Image();
        stampImg.crossOrigin = 'Anonymous';
        stampImg.src = stampImgSrc;

        // 等待印花图片加载
        await new Promise((resolve) => {
            stampImg.onload = resolve;
            stampImg.onerror = () => {
                console.error('印花图片加载失败');
                resolve();
            };
        });

        // 获取印花图片原始比例
        const naturalWidth = stampImg.naturalWidth;
        const naturalHeight = stampImg.naturalHeight;
        const aspectRatio = naturalWidth / naturalHeight;

        // 计算保持比例的尺寸
        let keepRatioWidth = width;
        let keepRatioHeight = width / aspectRatio;

        // 如果按宽度计算的高度超过容器高度，则按高度计算
        if (keepRatioHeight > height) {
            keepRatioHeight = height;
            keepRatioWidth = height * aspectRatio;
        }

        // 应用全局缩放系数
        // 修正：marker的x/y是相对于款式图片的 offsetLeft/offsetTop，但 canvas 是自然尺寸，需按比例缩放
        // 预览图用 getBoundingClientRect 计算 left/top，合成时应用同样的缩放
        // 这里 globalScaleFactor 已经是自然宽度/显示宽度，直接用 x/y * globalScaleFactor 即可
        const scaledX = x * globalScaleFactor;
        const scaledY = y * globalScaleFactor;
        const scaledWidth = keepRatioWidth * globalScaleFactor;
        const scaledHeight = keepRatioHeight * globalScaleFactor;

        // 保存当前Canvas状态
        ctx.save();

        try {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 只旋转印花，不旋转蒙版
            // 创建临时canvas用于印花绘制（带旋转/缩放/位移）
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.save();
            // 修正：旋转原点统一为中心点，与预览一致
            const angle = parseFloat(marker.attr('data-angle')) || 0;
            if (angle) {
                // 计算中心点坐标（考虑缩放系数）
                const centerX = (x + width/2) * globalScaleFactor;
                const centerY = (y + height/2) * globalScaleFactor;
                tempCtx.translate(centerX, centerY);
                tempCtx.rotate(angle * Math.PI / 180);
                tempCtx.translate(-centerX, -centerY);
            }
            // 修正：印花绘制位置和尺寸与预览一致
            tempCtx.drawImage(
                stampImg,
                0, 0, naturalWidth, naturalHeight,
                scaledX, scaledY, scaledWidth, scaledHeight
            );
            tempCtx.restore();

            if (maskImage && maskData) {
                // 获取印花像素
                const stampData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
                // 将mask区域设为透明（蒙版不旋转/缩放/位移，直接用原始maskData）
                for (let i = 0; i < maskData.data.length; i += 4) {
                    if (maskData.data[i + 3] > 0) {
                        stampData.data[i + 3] = 0;
                    }
                }
                tempCtx.putImageData(stampData, 0, 0);
            }
            // 绘制到主canvas
            ctx.drawImage(tempCanvas, 0, 0);
        } catch (e) {
            console.error('绘制印花时出错:', e);
            return false;
        } finally {
            ctx.restore();
        }

        try {
            let imageData = canvas.toDataURL('image/jpeg', 0.7);
            // 生成包含印花名称的文件名（印花名+款式名）
            const styleName = styleItem.find('.styleBg').attr('alt') || '';
            const fileName = `${styleName.split('.')[0]}${stampName.split('.')[0]}`;

            // 返回图片数据URL，不直接触发下载
            return imageData;
        } catch (e) {
            console.error('生成图片数据失败:', e);
            return false;
        }
    }
});