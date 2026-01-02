// 等待DOM加载完成
 document.addEventListener('DOMContentLoaded', function() {
     // 元素选择
    const addRowBtn = document.getElementById('addRow');
    const deleteRowBtn = document.getElementById('deleteRow');
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const tableBody = document.getElementById('tableBody');
    const sizeChart = document.getElementById('sizeChart');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    const closePreview = document.getElementById('closePreview');

    // 主题切换功能
    function changeTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        
        // 更新主题按钮的选中状态
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeId);
        });
    }

    // 初始主题设置
    changeTheme('1');

    // 主题按钮事件监听
    themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            changeTheme(this.dataset.theme);
        });
    });

    // 预览功能 - 弹窗版
    function preview() {
        // 复制尺码表内容到预览弹窗
        previewContent.innerHTML = sizeChart.innerHTML;
        
        // 获取当前主题
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        // 为预览内容应用当前主题
        previewContent.setAttribute('data-theme', currentTheme);
        
        // 显示弹窗
        previewModal.classList.add('show');
    }

    // 关闭预览弹窗
    function closePreviewModal() {
        previewModal.classList.remove('show');
    }

    // 预览弹窗事件监听
    closePreview.addEventListener('click', closePreviewModal);
    
    // 点击弹窗外部关闭弹窗
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            closePreviewModal();
        }
    });
    
    // 按ESC键关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && previewModal.classList.contains('show')) {
            closePreviewModal();
        }
    });
 
     // 单位转换函数
     // cm转in：1cm = 0.393701in
     function cmToIn(cm) {
         if (!cm || isNaN(cm)) return '';
         return parseFloat(cm * 0.393701).toFixed(2);
     }
 
     // kg转lb：1kg = 2.20462lb
     function kgToLb(kg) {
         if (!kg) return '';
         
         // 处理范围值，如"6.5-10"
         if (kg.includes('-')) {
             const [min, max] = kg.split('-');
             return `${parseFloat(min * 2.20462).toFixed(2)}-${parseFloat(max * 2.20462).toFixed(2)}`;
         } else {
             // 处理单个值
             return parseFloat(kg * 2.20462).toFixed(2);
         }
     }
 
     // 自动计算函数
     function autoCalculate() {
         // 遍历所有行
         const rows = tableBody.querySelectorAll('.table-row');
         rows.forEach(row => {
             // 计算Chest (in)
             const chestCm = row.children[1].textContent;
             row.children[2].textContent = cmToIn(chestCm);

             // 计算Back length (in)
             const backLengthCm = row.children[3].textContent;
             row.children[4].textContent = cmToIn(backLengthCm);

             // 计算Neck (in)
             const neckCm = row.children[5].textContent;
             row.children[6].textContent = cmToIn(neckCm);

             // 计算Recommended Weight (lb)
             const weightKg = row.children[7].textContent;
             row.children[8].textContent = kgToLb(weightKg);
         });
     }
 
     // 增加行功能
     function addRow() {
         const newRow = document.createElement('div');
         newRow.className = 'table-row';
         newRow.innerHTML = `
             <div class="table-cell" contenteditable="true">New</div>
             <div class="table-cell cm-input" contenteditable="true" placeholder="输入尺寸"></div>
             <div class="table-cell in-output"></div>
             <div class="table-cell cm-input" contenteditable="true" placeholder="输入尺寸"></div>
             <div class="table-cell in-output"></div>
             <div class="table-cell cm-input" contenteditable="true" placeholder="输入尺寸"></div>
             <div class="table-cell in-output"></div>
             <div class="table-cell kg-input" contenteditable="true" placeholder="输入尺寸"></div>
             <div class="table-cell lb-output"></div>
         `;
         tableBody.appendChild(newRow);

         // 为新行添加事件监听
         addCellEventListeners(newRow);
     }
 
     // 删除行功能
     function deleteRow() {
         const rows = tableBody.querySelectorAll('.table-row');
         if (rows.length > 1) {
             rows[rows.length - 1].remove();
         } else {
             alert('至少需要保留一行数据！');
         }
     }
 
     // 为单元格添加事件监听
     function addCellEventListeners(row) {
         const editableCells = row.querySelectorAll('div[contenteditable="true"]');
         editableCells.forEach(cell => {
             cell.addEventListener('input', autoCalculate);
             cell.addEventListener('blur', autoCalculate);
         });
     }
 
     // 下载图片功能
    function downloadImage() {
        // 获取当前主题的背景色
        const style = getComputedStyle(document.documentElement);
        const bgColor = style.getPropertyValue('--bg-color').trim();
        
        html2canvas(sizeChart, {
            scale: 2, // 提高图片质量
            backgroundColor: bgColor,
            logging: false
        }).then(canvas => {
             // 将canvas转换为图片
             const imgData = canvas.toDataURL('image/png');
             
             // 创建下载链接
             const link = document.createElement('a');
             link.href = imgData;
             link.download = '尺码表.png';
             link.click();
         }).catch(error => {
             console.error('生成图片失败:', error);
             alert('生成图片失败，请重试！');
         });
     }
 
     // 为所有现有行添加事件监听
     const rows = tableBody.querySelectorAll('.table-row');
     rows.forEach(row => {
         addCellEventListeners(row);
     });

     // 初始计算一次
     autoCalculate();

     // 事件监听
     addRowBtn.addEventListener('click', addRow);
     deleteRowBtn.addEventListener('click', deleteRow);
     previewBtn.addEventListener('click', preview);
     downloadBtn.addEventListener('click', downloadImage);

     // 为所有可编辑单元格添加全局事件监听
     tableBody.addEventListener('input', function(e) {
         if (e.target.tagName === 'DIV' && e.target.isContentEditable) {
             autoCalculate();
         }
     });

     tableBody.addEventListener('blur', function(e) {
         if (e.target.tagName === 'DIV' && e.target.isContentEditable) {
             autoCalculate();
         }
     }, true);
 });