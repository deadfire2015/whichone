// 等待DOM加载完成
 document.addEventListener('DOMContentLoaded', function() {
     // 元素选择
    const addRowBtn = document.getElementById('addRow');
    const deleteRowBtn = document.getElementById('deleteRow');
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const tableBody = document.getElementById('tableBody');
    const petSizeChart = document.getElementById('petSizeChart');
    const phoneSizeChart = document.getElementById('phoneSizeChart');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    const closePreview = document.getElementById('closePreview');
    
    // 标签页相关元素
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 调试：检查标签页元素是否正确加载
    console.log('标签页按钮数量:', tabBtns.length);
    console.log('标签页内容数量:', tabContents.length);
    tabContents.forEach(content => {
        console.log('标签页内容ID:', content.id, '初始状态:', content.classList.contains('active'));
    });
    
    // 手机套图片上传相关元素
    const phoneImageUpload = document.getElementById('phone-image-upload');
    const uploadFilename = document.getElementById('upload-filename');
    const phoneImagePreview = document.getElementById('phone-image-preview');

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

    // 标签页切换功能
    function switchTab(tabName) {
        // 添加调试信息
        console.log('切换到标签页:', tabName);
        
        // 切换标签按钮状态
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // 切换标签内容显示
        tabContents.forEach(content => {
            console.log('标签页内容:', content.id, '是否激活:', content.id === tabName);
            content.classList.toggle('active', content.id === tabName);
        });
    }

    // 标签按钮事件监听
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // 预览功能 - 弹窗版
      function preview() {
          // 获取当前激活的标签页内容
          const activeTab = document.querySelector('.tab-content.active');
          let chartContent;
          
          if (activeTab.id === 'pet-tab') {
              chartContent = petSizeChart.innerHTML;
          } else if (activeTab.id === 'phone-tab') {
               // 先隐藏所有增加和删除手机品牌按钮
               const addMacBtns = phoneSizeChart.querySelectorAll('.add-mac-btn');
               const deleteMacBtns = phoneSizeChart.querySelectorAll('.delete-mac-btn');
               
               addMacBtns.forEach(btn => btn.style.display = 'none');
               deleteMacBtns.forEach(btn => btn.style.display = 'none');
               
               chartContent = phoneSizeChart.innerHTML;
               
               // 恢复按钮显示
               addMacBtns.forEach(btn => btn.style.display = 'inline-block');
               deleteMacBtns.forEach(btn => btn.style.display = 'inline-block');
           }
          
          // 复制尺码表内容到预览弹窗
          previewContent.innerHTML = chartContent;
          
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
         // 获取当前激活的标签页
         const activeTab = document.querySelector('.tab-content.active');
         
         if (activeTab.id === 'pet-tab') {
             // 宠物模板：增加表格行
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
         } else if (activeTab.id === 'phone-tab') {
             // 手机套模板：增加phone-info元素
             const phoneSizeChart = document.getElementById('phoneSizeChart');
             const newPhoneInfo = document.createElement('div');
             newPhoneInfo.className = 'phone-info';
             newPhoneInfo.innerHTML = `
                 <div class="left">
                     <div class="bagTitle" contenteditable="true">XL</div>
                     <div class="bagContent" contenteditable="true">15.5*8.6*2.2cm</div>
                     <div class="bagContent" contenteditable="true">6.1*3.3*0.8inch</div>
                 </div>
                 <div class="middle">
                     <div class="mac">
                         <div class="macNum" contenteditable="true">iphone</div>
                         <div class="bagContent" contenteditable="true">iPhone 16/16 Pro,15/15 Pro,14/14 Pro,
                             iPhone 13/13 Pro, 12/12 Pro,11 Pro, 16e</div>
                     </div>
                     <button class="add-mac-btn">增加手机品牌</button>
                     <button class="delete-mac-btn">删除手机品牌</button>
                 </div>
                 <div class="right">
                     <div class="upload-container">
                         <input type="file" accept="image/*" style="display: none;">
                         <button class="upload-btn add-image-btn">添加图片</button>
                         <span class="upload-filename">未选择文件</span>
                     </div>
                     <div class="image-preview"></div>
                 </div>
             `;
             
             // 在phoneSizeChart容器内添加新的phone-info，插入到footer之前
            const footer = phoneSizeChart.querySelector('.footer');
            if (footer) {
                phoneSizeChart.insertBefore(newPhoneInfo, footer);
            } else {
                phoneSizeChart.appendChild(newPhoneInfo);
            }
             
             // 为新phone-info添加图片上传事件监听
             const fileInput = newPhoneInfo.querySelector('input[type="file"]');
             const uploadBtn = newPhoneInfo.querySelector('.upload-btn');
             
             uploadBtn.addEventListener('click', function() {
                 fileInput.click();
             });
             
             fileInput.addEventListener('change', handleImageUpload);
             
             // 为新phone-info添加增加手机品牌按钮事件监听
             const addMacBtn = newPhoneInfo.querySelector('.add-mac-btn');
             addMacBtn.addEventListener('click', function() {
                 addMacElement(this.closest('.phone-info'));
             });
             
             // 为新phone-info添加删除手机品牌按钮事件监听
             const deleteMacBtn = newPhoneInfo.querySelector('.delete-mac-btn');
             deleteMacBtn.addEventListener('click', function() {
                 deleteMacElement(this.closest('.phone-info'));
             });
         }
     }
 
     // 增加手机品牌元素功能
     function addMacElement(phoneInfo) {
         const middleSection = phoneInfo.querySelector('.middle');
         const newMac = document.createElement('div');
         newMac.className = 'mac';
         newMac.innerHTML = `
             <div class="macNum" contenteditable="true">新品牌</div>
             <div class="bagContent" contenteditable="true">兼容型号列表</div>
         `;
         
         // 在增加手机品牌按钮之前插入新的mac元素
         const addMacBtn = middleSection.querySelector('.add-mac-btn');
         middleSection.insertBefore(newMac, addMacBtn);
     }

     // 删除手机品牌元素功能
     function deleteMacElement(phoneInfo) {
         const middleSection = phoneInfo.querySelector('.middle');
         const macElements = middleSection.querySelectorAll('.mac');
         
         // 至少保留一个手机品牌
         if (macElements.length > 1) {
             const lastMac = macElements[macElements.length - 1];
             middleSection.removeChild(lastMac);
         }
     }

     // 删除行功能
     function deleteRow() {
         // 获取当前激活的标签页
         const activeTab = document.querySelector('.tab-content.active');
         
         if (activeTab.id === 'pet-tab') {
             // 宠物模板：删除表格行
             const rows = tableBody.querySelectorAll('.table-row');
             if (rows.length > 1) {
                 rows[rows.length - 1].remove();
             } else {
                 alert('至少需要保留一行数据！');
             }
         } else if (activeTab.id === 'phone-tab') {
             // 手机套模板：删除phone-info元素
             const phoneInfos = document.querySelectorAll('.phone-info');
             if (phoneInfos.length > 1) {
                 phoneInfos[phoneInfos.length - 1].remove();
             } else {
                 alert('至少需要保留一个手机信息！');
             }
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
        
        // 获取当前激活的标签页内容
        const activeTab = document.querySelector('.tab-content.active');
        let chartElement;
        let filename;
        
        if (activeTab.id === 'pet-tab') {
            chartElement = petSizeChart;
            filename = '宠物尺码表.png';
        } else if (activeTab.id === 'phone-tab') {
            // 先隐藏所有增加和删除手机品牌按钮
            const addMacBtns = phoneSizeChart.querySelectorAll('.add-mac-btn');
            const deleteMacBtns = phoneSizeChart.querySelectorAll('.delete-mac-btn');
            
            addMacBtns.forEach(btn => btn.style.display = 'none');
            deleteMacBtns.forEach(btn => btn.style.display = 'none');
            
            chartElement = phoneSizeChart;
            filename = '手机套尺码表.png';
        }
        
        html2canvas(chartElement, {
            scale: 2, // 提高图片质量
            backgroundColor: bgColor,
            logging: false,
            useCORS: true, // 允许跨域图片
            allowTaint: false, // 不允许污染画布
            imageTimeout: 15000, // 图片加载超时时间
            ignoreElements: function(element) {
                // 忽略隐藏的元素
                return element.style.display === 'none';
            }
        }).then(canvas => {
             // 将canvas转换为图片
             const imgData = canvas.toDataURL('image/png');
             
             // 恢复按钮显示
             if (activeTab.id === 'phone-tab') {
                 const addMacBtns = phoneSizeChart.querySelectorAll('.add-mac-btn');
                 const deleteMacBtns = phoneSizeChart.querySelectorAll('.delete-mac-btn');
                 
                 addMacBtns.forEach(btn => btn.style.display = 'inline-block');
                 deleteMacBtns.forEach(btn => btn.style.display = 'inline-block');
             }
             
             // 创建下载链接
             const link = document.createElement('a');
             link.href = imgData;
             link.download = filename;
             link.click();
         }).catch(error => {
             // 恢复按钮显示（即使出错）
              if (activeTab.id === 'phone-tab') {
                  const addMacBtns = phoneSizeChart.querySelectorAll('.add-mac-btn');
                  const deleteMacBtns = phoneSizeChart.querySelectorAll('.delete-mac-btn');
                  
                  addMacBtns.forEach(btn => btn.style.display = 'inline-block');
                  deleteMacBtns.forEach(btn => btn.style.display = 'inline-block');
              }
             
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

     // 图片上传预览功能
     function handleImageUpload() {
         const file = this.files[0];
         if (file) {
             // 获取当前上传按钮所在的phone-info元素
             const phoneInfo = this.closest('.phone-info');
             
             // 更新文件名显示
             const filenameSpan = phoneInfo.querySelector('.upload-filename');
             filenameSpan.textContent = file.name;
             
             // 隐藏"添加图片"按钮
             const addImageBtn = phoneInfo.querySelector('.add-image-btn');
             addImageBtn.style.display = 'none';
             
             // 创建预览图片
             const reader = new FileReader();
             reader.onload = function(e) {
                 const imagePreview = phoneInfo.querySelector('.image-preview');
                 imagePreview.innerHTML = `<img src="${e.target.result}" alt="手机套图片" style="max-width: 100%; max-height: 200px; object-fit: contain;">`;
             };
             reader.readAsDataURL(file);
         } else {
             // 重置文件名和预览
             const phoneInfo = this.closest('.phone-info');
             const filenameSpan = phoneInfo.querySelector('.upload-filename');
             const imagePreview = phoneInfo.querySelector('.image-preview');
             filenameSpan.textContent = '未选择文件';
             imagePreview.innerHTML = '';
             
             // 显示"添加图片"按钮
             const addImageBtn = phoneInfo.querySelector('.add-image-btn');
             addImageBtn.style.display = 'block';
         }
     }

     // 事件监听
     addRowBtn.addEventListener('click', addRow);
     deleteRowBtn.addEventListener('click', deleteRow);
     previewBtn.addEventListener('click', preview);
     downloadBtn.addEventListener('click', downloadImage);
     phoneImageUpload.addEventListener('change', handleImageUpload);
     
     // 为初始的phone-info元素添加增加手机品牌按钮事件监听
     const initialAddMacBtns = document.querySelectorAll('.add-mac-btn');
     initialAddMacBtns.forEach(btn => {
         btn.addEventListener('click', function() {
             addMacElement(this.closest('.phone-info'));
         });
     });

     // 为初始的phone-info元素添加删除手机品牌按钮事件监听
     const initialDeleteMacBtns = document.querySelectorAll('.delete-mac-btn');
     initialDeleteMacBtns.forEach(btn => {
         btn.addEventListener('click', function() {
             deleteMacElement(this.closest('.phone-info'));
         });
     });

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