class ImageSizeViewer {
    constructor() {
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.aspectRatio = 0;
        this.currentFile = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.imageContainer = document.getElementById('imageContainer');
        this.previewImage = document.getElementById('previewImage');
        this.loading = document.getElementById('loading');
        
        // 信息显示元素
        this.fileName = document.getElementById('fileName');
        this.originalSize = document.getElementById('originalSize');
        this.aspectRatioDisplay = document.getElementById('aspectRatio');
        
        // 输入控件
        this.widthInput = document.getElementById('widthInput');
        this.heightInput = document.getElementById('heightInput');
        
        // 防抖计时器
        this.resizeTimer = null;
    }
    
    bindEvents() {
        // 拖拽事件
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 点击事件
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 输入框事件
        this.widthInput.addEventListener('input', () => this.handleWidthChange());
        this.heightInput.addEventListener('input', () => this.handleHeightChange());
        
        // 输入验证
        this.widthInput.addEventListener('blur', () => this.validateInput(this.widthInput));
        this.heightInput.addEventListener('blur', () => this.validateInput(this.heightInput));
        
        // 按键限制，只允许数字和小数点
        this.widthInput.addEventListener('keypress', (e) => this.restrictInput(e));
        this.heightInput.addEventListener('keypress', (e) => this.restrictInput(e));
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
            this.processFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    async processFile(file) {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }
        
        this.currentFile = file;
        this.showLoading();
        
        try {
            const imageUrl = URL.createObjectURL(file);
            await this.loadImage(imageUrl);
            this.hideLoading();
            this.displayImageInfo();
            this.showImageContainer();
        } catch (error) {
            console.error('图片加载失败:', error);
            alert('图片加载失败，请重试！');
            this.hideLoading();
        }
    }
    
    loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.previewImage.src = imageUrl;
                this.originalWidth = img.naturalWidth;
                this.originalHeight = img.naturalHeight;
                this.aspectRatio = this.originalWidth / this.originalHeight;
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
    
    displayImageInfo() {
        // 显示文件名
        this.fileName.textContent = this.currentFile.name;
        
        // 显示原始尺寸
        this.originalSize.textContent = `${this.originalWidth.toFixed(2)} × ${this.originalHeight.toFixed(2)}`;
        
        // 显示宽高比
        this.aspectRatioDisplay.textContent = this.aspectRatio.toFixed(4);
        
        // 设置输入框初始值
        this.widthInput.value = this.originalWidth;
        this.heightInput.value = this.originalHeight;
        
        // 设置输入框最大限制
        this.widthInput.max = this.originalWidth * 10;
        this.heightInput.max = this.originalHeight * 10;
    }
    
    handleWidthChange() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            const newWidth = parseFloat(this.widthInput.value);
            if (newWidth && newWidth > 0) {
                const newHeight = parseFloat((newWidth / this.aspectRatio).toFixed(2));
                this.heightInput.value = newHeight;
                this.updateImageSize(newWidth, newHeight);
            }
        }, 300);
    }
    
    handleHeightChange() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            const newHeight = parseFloat(this.heightInput.value);
            if (newHeight && newHeight > 0) {
                const newWidth = parseFloat((newHeight * this.aspectRatio).toFixed(2));
                this.widthInput.value = newWidth;
                this.updateImageSize(newWidth, newHeight);
            }
        }, 300);
    }
    
    updateImageSize(width, height) {
        this.previewImage.style.width = width + 'px';
        this.previewImage.style.height = height + 'px';
    }
    
    validateInput(input) {
        let value = input.value.trim();
        
        // 如果为空，保持原值
        if (value === '') return;
        
        // 验证数字格式（最多两位小数）
        const regex = /^\d+(\.\d{0,2})?$/;
        if (!regex.test(value)) {
            // 格式不正确，恢复为上一个有效值或清空
            input.value = input.dataset.lastValidValue || '';
            return;
        }
        
        // 确保最多两位小数
        const numValue = parseFloat(value);
        if (numValue.toString() !== value) {
            input.value = numValue.toFixed(2);
        }
        
        // 保存当前有效值
        input.dataset.lastValidValue = input.value;
        
        // 确保最小值
        if (numValue <= 0) {
            input.value = '0.01';
            input.dataset.lastValidValue = '0.01';
        }
    }
    
    restrictInput(e) {
        const charCode = e.which ? e.which : e.keyCode;
        const value = e.target.value;
        
        // 允许数字
        if (charCode >= 48 && charCode <= 57) return true;
        
        // 允许小数点（只能有一个）
        if (charCode === 46) {
            if (value.indexOf('.') === -1) return true;
        }
        
        // 允许退格、删除、左右箭头、Tab键
        if (charCode === 8 || charCode === 46 || 
            charCode === 37 || charCode === 39 || 
            charCode === 9) return true;
        
        e.preventDefault();
        return false;
    }
    
    showLoading() {
        this.loading.style.display = 'block';
        this.dropZone.style.display = 'none';
        this.imageContainer.style.display = 'none';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    showImageContainer() {
        this.imageContainer.style.display = 'flex';
        this.dropZone.style.display = 'none';
    }
    
    reset() {
        this.previewImage.src = '';
        this.previewImage.style.width = '';
        this.previewImage.style.height = '';
        this.fileName.textContent = '-';
        this.originalSize.textContent = '-';
        this.aspectRatioDisplay.textContent = '-';
        this.widthInput.value = '';
        this.heightInput.value = '';
        
        this.imageContainer.style.display = 'none';
        this.dropZone.style.display = 'block';
        this.fileInput.value = '';
        
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.aspectRatio = 0;
        this.currentFile = null;
    }
}

// 添加重置功能
function addResetButton() {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重新选择图片';
    resetBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        transition: all 0.3s ease;
        z-index: 1000;
    `;
    
    resetBtn.addEventListener('mouseenter', () => {
        resetBtn.style.transform = 'translateY(-2px)';
        resetBtn.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
    });
    
    resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.transform = 'translateY(0)';
        resetBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
    });
    
    document.body.appendChild(resetBtn);
    return resetBtn;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new ImageSizeViewer();
    const resetBtn = addResetButton();
    
    resetBtn.addEventListener('click', () => {
        viewer.reset();
    });
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