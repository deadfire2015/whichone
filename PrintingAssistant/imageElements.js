/**
 * 图片元素创建模块
 * 包含款式和印花图片元素创建的相关功能
 */

/**
 * 创建款式图片元素
 * @param {string} imageData 图片数据URL
 * @returns {Object} 包含款式元素的集合
 */
export function createStyleElement(imageData) {
    const styleItem = $('<div class="style-item"></div>');
    const img = $(`<img class="styleBg" src="${imageData}">`);
    const deleteBtn = $('<div class="delete-stamp" data-tooltip="删除此图片">×</div>');
    const saveLocationBtn = $('<div class="save-location" data-tooltip="保存此印花参数到缓存"><img src="imgs/save.svg" class="icons">储存参数</div>');
    const writeLocationBtn = $('<div class="write-location" data-tooltip="读取缓存参数到此印花"><img src="imgs/layers2.svg" class="icons">应用参数</div>');
    const syncBtn = $('<div class="sync-stamp" data-tooltip="应用此印花参数至所有款式"><img src="imgs/layers3.svg" class="icons">应用所有</div>');
    const maskBtn = $('<div class="mask-edit" data-tooltip="可绘制印花不可见区域"><img src="imgs/mask.svg" class="icons">蒙版</div>');

    // 添加同步按钮点击处理

    saveLocationBtn.on('click', function () {
        const markers = styleItem.find('.position-marker');
        if (markers.length === 0) {
            alert('没有可保存的印花位置');
            return;
        }

        const allPositionData = [];

        markers.each(function () {
            const marker = $(this);
            const transform = marker.css('transform');
            let translateX = 0, translateY = 0;
            let angle = parseFloat(marker.attr('data-angle')) || 0; // 新增：获取旋转角度

            // 解析 transform 值
            if (transform && transform !== 'none') {
                if (transform.startsWith('matrix')) {
                    const matrix = transform.match(/matrix\((.+)\)/)[1].split(', ');
                    translateX = parseFloat(matrix[4]);
                    translateY = parseFloat(matrix[5]);
                } else if (transform.startsWith('translate')) {
                    const translate = transform.match(/translate\((.+)\)/)[1].split(', ');
                    translateX = parseFloat(translate[0]);
                    translateY = parseFloat(translate[1]);
                }
            }

            allPositionData.push({
                index: marker.attr('data-index'),
                active: marker.attr('data-active') === 'true',
                x: translateX,
                y: translateY,
                width: parseFloat(marker.css('width')),
                height: parseFloat(marker.css('height')),
                angle: angle // 新增：保存旋转参数
            });
        });

        // 检查是否已有数据
        const existingData = localStorage.getItem('stampPositionsData');
        if (existingData) {
            // 显示确认弹窗
            const userConfirmed = confirm('已存在保存的印花参数，是否覆盖？');
            if (!userConfirmed) {
                console.log('用户取消保存操作');
                return;
            }
        }

        try {
            // 保存所有印花位置数据
            localStorage.setItem('stampPositionsData', JSON.stringify(allPositionData));

            // 启用应用按钮
            writeLocationBtn.prop('disabled', false);

            // 显示保存成功提示
            console.log(`已保存 ${allPositionData.length} 个印花位置参数`);
        } catch (e) {
            console.error('保存印花位置数据失败:', e);
            alert('保存失败，请检查存储空间');
        }
    });
    writeLocationBtn.on('click', function () {
        const savedData = localStorage.getItem('stampPositionsData');
        if (!savedData) {
            console.log('没有找到保存的印花位置数据');
            return;
        }

        try {
            const positionsData = JSON.parse(savedData);
            if (!Array.isArray(positionsData)) {
                console.log('保存的数据格式不正确');
                return;
            }
            // 遍历所有印花色块
            styleItem.find('.position-marker').each(function () {
                const marker = $(this);
                const index = marker.attr('data-index');

                // 查找匹配的参数
                const matchedData = positionsData.find(item => item.index === index);
                if (matchedData) {
                    // 更新位置、尺寸和旋转
                    marker.css({
                        transform: `translate(${matchedData.x}px, ${matchedData.y}px) rotate(${matchedData.angle || 0}deg)`,
                        width: `${matchedData.width}px`,
                        height: `${matchedData.height}px`
                    }).attr({
                        'data-x': matchedData.x,
                        'data-y': matchedData.y,
                        'data-width': matchedData.width,
                        'data-height': matchedData.height,
                        'data-active': matchedData.active.toString(),
                        'data-angle': matchedData.angle || 0 // 新增：应用旋转数值
                    });
                }
            });

            console.log('印花位置参数已应用');
        } catch (e) {
            console.log('解析印花位置数据失败:', e);
        }
    });
    syncBtn.on('click', function () {

        // 获取当前印花位置
        const marker = styleItem.find('.position-marker[data-active="true"]');
        if (marker.length) {
            // 1. 获取 transform 的 translate 值和旋转角度
            const transform = marker.css('transform');
            let translateX = 0, translateY = 0;
            let angle = parseFloat(marker.attr('data-angle')) || 0;

            // 解析 matrix 或 translate 格式
            if (transform && transform !== 'none') {
                // 情况1：matrix(a, b, c, d, tx, ty)
                if (transform.startsWith('matrix')) {
                    const matrix = transform.match(/matrix\((.+)\)/)[1].split(', ');
                    translateX = parseFloat(matrix[4]); // 第5个值是 tx (X位移)
                    translateY = parseFloat(matrix[5]); // 第6个值是 ty (Y位移)
                }
                // 情况2：translate(tx, ty)
                else if (transform.startsWith('translate')) {
                    const translate = transform.match(/translate\((.+)\)/)[1].split(', ');
                    translateX = parseFloat(translate[0]);
                    translateY = parseFloat(translate[1]);
                }
            }
            // 2. 赋值给全局变量
            window.globalStampPosition.x = translateX;
            window.globalStampPosition.y = translateY;
            window.globalStampPosition.width = parseFloat(marker.css('width'));
            window.globalStampPosition.height = parseFloat(marker.css('height'));
            window.globalStampPosition.angle = angle; // 新增：同步旋转角度

            // 3. 更新底部显示
            // $('#stamp-position-display').text(
            //     `印花位置: 左${translateX}px 上${translateY}px 宽${window.globalStampPosition.width}px 高${window.globalStampPosition.height}px 角度${angle}°`
            // );
            // 4. 同步到所有款式（修正后的代码）
            $('.style-item').each(function () {
                const item = $(this);
                const targetMarker = item.find('.position-marker[data-active="true"]');

                if (targetMarker.length) {
                    targetMarker.css({
                        transform: `translate(${translateX}px, ${translateY}px) rotate(${angle}deg)`,
                        width: `${window.globalStampPosition.width}px`,
                        height: `${window.globalStampPosition.height}px`
                    }).attr({  // 同步 data-* 属性
                        'data-x': translateX,
                        'data-y': translateY,
                        'data-width': window.globalStampPosition.width,
                        'data-height': window.globalStampPosition.height,
                        'data-angle': angle // 新增：同步旋转角度
                    });
                }
            });


        }
    });
    // 创建按钮容器并添加按钮
    const buttonGroup = $('<div class="button-group"></div>');
    buttonGroup.append(saveLocationBtn, writeLocationBtn, syncBtn, maskBtn);
    styleItem.append(deleteBtn, buttonGroup);

    // 为款式图片添加位置标记功能
    styleItem.append('<div class="position-markers"></div>');

    // 添加蒙版预览canvas（始终存在，叠加在款式图上）
    const maskPreviewCanvas = $(`<canvas class="mask-preview-canvas" style="position:absolute;top:0;left:0;pointer-events:none;z-index:20;"></canvas>`);
    styleItem.append(maskPreviewCanvas);

    // 添加4个默认位置标记
    const positions = [
        { transform: 'translate(0, 0)', width: 160, height: 200, name: '默认' },
    ];

    positions.forEach((pos, index) => {
        const marker = $(`
            <div class="position-marker" data-index="${index}" 
                 data-active="${index === 0 ? 'true' : 'false'}"
                 style="tranform: translate(${pos.x}px, ${pos.y}px); 
                        width:${pos.width}px; height:${pos.height}px">
                <img class="stampReview" src="" alt="">
            </div>
        `);
        styleItem.find('.position-markers').append(marker);
    });

    // 蒙版弹层结构
    const maskModal = $(`
        <div class="mask-modal">
            <div class="mask-modal-content">
                <canvas class="mask-canvas" ></canvas>
                <div class="mask-controls">
                    <button class="mask-brush" data-tooltip="绘制遮罩蒙版"><img src="imgs/brush.svg" class="icons"></button>
                    <button class="mask-eraser" data-tooltip="擦除遮罩蒙版"><img src="imgs/eraser.svg" class="icons"></button>
                    <div class="mask-size-slider" data-tooltip="画笔大小" >
                        <input type="range" min="10" max="80" value="60" class="mask-size-input" style="width:100%;">
                        <span class="mask-size-label" ><span class="mask-size-value">60</span></span>
                    </div>
                    <button class="mask-confirm"  data-tooltip="保存遮罩蒙版"><img src="imgs/check.svg" class="icons"></button>
                    <button class="mask-cancel"  data-tooltip="不保存遮罩蒙版"><img src="imgs/x.svg" class="icons"></button>
                </div>
            </div>
        </div>
    `);
    $('body').append(maskModal);

    // 蒙版按钮事件
    maskBtn.on('click', function () {
        // 显示弹层
        maskModal.show();

        // 始终隐藏系统指针
        const imgEl = img[0];
        const canvas = maskModal.find('.mask-canvas')[0];
        $(canvas).css('cursor', 'none');

        // 默认选中画笔按钮
        const brushBtn = maskModal.find('.mask-brush');
        const eraserBtn = maskModal.find('.mask-eraser');
        brushBtn.addClass('active');
        eraserBtn.removeClass('active');

        // 初始化canvas尺寸为款式图自然尺寸
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;

        // 绘制款式图
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        // 如果已有蒙版，绘制到canvas
        if (styleItem.data('maskImage')) {
            const maskImg = new Image();
            maskImg.src = styleItem.data('maskImage');
            maskImg.onload = () => {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            };
        }

        // 画笔/橡皮擦逻辑
        let drawing = false, mode = 'brush';
        let lastX = 0, lastY = 0;
        const maskLayer = document.createElement('canvas');
        maskLayer.width = canvas.width;
        maskLayer.height = canvas.height;
        const maskCtx = maskLayer.getContext('2d');
        if (styleItem.data('maskImage')) {
            const maskImg = new Image();
            maskImg.src = styleItem.data('maskImage');
            maskImg.onload = () => {
                maskCtx.drawImage(maskImg, 0, 0, maskLayer.width, maskLayer.height);
            };
        }

        // 画笔大小
        let brushSize = 60;
        const sizeInput = maskModal.find('.mask-size-input');
        const sizeValue = maskModal.find('.mask-size-value');

        // 初始化滑块和数值
        sizeInput.val(brushSize);
        sizeValue.text(brushSize);

        sizeInput.off('input').on('input', function () {
            brushSize = parseInt(this.value, 10);
            sizeValue.text(brushSize);
            redraw();
        });

        // 鼠标圈圈预览
        let mouseX = null, mouseY = null;
        let showCursor = false;

        // 在canvas上绘制画笔圈圈（只绘制圈圈，不重绘其它内容）
        function drawCursorOnly() {
            // 只绘制圈圈，不清除其它内容
            ctx.save();
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, brushSize / 2, 0, 2 * Math.PI);
            ctx.strokeStyle = mode === 'brush' ? '#1976d2' : '#d32f2f';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.restore();
        }

        // redraw始终最后绘制圈圈
        function redraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 0.5;
            ctx.drawImage(maskLayer, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
            if (showCursor && mouseX !== null && mouseY !== null) {
                drawCursorOnly();
            }
        }

        // 画笔/橡皮擦绘制函数（必须在事件绑定前定义）
        function drawLine(x1, y1, x2, y2) {
            maskCtx.globalCompositeOperation = mode === 'brush' ? 'source-over' : 'destination-out';
            maskCtx.strokeStyle = 'rgba(0,0,0,1)';
            maskCtx.lineWidth = brushSize;
            maskCtx.lineCap = 'round';
            maskCtx.beginPath();
            maskCtx.moveTo(x1, y1);
            maskCtx.lineTo(x2, y2);
            maskCtx.stroke();
        }

        // 鼠标移动时只绘制圈圈，不重绘其它内容
        $(canvas).on('mousemove', function (e) {
            const rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
            showCursor = true;
            redraw(); // 只调用 redraw，不再直接 clearRect
            $(canvas).css('cursor', 'none');
        });
        $(canvas).on('mouseleave', function () {
            showCursor = false;
            redraw();
            $(canvas).css('cursor', 'none');
        });

        // 触摸设备支持
        $(canvas).on('touchmove', function (e) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.originalEvent.touches[0];
            mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
            mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
            showCursor = true;
            redraw(); // 只调用 redraw，不再直接 clearRect
            $(canvas).css('cursor', 'none');
        });
        $(canvas).on('touchend touchcancel', function () {
            showCursor = false;
            redraw();
            $(canvas).css('cursor', 'none');
        });

        // 拖动绘制时，绘制线条后再绘制圈圈
        $(canvas).on('mousedown touchstart', function (e) {
            drawing = true;
            const rect = canvas.getBoundingClientRect();
            const evt = e.type.startsWith('touch') ? e.originalEvent.touches[0] : e;
            lastX = (evt.clientX - rect.left) * (canvas.width / rect.width);
            lastY = (evt.clientY - rect.top) * (canvas.height / rect.height);
        });
        $(canvas).on('mousemove touchmove', function (e) {
            if (!drawing) return;
            const rect = canvas.getBoundingClientRect();
            const evt = e.type.startsWith('touch') ? e.originalEvent.touches[0] : e;
            const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
            const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
            drawLine(lastX, lastY, x, y);
            lastX = x; lastY = y;
            // 绘制线条后再绘制圈圈
            showCursor = true;
            mouseX = x;
            mouseY = y;
            redraw(); // 只调用 redraw
        });
        $(canvas).on('mouseup mouseleave touchend', function () {
            drawing = false;
        });

        maskModal.find('.mask-brush').off('click').on('click', function () {
            mode = 'brush';
            brushBtn.addClass('active');
            eraserBtn.removeClass('active');
        });
        maskModal.find('.mask-eraser').off('click').on('click', function () {
            mode = 'eraser';
            eraserBtn.addClass('active');
            brushBtn.removeClass('active');
        });
        maskModal.find('.mask-confirm').off('click').on('click', function () {
            // 保存maskLayer为图片
            styleItem.data('maskImage', maskLayer.toDataURL('image/png'));
            maskModal.hide();
            // 触发预览刷新
            styleItem.trigger('mask:updated');
        });
        maskModal.find('.mask-cancel').off('click').on('click', function () {
            maskModal.hide();
        });
    });

    // 蒙版预览刷新事件
    styleItem.on('mask:updated', function () {
        // 在款式预览图上应用蒙版
        const canvas = styleItem.find('.mask-preview-canvas')[0];
        const imgEl = img[0];
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (styleItem.data('maskImage')) {
            const maskImg = new Image();
            maskImg.src = styleItem.data('maskImage');
            maskImg.onload = () => {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            };
        }
    });

    // 初始化时自动刷新蒙版预览（首次创建款式图片时）
    setTimeout(() => {
        styleItem.trigger('mask:updated');
    }, 0);

    return {
        styleItem,
        img,
        deleteBtn
    };
}

/**
 * 创建印花图片元素
 * @param {string} imageData 图片数据URL
 * @returns {Object} 包含印花元素的集合
 */
export function createStampElement(imageData) {
    const stampItem = $('<div class="stamp-item"></div>');
    const img = $(`<img src="${imageData}">`);
    const deleteBtn = $('<div class="delete-stamp">×</div>');

    return {
        stampItem,
        img,
        deleteBtn
    };
}

/**
 * 处理图片上传
 * @param {Event} e 上传事件
 * @param {string} type 类型：'style'或'stamp'
 * @param {function} callback 回调函数
 */
export function handleUpload(e, type, callback) {
    const files = e.target.files || e.originalEvent.dataTransfer.files;
    const previewArea = $(`#${type}Preview`);

    Array.from(files)
        .filter(file => file.type.match('image.*'))
        .forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                callback(imageData, file.name);
            };
            reader.readAsDataURL(file);
        });
}

/**
 * 设置拖拽上传
 * @param {string} containerSelector 容器选择器
 * @param {string} inputSelector 文件输入选择器
 * @param {string} type 类型：'style'或'stamp'
 * @param {function} callback 回调函数
 */
export function setupDragUpload(containerSelector, inputSelector, type, callback) {
    const container = $(containerSelector);
    const input = $(inputSelector);

    container.on('dragover', function (e) {
        e.preventDefault();
        container.addClass('drag-over');
    });

    container.on('dragleave', function () {
        container.removeClass('drag-over');
    });

    container.on('drop', function (e) {
        e.preventDefault();
        container.removeClass('drag-over');
        input[0].files = e.originalEvent.dataTransfer.files;
        input.trigger('change');
    });

    // 监听文件变化
    input.on('change', function (e) {
        handleUpload(e, type, callback);
    });
}