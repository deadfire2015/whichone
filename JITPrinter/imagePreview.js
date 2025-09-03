/**
 * 图片悬停预览功能模块
 * 独立处理表格中图片的悬停预览功能
 */
// 防止类重复声明
if (typeof window !== 'undefined' && !window.ImagePreviewManager) {
    window.ImagePreviewManager = class ImagePreviewManager {
        constructor() {
            this.previewContainer = null;
            this.setupPreviewContainer();
        }

    /**
     * 创建预览容器元素
     */
    setupPreviewContainer() {
        // 检查预览容器是否已存在
        this.previewContainer = $('#imagePreview')[0];
        if (!this.previewContainer) {
            // 创建预览容器
            $('body').append('<div id="imagePreview"></div>');
            this.previewContainer = $('#imagePreview')[0];
        }
    }

    /**
     * 为指定容器内的所有图片添加悬停预览效果
     * @param {string} containerSelector - 容器的CSS选择器
     */
    enableImagePreview(containerSelector = '') {
        // 确保预览容器已创建
        this.setupPreviewContainer();
        
        // 如果指定了容器，则仅为该容器内的图片添加效果
        // 否则为所有表格中的图片添加效果
        let imagesSelector = '#dataTable img, #skcSummary img, #patternSummary img';
        if (containerSelector) {
            imagesSelector = `${containerSelector} img`;
        }

        // 先移除所有现有图片的事件处理
        $(imagesSelector).off('mouseenter mouseleave mousemove');
        
        // 为图片添加新的事件处理
        $(imagesSelector).on({
            'mouseenter': (e) => {
                this.showPreview(e.target);
            },
            'mouseleave': () => {
                this.hidePreview();
            },
            'mousemove': (e) => {
                this.updatePreviewPosition(e);
            }
        });
    }

    /**
     * 显示图片预览
     * @param {HTMLImageElement} img - 要预览的图片元素
     */
    showPreview(img) {
        // 设置预览图片
        $(this.previewContainer).empty().append($('<img>').attr('src', img.src));

        // 显示预览容器并定位
        $(this.previewContainer).css('display', 'block');
        const rect = $(img)[0].getBoundingClientRect();
        $(this.previewContainer).css({
            'top': `${rect.bottom + window.scrollY + 10}px`,
            'left': `${rect.left + window.scrollX}px`
        });
    }

    /**
     * 隐藏图片预览
     */
    hidePreview() {
        $(this.previewContainer).css('display', 'none');
    }

    /**
     * 更新预览容器位置
     * @param {MouseEvent} e - 鼠标事件对象
     */
    updatePreviewPosition(e) {
        const rect = $(e.target)[0].getBoundingClientRect();
        $(this.previewContainer).css({
            'top': `${rect.bottom + window.scrollY + 10}px`,
            'left': `${rect.left + window.scrollX}px`
        });
    }
}

// 导出模块（如果需要）
if (typeof module !== 'undefined') {
    module.exports = ImagePreviewManager;
}
}

// 使用jQuery的ready方法确保在DOM加载完成后创建全局实例
$(document).ready(() => {
    window.imagePreviewManager = new window.ImagePreviewManager();
    window.imagePreviewManager.enableImagePreview();
});