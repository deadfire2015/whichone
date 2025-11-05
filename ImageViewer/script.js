class ImageSizeViewer {
    constructor() {
        this.images = []; // 存储所有图片数据
        this.currentFile = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.mainContent = document.getElementById('mainContent');
        this.imageList = document.getElementById('imageList');
        this.previewImage = document.getElementById('previewImage');
        this.loading = document.getElementById('loading');
        this.exportBtn = document.getElementById('exportBtn');
        this.toastContainer = document.getElementById('toastContainer');
        
        // 防抖计时器
        this.resizeTimer = null;
    }
    
    bindEvents() {
        // 拖拽事件 - 阻止默认行为
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleDragOver(e);
        });
        
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleDragLeave(e);
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleDrop(e);
        });
        
        // 点击事件
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 导出按钮事件
        this.exportBtn.addEventListener('click', () => this.exportToExcel());
        
        // 继续添加按钮事件
        this.continueAddBtn = document.getElementById('continueAddBtn');
        this.continueAddBtn.addEventListener('click', () => this.continueAdd());
        
        // 批量设置按钮事件
        this.batchSetBtn = document.getElementById('batchSetBtn');
        this.batchSetBtn.addEventListener('click', () => this.showBatchSetModal());
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        if (!this.dropZone.contains(e.relatedTarget)) {
            this.dropZone.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFiles(files);
            
            // 处理完文件后，隐藏拖拽层并重置样式
            this.dropZone.style.display = 'none';
            this.dropZone.style.position = '';
            this.dropZone.style.top = '';
            this.dropZone.style.left = '';
            this.dropZone.style.width = '';
            this.dropZone.style.height = '';
            this.dropZone.style.zIndex = '';
            this.dropZone.style.backgroundColor = '';
            this.dropZone.style.backdropFilter = '';
            
            // 移除关闭按钮
            const closeBtn = this.dropZone.querySelector('button');
            if (closeBtn) {
                closeBtn.remove();
            }
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFiles(files);
        }
    }
    
    async processFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('请选择图片文件！');
            return;
        }
        
        // 检查重复文件
        const existingFileNames = this.images.map(img => img.name);
        const duplicateFiles = imageFiles.filter(file => existingFileNames.includes(file.name));
        const validFiles = imageFiles.filter(file => !existingFileNames.includes(file.name));
        
        // 如果有重复文件，提示用户
        if (duplicateFiles.length > 0) {
            const duplicateNames = duplicateFiles.map(file => file.name).join(', ');
            alert(`以下文件已存在，无法重复添加：${duplicateNames}`);
        }
        
        // 如果没有有效文件，直接返回
        if (validFiles.length === 0) {
            return;
        }
        
        this.showLoading();
        
        try {
            const newImages = [];
            for (const file of validFiles) {
                const imageData = await this.processSingleFile(file);
                newImages.push(imageData);
            }
            
            // 将新图片添加到列表最前面
            this.images.unshift(...newImages);
            
            this.hideLoading();
            this.showMainContent();
            
        } catch (error) {
            console.error('图片处理失败:', error);
            alert('部分图片处理失败，请重试！');
            this.hideLoading();
        }
    }
    
    async processSingleFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                
                // 在导入时检测印花编号是否包含非法字符
                const hasInvalidChars = /[\s\-_]/.test(fileNameWithoutExt);
                
                const imageData = {
                    id: Date.now() + Math.random(),
                    file: file,
                    url: imageUrl,
                    name: file.name,
                    originalWidth: img.naturalWidth,
                    originalHeight: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight,
                    printName: '', // 印花名称（每个图片一个）
                    printCode: fileNameWithoutExt, // 印花编号（基于文件名）
                    hasInvalidPrintCode: hasInvalidChars, // 标记是否包含非法字符
                    sizeGroups: [{
                        id: Date.now() + Math.random(),
                        customWidth: img.naturalWidth,
                        customHeight: img.naturalHeight,
                        sizeType: '前幅居中' // 默认尺寸类型
                    }]
                };
                
                resolve(imageData);
            };
            
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
    
    showMainContent() {
        const tableBody = this.imageList;
        
        // 清空表格
        tableBody.innerHTML = '';
        
        // 为每个图片创建表格行（可能有多行）
        this.images.forEach((image, index) => {
            const rows = this.createImageListItem(image, index);
            rows.forEach(row => {
                tableBody.appendChild(row);
            });
        });
        
        // 显示主内容区域
        this.mainContent.style.display = 'flex';
        this.dropZone.style.display = 'none';
        
        // 如果有图片，默认显示第一个印花的预览
        if (this.images.length > 0) {
            this.showImagePreview(this.images[0]);
        }
        
        // 初始化验证所有现有数据
        this.initializeValidation();
    }
    
    createImageListItem(image, index) {
        const fileNameWithoutExt = image.name.replace(/\.[^/.]+$/, "");
        
        // 为每个尺寸组创建一行
        const rows = [];
        
        image.sizeGroups.forEach((sizeGroup, groupIndex) => {
            const row = document.createElement('tr');
            
            // 设置行的数据属性，用于验证时查找
            row.setAttribute('data-image-index', index);
            row.setAttribute('data-group-index', groupIndex);
            
            // 如果是第一组尺寸，显示图片和基本信息
            if (groupIndex === 0) {
                row.innerHTML = `
                    <td class="table-image-cell" rowspan="${image.sizeGroups.length}">
                        <img class="table-image-preview" src="${image.url}" alt="${image.name}">
                    </td>
                    <td class="table-print-code-cell" rowspan="${image.sizeGroups.length}">
                        <input type="text" class="table-print-code-input ${this.validatePrintCode(image.printCode || fileNameWithoutExt) ? '' : 'error'}" value="${image.printCode || fileNameWithoutExt}" placeholder="印花编号" data-index="${index}">
                    </td>
                    <td class="table-print-name-cell" rowspan="${image.sizeGroups.length}">
                        <input type="text" class="table-print-name-input" value="${image.printName || ''}" placeholder="印花名称" data-index="${index}">
                    </td>
                    <td class="table-position-cell">
                        <select class="table-position-select" data-index="${index}" data-group-index="${groupIndex}">
                            <option value="前幅居中" ${sizeGroup.sizeType === '前幅居中' ? 'selected' : ''}>前幅居中</option>
                            <option value="后幅居中" ${sizeGroup.sizeType === '后幅居中' ? 'selected' : ''}>后幅居中</option>
                            <option value="前胸" ${sizeGroup.sizeType === '前胸' ? 'selected' : ''}>前胸</option>
                            <option value="领口" ${sizeGroup.sizeType === '领口' ? 'selected' : ''}>领口</option>
                            <option value="袖口" ${sizeGroup.sizeType === '袖口' ? 'selected' : ''}>袖口</option>
                            <option value="裤脚" ${sizeGroup.sizeType === '裤脚' ? 'selected' : ''}>裤脚</option>
                            <option value="其他" ${sizeGroup.sizeType === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </td>
                    <td class="table-width-cell">
                        <input type="text" class="table-size-input width-input" value="${sizeGroup.customWidth.toFixed(2)}" data-index="${index}" data-group-index="${groupIndex}">
                    </td>
                    <td class="table-height-cell">
                        <input type="text" class="table-size-input height-input" value="${sizeGroup.customHeight.toFixed(2)}" data-index="${index}" data-group-index="${groupIndex}">
                    </td>
                    <td class="table-actions-cell">
                        <div class="table-action-buttons">
                            <button class="table-add-btn" data-index="${index}" data-tooltip="添加印花尺寸">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14"></path>
                                    <path d="M5 12h14"></path>
                                </svg>
                            </button>
                            <button class="table-delete-btn" data-index="${index}" data-tooltip="删除印花">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <path d="M10 11v6"></path>
                                    <path d="M14 11v6"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                // 其他尺寸组只显示尺寸相关列
                row.innerHTML = `
                    <td class="table-position-cell">
                        <select class="table-position-select" data-index="${index}" data-group-index="${groupIndex}">
                            <option value="前幅居中" ${sizeGroup.sizeType === '前幅居中' ? 'selected' : ''}>前幅居中</option>
                            <option value="后幅居中" ${sizeGroup.sizeType === '后幅居中' ? 'selected' : ''}>后幅居中</option>
                            <option value="前胸" ${sizeGroup.sizeType === '前胸' ? 'selected' : ''}>前胸</option>
                            <option value="领口" ${sizeGroup.sizeType === '领口' ? 'selected' : ''}>领口</option>
                            <option value="袖口" ${sizeGroup.sizeType === '袖口' ? 'selected' : ''}>袖口</option>
                            <option value="裤脚" ${sizeGroup.sizeType === '裤脚' ? 'selected' : ''}>裤脚</option>
                            <option value="其他" ${sizeGroup.sizeType === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </td>
                    <td class="table-width-cell">
                        <input type="text" class="table-size-input width-input" value="${sizeGroup.customWidth.toFixed(2)}" data-index="${index}" data-group-index="${groupIndex}">
                    </td>
                    <td class="table-height-cell">
                        <input type="text" class="table-size-input height-input" value="${sizeGroup.customHeight.toFixed(2)}" data-index="${index}" data-group-index="${groupIndex}">
                    </td>
                    <td class="table-actions-cell">
                        <div class="table-action-buttons">
                            <button class="table-remove-btn" data-index="${index}" data-group-index="${groupIndex}" data-tooltip="删除这组尺寸">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18"></path>
                                    <path d="M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
            }
            
            // 绑定事件
            this.bindRowEvents(row, image, index, groupIndex);
            
            rows.push(row);
        });
        
        return rows;
    }
    
    bindRowEvents(row, image, index, groupIndex) {
        // 绑定输入事件
        const widthInput = row.querySelector('.table-size-input.width-input');
        const heightInput = row.querySelector('.table-size-input.height-input');
        const printNameInput = row.querySelector('.table-print-name-input');
        const printCodeInput = row.querySelector('.table-print-code-input');
        const sizeTypeSelect = row.querySelector('.table-position-select');
        const addSizeBtn = row.querySelector('.table-add-btn');
        const deleteBtn = row.querySelector('.table-delete-btn');
        const removeBtn = row.querySelector('.table-remove-btn');
        
        // 绑定宽高输入事件（移除实时验证，只保留输入处理）
        if (widthInput) {
            widthInput.addEventListener('input', (e) => this.handleInlineWidthChange(e, index));
            widthInput.addEventListener('keypress', (e) => this.restrictInput(e));
        }
        
        if (heightInput) {
            heightInput.addEventListener('input', (e) => this.handleInlineHeightChange(e, index));
            heightInput.addEventListener('keypress', (e) => this.restrictInput(e));
        }
        
        // 绑定印花编号输入事件
        if (printCodeInput) {
            printCodeInput.addEventListener('input', (e) => this.handlePrintCodeChange(e, index));
            printCodeInput.addEventListener('keypress', (e) => this.restrictPrintCodeInput(e));
        }
        
        // 绑定印花名称输入事件
        if (printNameInput) {
            printNameInput.addEventListener('input', (e) => this.handlePrintNameChange(e, index));
        }
        
        // 绑定尺寸类型选择事件
        if (sizeTypeSelect) {
            sizeTypeSelect.addEventListener('change', (e) => {
                const image = this.images[index];
                const sizeGroup = image.sizeGroups[groupIndex];
                const newPosition = e.target.value;
                
                sizeGroup.sizeType = newPosition;
                
                // 实时验证并更新错误状态
                this.realtimeValidateAndUpdateErrorState(index, groupIndex);
            });
        }
        
        // 绑定添加尺寸组按钮事件
        if (addSizeBtn) {
            addSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addSizeGroup(index);
            });
        }
        
        // 绑定删除图片按钮事件
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteImage(index);
            });
        }
        
        // 绑定删除尺寸组按钮事件
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSizeGroup(index, groupIndex);
            });
        }
        
        // 点击预览（仅第一行）
        if (groupIndex === 0) {
            row.addEventListener('click', (e) => {
                if (!e.target.classList.contains('table-size-input') && 
                    !e.target.classList.contains('table-add-btn') && 
                    !e.target.classList.contains('table-delete-btn') &&
                    !e.target.classList.contains('table-remove-btn') &&
                    !e.target.classList.contains('table-position-select') &&
                    !e.target.classList.contains('table-print-name-input') &&
                    !e.target.classList.contains('table-print-code-input')) {
                    this.showImagePreview(image);
                }
            });
        }
    }
    
    handlePrintNameChange(e, index) {
        const newPrintName = e.target.value;
        const image = this.images[index];
        
        // 更新印花名称
        image.printName = newPrintName;
    }
    
    handlePrintCodeChange(e, index) {
        const newPrintCode = e.target.value;
        const image = this.images[index];
        
        // 验证印花编号内容
        const isValid = this.validatePrintCode(newPrintCode);
        
        // 更新错误状态
        if (isValid) {
            e.target.classList.remove('error');
            // 更新印花编号和错误标记
            image.printCode = newPrintCode;
            image.hasInvalidPrintCode = false;
        } else {
            e.target.classList.add('error');
            image.hasInvalidPrintCode = true;
        }
    }
    
    validatePrintCode(printCode) {
        // 检查是否包含空格、-、_等非法字符
        const invalidChars = /[\s\-_]/;
        return !invalidChars.test(printCode);
    }
    
    handleInlineWidthChange(e, index) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            const newWidth = parseFloat(e.target.value);
            if (newWidth && newWidth > 0) {
                const image = this.images[index];
                const groupIndex = parseInt(e.target.dataset.groupIndex);
                const sizeGroup = image.sizeGroups[groupIndex];
                const row = e.target.closest('tr');
                
                // 不限制数值，不进行实时验证
                const newHeight = parseFloat((newWidth / image.aspectRatio).toFixed(2));
                
                // 更新数据
                sizeGroup.customWidth = newWidth;
                sizeGroup.customHeight = newHeight;
                
                // 更新同组的高度输入框
                const heightInput = e.target.parentElement.parentElement.querySelector('.height-input');
                heightInput.value = newHeight.toFixed(2);
                
                // 如果当前正在预览这张图片，更新预览（使用第一组尺寸）
                if (this.currentFile && this.currentFile.id === image.id && groupIndex === 0) {
                    this.updateImageSize(newWidth, newHeight);
                }
                
                // 实时验证并更新错误状态
                this.realtimeValidateAndUpdateErrorState(index, groupIndex);
            }
        }, 300);
    }
    
    handleInlineHeightChange(e, index) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            const newHeight = parseFloat(e.target.value);
            if (newHeight && newHeight > 0) {
                const image = this.images[index];
                const groupIndex = parseInt(e.target.dataset.groupIndex);
                const sizeGroup = image.sizeGroups[groupIndex];
                const row = e.target.closest('tr');
                
                // 不限制数值，不进行实时验证
                const newWidth = parseFloat((newHeight * image.aspectRatio).toFixed(2));
                
                // 更新数据
                sizeGroup.customWidth = newWidth;
                sizeGroup.customHeight = newHeight;
                
                // 更新同组的宽度输入框
                const widthInput = e.target.parentElement.parentElement.querySelector('.width-input');
                widthInput.value = newWidth.toFixed(2);
                
                // 如果当前正在预览这张图片，更新预览（使用第一组尺寸）
                if (this.currentFile && this.currentFile.id === image.id && groupIndex === 0) {
                    this.updateImageSize(newWidth, newHeight);
                }
                
                // 实时验证并更新错误状态
                this.realtimeValidateAndUpdateErrorState(index, groupIndex);
            }
        }, 300);
    }
    
    showImagePreview(image) {
        this.currentFile = image;
        this.previewImage.src = image.url;
        
        // 移除图片的尺寸样式，让图片保持原始尺寸
        this.previewImage.style.width = '';
        this.previewImage.style.height = '';
        
        // 更新预览信息
        this.updatePreviewInfo(image);
    }
    
    updatePreviewInfo(image) {
        // 使用第一组尺寸显示预览信息
        const firstSizeGroup = image.sizeGroups[0];
        
        // 更新印花比例
        const ratioElement = document.getElementById('previewRatio');
        if (ratioElement) {
            ratioElement.textContent = image.aspectRatio.toFixed(4);
        }
        
        // 更新实际宽度
        const widthElement = document.getElementById('previewWidth');
        if (widthElement) {
            widthElement.textContent = `${firstSizeGroup.customWidth.toFixed(2)} cm`;
        }
        
        // 更新实际高度
        const heightElement = document.getElementById('previewHeight');
        if (heightElement) {
            heightElement.textContent = `${firstSizeGroup.customHeight.toFixed(2)} cm`;
        }
    }
    
    updateImageSize(width, height) {
        // 不再修改预览图片的尺寸，保持CSS设置的固定尺寸
        // this.previewImage.style.width = width + 'px';
        // this.previewImage.style.height = height + 'px';
        
        // 更新预览信息
        if (this.currentFile) {
            this.updatePreviewInfo(this.currentFile);
        }
    }
    
    updateInlineInputs(image) {
        const index = this.images.findIndex(img => img.id === image.id);
        if (index !== -1) {
            const widthInputs = document.querySelectorAll(`.width-input[data-index="${index}"]`);
            const heightInputs = document.querySelectorAll(`.height-input[data-index="${index}"]`);
            
            widthInputs.forEach(input => input.value = image.customWidth.toFixed(2));
            heightInputs.forEach(input => input.value = image.customHeight.toFixed(2));
        }
    }
    
    validateInput(input) {
        let value = input.value.trim();
        if (value === '') return;
        
        const regex = /^\d+(\.\d{0,2})?$/;
        if (!regex.test(value)) {
            input.value = input.dataset.lastValidValue || '';
            return;
        }
        
        const numValue = parseFloat(value);
        if (numValue.toString() !== value) {
            input.value = numValue.toFixed(2);
        }
        
        input.dataset.lastValidValue = input.value;
        
        if (numValue <= 0) {
            input.value = '0.01';
            input.dataset.lastValidValue = '0.01';
        }
    }
    
    validateInlineInput(input) {
        this.validateInput(input);
    }
    
    restrictInput(e) {
        const charCode = e.which ? e.which : e.keyCode;
        const value = e.target.value;
        
        if (charCode >= 48 && charCode <= 57) return true;
        if (charCode === 46 && value.indexOf('.') === -1) return true;
        if (charCode === 8 || charCode === 46 || charCode === 37 || charCode === 39 || charCode === 9) return true;
        
        e.preventDefault();
        return false;
    }
    
    restrictPrintCodeInput(e) {
        const charCode = e.which ? e.which : e.keyCode;
        
        // 允许字母、数字、退格、删除、方向键、Tab键
        if ((charCode >= 65 && charCode <= 90) || // A-Z
            (charCode >= 97 && charCode <= 122) || // a-z
            (charCode >= 48 && charCode <= 57) || // 0-9
            charCode === 8 || // 退格
            charCode === 46 || // 删除
            charCode === 37 || // 左箭头
            charCode === 39 || // 右箭头
            charCode === 9) {  // Tab
            return true;
        }
        
        // 阻止空格、-、_等非法字符
        e.preventDefault();
        return false;
    }
    
    showLoading() {
        this.loading.style.display = 'block';
        this.dropZone.style.display = 'none';
        this.mainContent.style.display = 'none';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    reset() {
        // 直接触发文件选择，覆盖当前图片
        this.fileInput.click();
    }
    
    showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    showSizeLimitWarning(message) {
        this.showToast(message, 'error');
    }
    
    // 检查印花位置是否重复
    checkPositionDuplicate(imageIndex, groupIndex, position) {
        const image = this.images[imageIndex];
        return image.sizeGroups.some((group, index) => 
            index !== groupIndex && group.sizeType === position
        );
    }
    
    // 更新输入框的错误状态
    updateInputErrorState(input, hasError) {
        console.log('updateInputErrorState called:', input, hasError);
        if (hasError) {
            input.classList.add('error');
            console.log('Added error class to:', input);
        } else {
            input.classList.remove('error');
            console.log('Removed error class from:', input);
        }
    }
    
    // 实时验证并更新错误状态
    realtimeValidateAndUpdateErrorState(imageIndex, groupIndex) {
        console.log('Real-time validation for image', imageIndex, 'group', groupIndex);
        
        // 执行验证
        const validation = this.validateSizeGroup(imageIndex, groupIndex);
        
        // 找到对应的行并更新错误状态
        const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
        console.log('Found rows for real-time validation:', rows.length);
        
        rows.forEach(row => {
            // 根据错误类型标注相应的元素
            const widthInput = row.querySelector('.table-size-input.width-input');
            const heightInput = row.querySelector('.table-size-input.height-input');
            const positionSelect = row.querySelector('.table-position-select');
            
            console.log('Found inputs for real-time validation:', {widthInput, heightInput, positionSelect});
            
            if (widthInput) this.updateInputErrorState(widthInput, validation.widthError);
            if (heightInput) this.updateInputErrorState(heightInput, validation.heightError);
            if (positionSelect) this.updateInputErrorState(positionSelect, validation.positionError);
        });
        
        console.log('Real-time validation completed:', validation);
    }
    
    // 验证单个尺寸组
    validateSizeGroup(imageIndex, groupIndex) {
        const image = this.images[imageIndex];
        const sizeGroup = image.sizeGroups[groupIndex];
        
        // 获取输入框的当前值（确保使用最新的用户输入）
        const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
        let currentWidth = sizeGroup.customWidth;
        let currentHeight = sizeGroup.customHeight;
        
        if (rows.length > 0) {
            const row = rows[0];
            const widthInput = row.querySelector('.table-size-input.width-input');
            const heightInput = row.querySelector('.table-size-input.height-input');
            
            if (widthInput && widthInput.value) {
                currentWidth = parseFloat(widthInput.value) || currentWidth;
            }
            if (heightInput && heightInput.value) {
                currentHeight = parseFloat(heightInput.value) || currentHeight;
            }
        }
        
        console.log('Validating size group:', {imageIndex, groupIndex, customWidth: currentWidth, customHeight: currentHeight, sizeType: sizeGroup.sizeType});
        
        let hasError = false;
        let errorMessage = '';
        let widthError = false;
        let heightError = false;
        let positionError = false;
        
        // 检查宽度是否超过40
        if (currentWidth > 40) {
            hasError = true;
            widthError = true;
            errorMessage = '宽度超过40cm';
            console.log('Width error detected:', currentWidth, '> 40');
        }
        
        // 检查高度是否超过60
        if (currentHeight > 60) {
            hasError = true;
            heightError = true;
            errorMessage = errorMessage ? errorMessage + '，高度超过60cm' : '高度超过60cm';
            console.log('Height error detected:', currentHeight, '> 60');
        }
        
        // 检查印花位置是否重复
        const positionDuplicate = this.checkPositionDuplicate(imageIndex, groupIndex, sizeGroup.sizeType);
        if (positionDuplicate) {
            hasError = true;
            positionError = true;
            errorMessage = errorMessage ? errorMessage + '，印花位置重复' : '印花位置重复';
            console.log('Position duplicate detected:', sizeGroup.sizeType);
        }
        
        console.log('Validation result:', {hasError, errorMessage, widthError, heightError, positionError});
        return { hasError, errorMessage, widthError, heightError, positionError };
    }
    
    // 初始化验证所有现有数据
    initializeValidation() {
        this.images.forEach((image, imageIndex) => {
            image.sizeGroups.forEach((group, groupIndex) => {
                const validation = this.validateSizeGroup(imageIndex, groupIndex);
                if (validation.hasError) {
                    // 找到对应的行并更新错误状态
                    const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
                    rows.forEach(row => {
                        // 根据错误类型只标注相应的元素
                        const widthInput = row.querySelector('.table-size-input.width-input');
                        const heightInput = row.querySelector('.table-size-input.height-input');
                        const positionSelect = row.querySelector('.table-position-select');
                        
                        if (widthInput) this.updateInputErrorState(widthInput, validation.widthError);
                        if (heightInput) this.updateInputErrorState(heightInput, validation.heightError);
                        if (positionSelect) this.updateInputErrorState(positionSelect, validation.positionError);
                    });
                }
            });
        });
    }
    
    deleteImage(index) {
        if (confirm('确定要删除这张图片吗？')) {
            this.images.splice(index, 1);
            this.showMainContent();
            
            // 如果删除的是当前预览的图片，清空预览
            if (this.currentFile && this.images.findIndex(img => img.id === this.currentFile.id) === -1) {
                this.currentFile = null;
            }
        }
    }
    
    removeSizeGroup(index, groupIndex) {
         const image = this.images[index];
         
         // 不能删除最后一组尺寸
         if (image.sizeGroups.length <= 1) {
             alert('每张图片至少需要保留一组尺寸！');
             return;
         }
         
         if (confirm('确定要删除这组尺寸吗？')) {
             image.sizeGroups.splice(groupIndex, 1);
             this.showMainContent();
         }
     }
    
    continueAdd() {
        // 检查是否已有文件
        if (this.images.length === 0) {
            alert('请先上传图片！');
            return;
        }
        
        // 直接触发文件选择对话框
        this.fileInput.click();
    }
    
    // 显示批量设置弹窗
    showBatchSetModal() {
        // 检查是否已有文件
        if (this.images.length === 0) {
            alert('请先上传图片！');
            return;
        }
        
        this.batchSetModal = document.getElementById('batchSetModal');
        this.batchSetClose = document.getElementById('batchSetClose');
        this.batchSetCancel = document.getElementById('batchSetCancel');
        this.batchSetConfirm = document.getElementById('batchSetConfirm');
        
        // 显示弹窗
        this.batchSetModal.style.display = 'flex';
        
        // 绑定事件
        this.batchSetClose.addEventListener('click', () => this.hideBatchSetModal());
        this.batchSetCancel.addEventListener('click', () => this.hideBatchSetModal());
        this.batchSetConfirm.addEventListener('click', () => this.applyBatchSettings());
        
        // 点击弹窗外部关闭
        this.batchSetModal.addEventListener('click', (e) => {
            if (e.target === this.batchSetModal) {
                this.hideBatchSetModal();
            }
        });
    }
    
    // 隐藏批量设置弹窗
    hideBatchSetModal() {
        if (this.batchSetModal) {
            this.batchSetModal.style.display = 'none';
        }
    }
    
    // 应用批量设置
    applyBatchSettings() {
        const position = document.getElementById('batchPosition').value;
        const dimensionType = document.querySelector('input[name="dimensionType"]:checked').value;
        const sizeValue = parseFloat(document.getElementById('batchSize').value);
        
        // 验证输入
        if (!sizeValue || sizeValue <= 0) {
            alert('请输入有效的尺寸值！');
            return;
        }
        
        // 批量设置尺寸
        this.batchSetDimensions(position, dimensionType, sizeValue);
        
        // 关闭弹窗
        this.hideBatchSetModal();
        
        // 显示成功提示
        this.showToast(`已成功为所有"${position}"部位设置${dimensionType === 'width' ? '宽度' : '高度'}为${sizeValue}cm`, 'success');
    }
    
    // 批量设置尺寸逻辑
    batchSetDimensions(position, dimensionType, sizeValue) {
        let updatedCount = 0;
        
        // 遍历所有图片
        this.images.forEach((image, imageIndex) => {
            // 遍历图片的所有尺寸组
            image.sizeGroups.forEach((sizeGroup, groupIndex) => {
                // 如果部位匹配
                if (sizeGroup.sizeType === position) {
                    if (dimensionType === 'width') {
                        // 设置宽度，根据比例计算高度
                        sizeGroup.customWidth = sizeValue;
                        sizeGroup.customHeight = sizeValue / image.aspectRatio;
                    } else {
                        // 设置高度，根据比例计算宽度
                        sizeGroup.customHeight = sizeValue;
                        sizeGroup.customWidth = sizeValue * image.aspectRatio;
                    }
                    updatedCount++;
                    
                    // 更新表格中的输入框值
                    this.updateTableInputs(imageIndex, groupIndex, sizeGroup.customWidth, sizeGroup.customHeight);
                    
                    // 实时验证并更新错误状态
                    this.realtimeValidateAndUpdateErrorState(imageIndex, groupIndex);
                }
            });
        });
        
        console.log(`批量设置完成，共更新了${updatedCount}个部位的尺寸`);
    }
    
    // 更新表格输入框值
    updateTableInputs(imageIndex, groupIndex, width, height) {
        const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
        
        rows.forEach(row => {
            const widthInput = row.querySelector('.width-input');
            const heightInput = row.querySelector('.height-input');
            
            if (widthInput) {
                widthInput.value = width.toFixed(2);
            }
            if (heightInput) {
                heightInput.value = height.toFixed(2);
            }
        });
    }
    
    exportToExcel() {
        if (this.images.length === 0) {
            alert('请先上传图片！');
            return;
        }
        
        // 在验证之前，强制更新所有输入框的值到sizeGroup对象
        this.images.forEach((image, imageIndex) => {
            image.sizeGroups.forEach((sizeGroup, groupIndex) => {
                const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
                if (rows.length > 0) {
                    const row = rows[0];
                    const widthInput = row.querySelector('.table-size-input.width-input');
                    const heightInput = row.querySelector('.table-size-input.height-input');
                    
                    if (widthInput && widthInput.value) {
                        sizeGroup.customWidth = parseFloat(widthInput.value) || sizeGroup.customWidth;
                    }
                    if (heightInput && heightInput.value) {
                        sizeGroup.customHeight = parseFloat(heightInput.value) || sizeGroup.customHeight;
                    }
                }
            });
        });
        
        // 在导出时进行位置和尺寸检测
        let hasErrors = false;
        let hasInvalidPrintCodes = false;
        
        // 检查所有尺寸组
        this.images.forEach((image, imageIndex) => {
            // 检查印花编号是否包含非法字符
            if (image.hasInvalidPrintCode) {
                hasInvalidPrintCodes = true;
                console.log('Invalid print code found for image', imageIndex, ':', image.printCode);
            }
            
            image.sizeGroups.forEach((sizeGroup, groupIndex) => {
                const validation = this.validateSizeGroup(imageIndex, groupIndex);
                
                if (validation.hasError) {
                    hasErrors = true;
                    console.log('Validation error found for image', imageIndex, 'group', groupIndex, ':', validation);
                }
                
                // 无论是否有错误，都更新错误状态（确保正确显示/隐藏红色边框）
                const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${groupIndex}"]`);
                console.log('Found rows:', rows.length);
                rows.forEach(row => {
                    // 根据错误类型标注相应的元素
                    const widthInput = row.querySelector('.table-size-input.width-input');
                    const heightInput = row.querySelector('.table-size-input.height-input');
                    const positionSelect = row.querySelector('.table-position-select');
                    
                    console.log('Found inputs:', {widthInput, heightInput, positionSelect});
                    
                    if (widthInput) this.updateInputErrorState(widthInput, validation.widthError);
                    if (heightInput) this.updateInputErrorState(heightInput, validation.heightError);
                    if (positionSelect) this.updateInputErrorState(positionSelect, validation.positionError);
                });
            });
        });
        
        if (hasInvalidPrintCodes) {
            // 如果有印花编号包含非法字符，不让下载，弹出toast提示
            this.showToast('印花编号包含非法字符（空格、-、_等），请修正后再下载', 'error');
            return; // 直接返回，不继续导出
        }
        
        if (hasErrors) {
            // 如果有检测不合格，不让下载，弹出toast提示
            this.showToast('印花位置重复,宽最大40,高最大60', 'error');
            return; // 直接返回，不继续导出
        }
        
        // 使用SheetJS创建Excel工作簿
        const wb = XLSX.utils.book_new();
        
        // 准备数据数组
        const data = [];
        
        // 第一行表头
        data.push(['印花图片', '印花编号', '印花名称', '', '', '', '']);
        
        // 第二行表头：前三列与第一行合并，后四列为尺寸信息的具体列
        data.push(['', '', '', '印花位置', '宽(cm)', '高(cm)', '印花面积(m²)']);
        
        // 填充数据
        this.images.forEach(image => {
            const sizeCount = image.sizeGroups.length;
            const imageName = image.name;
            const printCode = image.printCode || image.name.replace(/\.\w+$/, '') || '';
            const printName = image.printName || '';
            
            // 填充每个尺寸组的数据
            image.sizeGroups.forEach((sizeGroup, groupIndex) => {
                // 计算印花面积（高*宽/10000）
                const area = (sizeGroup.customHeight * sizeGroup.customWidth / 10000).toFixed(4);
                
                // 对于第一行（groupIndex=0），填充所有值；对于其他行，前三列设为空（因为已合并）
                const rowData = groupIndex === 0 ? 
                    [imageName, printCode, printName, sizeGroup.sizeType, sizeGroup.customWidth.toFixed(2), sizeGroup.customHeight.toFixed(2), area] : 
                    ['', '', '', sizeGroup.sizeType, sizeGroup.customWidth.toFixed(2), sizeGroup.customHeight.toFixed(2), area];
                
                data.push(rowData);
            });
        });
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // 设置合并单元格
        const merges = [];
        
        // 表头合并：前三列（印花图片、印花编号、印花名称）的前两行合并
        merges.push({s: {r: 0, c: 0}, e: {r: 1, c: 0}}); // 印花图片列合并
        merges.push({s: {r: 0, c: 1}, e: {r: 1, c: 1}}); // 印花编号列合并
        merges.push({s: {r: 0, c: 2}, e: {r: 1, c: 2}}); // 印花名称列合并
        
        // 表头合并：尺寸信息列合并为一个单元格
        merges.push({s: {r: 0, c: 3}, e: {r: 0, c: 6}}); // 第一行的3-6列合并
        
        // 数据行合并
        let rowIndex = 2; // 从第三行开始（跳过表头两行）
        
        this.images.forEach(image => {
            const sizeCount = image.sizeGroups.length;
            
            // 如果有多个尺寸组，需要合并前3列
            if (sizeCount > 1) {
                merges.push({s: {r: rowIndex, c: 0}, e: {r: rowIndex + sizeCount - 1, c: 0}}); // 图片列合并
                merges.push({s: {r: rowIndex, c: 1}, e: {r: rowIndex + sizeCount - 1, c: 1}}); // 编号列合并
                merges.push({s: {r: rowIndex, c: 2}, e: {r: rowIndex + sizeCount - 1, c: 2}}); // 名称列合并
            }
            
            rowIndex += sizeCount;
        });
        
        // 设置工作表的合并单元格
        ws['!merges'] = merges;
        
        // 设置列宽
        ws['!cols'] = [
            {wch: 20}, // 印花图片
            {wch: 15}, // 印花编号
            {wch: 15}, // 印花名称
            {wch: 12}, // 印花位置
            {wch: 10}, // 宽(cm)
            {wch: 10}, // 高(cm)
            {wch: 15}  // 印花面积(m²)
        ];
        
        // 设置表头样式
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 7; c++) {
                const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {font: {bold: true}, alignment: {vertical: 'center', horizontal: 'center'}};
                }
            }
        }
        
        // 设置数据行样式
        for (let r = 2; r < data.length; r++) {
            for (let c = 0; c < 7; c++) {
                const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {alignment: {vertical: 'center', horizontal: 'center'}};
                }
            }
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '图片尺寸数据');
        
        // 导出Excel文件
        const fileName = `图片尺寸数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
    
    // 添加尺寸组
    addSizeGroup(imageIndex) {
        const image = this.images[imageIndex];
        const lastSizeGroup = image.sizeGroups[image.sizeGroups.length - 1];
        
        // 创建新的尺寸组，基于最后一组尺寸
        const newSizeGroup = {
            id: Date.now() + Math.random(),
            customWidth: lastSizeGroup.customWidth,
            customHeight: lastSizeGroup.customHeight,
            sizeType: '其他', // 新增尺寸组默认类型为"其他"
            printName: '' // 新增印花名称字段
        };
        
        image.sizeGroups.push(newSizeGroup);
        
        // 重新渲染图片列表项
        this.showMainContent();
        
        // 验证新添加的尺寸组
        const newGroupIndex = image.sizeGroups.length - 1;
        const validation = this.validateSizeGroup(imageIndex, newGroupIndex);
        if (validation.hasError) {
            // 找到对应的行并更新错误状态
            const rows = document.querySelectorAll(`tr[data-image-index="${imageIndex}"][data-group-index="${newGroupIndex}"]`);
            rows.forEach(row => {
                // 更新输入框的错误状态
                const widthInput = row.querySelector('.table-size-input.width-input');
                const heightInput = row.querySelector('.table-size-input.height-input');
                const positionSelect = row.querySelector('.table-position-select');
                
                if (widthInput) this.updateInputErrorState(widthInput, validation.widthError);
                if (heightInput) this.updateInputErrorState(heightInput, validation.heightError);
                if (positionSelect) this.updateInputErrorState(positionSelect, validation.positionError);
            });
            
            // 显示错误提示
            this.showToast(validation.errorMessage, 'error');
        }
    }
    
    // 删除尺寸组
    removeSizeGroup(imageIndex, groupIndex) {
        const image = this.images[imageIndex];
        
        // 不能删除第一组尺寸
        if (groupIndex === 0) {
            return;
        }
        
        image.sizeGroups.splice(groupIndex, 1);
        
        // 重新渲染图片列表项
        this.showMainContent();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new ImageSizeViewer();
    
    // 获取内联重置按钮并添加事件
    const resetBtnInline = document.getElementById('resetBtnInline');
    if (resetBtnInline) {
        resetBtnInline.addEventListener('click', () => {
            viewer.reset();
        });
    }
});

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const viewer = window.viewer;
        if (viewer && viewer.imageContainer.style.display !== 'none') {
            viewer.reset();
        }
    }
});