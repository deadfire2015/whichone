// 防止类重复声明
if (typeof window !== 'undefined') {
    // 初始化全局销售数据汇总变量
    window.salesDataSummary = {
        batchNumber: '',
        styleSKCCount: 0,
        orderQuantity: 0,
        printTypeCount: 0
    };
}
if (!window.JITOrderSystem) {
    window.JITOrderSystem = class JITOrderSystem {
        constructor() {
            this.mappingData = null;
            this.salesData = null;
            this.processedData = null;
            this.batchNumber = '';

            // 全局字段配置
            this.fieldNames = {
                mapping: {
                    sku: 'SKU',
                    skc: 'SKC'
                },
                sales: {
                    sku: 'SKU',
                    quantity: '商品总数',
                    image: '商品图片网址'
                }
            };

            // 全局显示配置
            this.displayConfig = {
                rowHeight: 100, // 表格行高，单位px
                imageMaxHeight: 100 // 图片最大高度，单位px
            };

            this.initializeEventListeners();
        }

        initializeEventListeners() {
            // 映射表文件上传
            $('#mappingFile').on('change', (e) => {
                this.handleMappingFile(e.target.files[0]);
            });

            // 销售表文件上传
            $('#salesFile').on('change', (e) => {
                this.handleSalesFile(e.target.files[0]);
            });

            // 预览按钮
            $('#previewBtn').on('click', () => {
                this.previewData();
            });

            // 下载并删除选中数据按钮
            $('#downloadDeleteBtn').on('click', () => {
                this.downloadAndDeleteSelectedData();
            });

            // 批量复制原始款号按钮
            $('#copyBtn').on('click', () => {
                this.copyOriginalSkus();
            });

            // 批次输入框变化时启用预览按钮
            $('#batchInput').on('input', () => {
                $('#previewBtn').prop('disabled', !$('#batchInput').val().trim());
            });
        }

        async handleMappingFile(file) {
            if (!file) return;

            const $status = $('#mappingStatus');
            const $error = $('#mappingError');

            $status.text('正在解析映射表...');
            $error.text('');

            try {
                const data = await this.readExcelFile(file);
                this.validateMappingData(data);
                this.mappingData = this.processMappingData(data);

                $status.text(`解析 ${this.mappingData.size} 条映射关系成功！`);

                // 启用销售表上传
                $('#salesFile, #salesBtn').prop('disabled', false);
                $('#salesStatus').text('等待上传销售表...');

            } catch (err) {
                $error.text(`映射表解析错误: ${err.message}`);
                $status.text('映射表解析失败');
            }
        }

        async handleSalesFile(file) {
            if (!file) return;

            const $status = $('#salesStatus');
            const $error = $('#salesError');

            $status.text('正在解析销售表...');
            $error.text('');

            try {
                const data = await this.readExcelFile(file);
                this.validateSalesData(data);
                this.salesData = data;

                $status.text(`解析 ${data.length} 条销售记录成功！`);

                // 启用预览按钮
                $('#previewBtn').prop('disabled', false);

            } catch (err) {
                $error.text(`销售表解析错误: ${err.message}`);
                $status.text('销售表解析失败');
            }
        }

        async readExcelFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const fileName = file.name.toLowerCase();

                        if (fileName.endsWith('.csv')) {
                            // 处理CSV文件
                            const csvData = e.target.result;
                            const jsonData = this.parseCSV(csvData);
                            resolve(jsonData);
                        } else {
                            // 处理Excel文件
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });

                            // 获取第一个工作表
                            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                            resolve(jsonData);
                        }
                    } catch (err) {
                        reject(new Error('文件解析失败'));
                    }
                };

                reader.onerror = () => {
                    reject(new Error('文件读取失败'));
                };

                if (file.name.toLowerCase().endsWith('.csv')) {
                    reader.readAsText(file, 'UTF-8');
                } else {
                    reader.readAsArrayBuffer(file);
                }
            });
        }

        parseCSV(csvText) {
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) return [];

            // 解析CSV头部
            const headers = lines[0].split(',').map(header => header.trim());

            const result = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',');
                const row = {};

                headers.forEach((header, index) => {
                    if (values[index]) {
                        row[header] = values[index].trim();
                    }
                });

                result.push(row);
            }

            return result;
        }

        validateMappingData(data) {
            if (!data || data.length === 0) {
                throw new Error('映射表为空');
            }

            const firstRow = data[0];
            if (!firstRow.hasOwnProperty(this.fieldNames.mapping.sku) ||
                !firstRow.hasOwnProperty(this.fieldNames.mapping.skc)) {
                throw new Error(`映射表必须包含${this.fieldNames.mapping.sku}和${this.fieldNames.mapping.skc}字段`);
            }
        }

        validateSalesData(data) {
            if (!data || data.length === 0) {
                throw new Error('销售表为空');
            }

            const firstRow = data[0];
            if (!firstRow.hasOwnProperty(this.fieldNames.sales.sku) ||
                !firstRow.hasOwnProperty(this.fieldNames.sales.quantity)) {
                throw new Error(`销售表必须包含${this.fieldNames.sales.sku}和${this.fieldNames.sales.quantity}字段`);
            }
        }

        processMappingData(data) {
            const mapping = new Map();

            data.forEach(row => {
                const sku = row[this.fieldNames.mapping.sku];
                const skc = row[this.fieldNames.mapping.skc];
                if (sku && skc) {
                    mapping.set(sku.toString().trim(), skc.toString().trim());
                }
            });

            return mapping;
        }

        parseSku(sku, skc = null) {
            // SKU格式解析逻辑：从原始SKU中减去匹配的SKC部分，剩余部分用"-"分隔，左边为尺码，右边为印花编号
            const skuStr = sku.toString().trim();

            // 如果有SKC映射，从原始SKU中减去SKC部分
            let remainingPart = skuStr;
            if (skc) {
                const skcStr = skc.toString().trim();
                if (skuStr.startsWith(skcStr)) {
                    remainingPart = skuStr.substring(skcStr.length);
                    // 去除可能的分隔符
                    if (remainingPart.startsWith('-')) {
                        remainingPart = remainingPart.substring(1);
                    }
                }
            }

            // 使用最后一个"-"作为分隔符解析剩余部分
            const lastDashIndex = remainingPart.lastIndexOf('-');
            if (lastDashIndex > 0 && lastDashIndex < remainingPart.length - 1) {
                const size = remainingPart.substring(0, lastDashIndex);
                const pattern = remainingPart.substring(lastDashIndex + 1);

                return {
                    skc: skc || skuStr,  // 使用映射的SKC或原始SKU
                    pattern: pattern,    // 最后一部分为印花编号
                    size: size           // 前面部分为尺码
                };
            }

            // 如果无法解析，返回原始SKU作为SKC
            return {
                skc: skc || skuStr,
                pattern: '未知',
                size: '未知'
            };
        }

        processSalesData() {
            if (!this.mappingData || !this.salesData) {
                throw new Error('请先上传映射表和销售表');
            }

            const processedMap = new Map();

            this.salesData.forEach(salesRow => {
                const sku = salesRow[this.fieldNames.sales.sku]?.toString().trim();
                const quantity = parseInt(salesRow[this.fieldNames.sales.quantity]) || 0;
                const imageUrl = salesRow[this.fieldNames.sales.image];

                if (!sku) return;

                // 获取SKC映射
                let skc = this.mappingData.get(sku);

                // 解析SKU详细信息，传递SKC用于从原始SKU中减去匹配部分
                const parsedSku = this.parseSku(sku, skc);

                // 如果没有映射的SKC，使用解析出的SKC
                if (!skc) {
                    skc = parsedSku.skc;
                }

                // 生成唯一键：SKC+印花编码+尺码
                const uniqueKey = `${skc}|${parsedSku.pattern}|${parsedSku.size}`;

                if (processedMap.has(uniqueKey)) {
                    // 如果已存在相同SKC、印花编码、尺码的记录，累加数量
                    const existing = processedMap.get(uniqueKey);
                    existing.quantity += quantity;
                } else {
                    // 创建新记录
                    processedMap.set(uniqueKey, {
                        originalSku: sku,
                        skc: skc,
                        pattern: parsedSku.pattern,
                        size: parsedSku.size,
                        quantity: quantity,
                        imageUrl: imageUrl
                    });
                }
            });

            return Array.from(processedMap.values());
        }

        sortData(data) {
            return data.sort((a, b) => {
                // 第一优先级: SKC
                if (a.skc < b.skc) return -1;
                if (a.skc > b.skc) return 1;

                // 第二优先级: 印花编号
                if (a.pattern < b.pattern) return -1;
                if (a.pattern > b.pattern) return 1;

                // 第三优先级: 尺码
                if (a.size < b.size) return -1;
                if (a.size > b.size) return 1;

                return 0;
            });
        }

        generateSummary(data) {
            const summary = {
                batchNumber: this.batchNumber || '',
                totalItems: data.length,
                totalQuantity: data.reduce((sum, item) => sum + (item.quantity || 0), 0),
                skcCount: new Set(data.map(item => item.skc)).size,
                patternCount: new Set(data.map(item => item.pattern)).size,
                sizeCount: new Set(data.map(item => item.size)).size,

                skcSummary: {},
                patternSummary: {},
                sizeSummary: {}
            };

            // SKC汇总
            data.forEach(item => {
                summary.skcSummary[item.skc] = (summary.skcSummary[item.skc] || 0) + (item.quantity || 0);
                summary.patternSummary[item.pattern] = (summary.patternSummary[item.pattern] || 0) + (item.quantity || 0);
                summary.sizeSummary[item.size] = (summary.sizeSummary[item.size] || 0) + (item.quantity || 0);
            });

            return summary;
        }

        getSizesForSkc(skc) {
            const sizeQuantities = {};
            this.processedData.forEach(item => {
                if (item.skc === skc && item.size) {
                    sizeQuantities[item.size] = (sizeQuantities[item.size] || 0) + (item.quantity || 0);
                }
            });

            let result = '<div class="size-container">';
            Object.entries(sizeQuantities).forEach(([size, quantity]) => {
                result += `<div class="size-chip"><span class="size-text">${size}</span>:<span class="quantity-text">${quantity}</span></div>`;
            });
            result += '</div>';
            return result;
        }

        getAdultQuantityForPattern(pattern) {
            const adultSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL'];
            let adultQuantity = 0;

            this.processedData.forEach(item => {
                if (item.pattern === pattern && adultSizes.includes(item.size.toUpperCase())) {
                    adultQuantity += item.quantity || 0;
                }
            });

            return adultQuantity;
        }

        previewData() {
            try {
                // 批次验证
                const $batchInput = $('#batchInput');
                this.batchNumber = $batchInput.val().trim();

                if (!this.batchNumber) {
                    throw new Error('请输入批次号');
                }

                this.processedData = this.processSalesData();
                const sortedData = this.sortData(this.processedData);
                const summary = this.generateSummary(sortedData);

                this.displayData(sortedData, summary);
                this.displaySummary(summary);

                // 更新全局销售数据汇总变量
                window.salesDataSummary = {
                    batchNumber: summary.batchNumber,
                    styleSKCCount: summary.skcCount,
                    orderQuantity: summary.totalQuantity,
                    printTypeCount: summary.patternCount
                };

                // 显示数据表格，隐藏占位提示
                $('#dataPlaceholder').addClass('hidden');
                $('#dataTable, #skcSummary, #patternSummary').removeClass('hidden');

                // 启用下载和打印按钮
                $('#downloadBtn, #printTabBtn, #downloadDeleteBtn, #copyBtn').prop('disabled', false);

                // 为所有表格添加图片预览功能
                if (window.imagePreviewManager) {
                    imagePreviewManager.enableImagePreview('#dataTable');
                    imagePreviewManager.enableImagePreview('#skcSummary');
                    imagePreviewManager.enableImagePreview('#patternSummary');
                }

            } catch (err) {
                document.getElementById('salesError').textContent = `数据处理错误: ${err.message}`;
            }
        }

        displayData(data, summary) {
            // 使用传入的summary参数直接更新固定在顶部的汇总信息
            // 避免依赖全局变量，解决数据更新滞后问题
            $('#batchNumber').text(summary?.batchNumber || window.salesDataSummary.batchNumber || '--');
            $('#styleSKCCount').text(summary?.skcCount || window.salesDataSummary.styleSKCCount || 0);
            $('#orderQuantity').text(summary?.totalQuantity || window.salesDataSummary.orderQuantity || 0);
            $('#printTypeCount').text(summary?.patternCount || window.salesDataSummary.printTypeCount || 0);

            const tableContainer = document.getElementById('dataTable');
            const now = new Date();
            const timestamp = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            let html = `
            <table>
                <thead>
                    <tr>
                        <th class="select "><input type="checkbox" id="selectAll" title="全选/取消全选"></th>
                        <th>图片</th>
                        <th>SKC</th>
                        <th>印花编号</th>
                        <th>尺码</th>
                        <th>销售数量</th>
                        <th>原始SKU(条码)</th>
                    </tr>
                </thead>
                <tbody>
        `;

            data.forEach(item => {
                html += `
                <tr>
                    <td class="select"><input type="checkbox" class="row-checkbox" data-skc="${this.escapeHtml(item.skc)}" data-pattern="${this.escapeHtml(item.pattern)}" data-size="${this.escapeHtml(item.size)}"></td>
                    <td>${item.imageUrl ? `<img src="${this.escapeHtml(item.imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}</td>
                    <td>${this.escapeHtml(item.skc)}</td>
                    <td>${this.escapeHtml(item.pattern)}</td>
                    <td>${this.escapeHtml(item.size)}</td>
                    <td>${item.quantity}</td>
                    <td>${this.escapeHtml(item.originalSku)}</td>
                </tr>
            `;
            });

            html += `
                </tbody>
            </table>
        `;

            tableContainer.innerHTML = html;

            // 添加checkbox事件处理
            this.setupCheckboxEvents();

            // 添加图片悬停预览功能
            if (window.imagePreviewManager) {
                imagePreviewManager.enableImagePreview('#dataTable');
            }
        }



        setupCheckboxEvents() {
            // 全选功能
            const $selectAll = $('#selectAll');
            const $checkboxes = $('.row-checkbox');

            if ($selectAll.length) {
                $selectAll.on('change', function() {
                    $checkboxes.prop('checked', this.checked);
                });
            }

            // 单个checkbox选中时更新全选状态
            $checkboxes.on('change', function() {
                if ($selectAll.length) {
                    const allChecked = $checkboxes.filter(':not(:checked)').length === 0;
                    const someChecked = $checkboxes.filter(':checked').length > 0;

                    $selectAll.prop({
                        checked: allChecked,
                        indeterminate: someChecked && !allChecked
                    });
                }
            });

            // 只有在checkbox所在单元格点击时才触发
            $('tbody tr .select').on('click', function(e) {
                // 如果点击的是复选框本身，则不做处理（避免重复触发）
                if ($(e.target).is('input[type="checkbox"]') || $(e.target).closest('input[type="checkbox"]').length) {
                    return;
                }

                // 找到当前单元格的复选框并切换状态
                const $checkbox = $(this).find('.row-checkbox');
                if ($checkbox.length) {
                    $checkbox.prop('checked', !$checkbox.prop('checked'));
                    $checkbox.trigger('change');
                }
            });
        }



        downloadAndDeleteSelectedData() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');

            if (checkboxes.length === 0) {
                this.showToast('请先选择要下载的数据行！');
                return;
            }

            // 获取选中数据
            const selectedData = [];
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row) {
                    const cells = row.querySelectorAll('td');
                    selectedData.push({
                        imageUrl: cells[1].querySelector('img')?.src || '',
                        skc: cells[2].textContent,
                        pattern: cells[3].textContent,
                        size: cells[4].textContent,
                        quantity: parseInt(cells[5].textContent),
                        originalSku: cells[6].textContent
                    });
                }
            });

            // 下载选中数据
            this.downloadSelectedData(selectedData);

            // 从processedData中删除选中数据
            this.removeSelectedDataFromProcessed(selectedData);

            // 重新显示数据和汇总信息
            const summary = this.generateSummary(this.processedData);
            this.displayData(this.processedData, summary);
            this.displaySummary(summary);

            // 更新全局销售数据汇总变量
            window.salesDataSummary = {
                batchNumber: summary.batchNumber,
                styleSKCCount: summary.skcCount,
                orderQuantity: summary.totalQuantity,
                printTypeCount: summary.patternCount
            };

            this.showToast(`已下载并删除 ${selectedData.length} 条选中数据！`);
        }

        downloadSelectedData(selectedData) {
            // 创建工作簿
            const wb = XLSX.utils.book_new();

            // 转换数据为工作表格式
            const wsData = selectedData.map(item => ({
                '图片URL': item.imageUrl,
                'SKC': item.skc,
                '印花编码': item.pattern,
                '尺码': item.size,
                '销售数量': item.quantity,
                '原始SKU': item.originalSku
            }));

            const ws = XLSX.utils.json_to_sheet(wsData);

            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '选中数据');

            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${this.batchNumber}_选中数据_${timestamp}.xlsx`;

            // 下载文件
            XLSX.writeFile(wb, filename);
        }

        copyOriginalSkus() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');

            if (checkboxes.length === 0) {
                this.showToast('请先选择要复制的数据行！');
                return;
            }

            // 获取选中数据的原始SKU
            const originalSkus = [];
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row) {
                    const cells = row.querySelectorAll('td');
                    originalSkus.push(cells[6].textContent.trim());
                }
            });

            // 复制到剪贴板
            const skusText = originalSkus.join('\n');
            navigator.clipboard.writeText(skusText)
                .then(() => {
                    this.showToast(`已复制 ${originalSkus.length} 个原始款号到剪贴板！`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    this.showToast('复制失败，请手动复制');
                });
        }

        removeSelectedDataFromProcessed(selectedData) {
            // 从processedData中删除选中数据
            this.processedData = this.processedData.filter(processedItem => {
                return !selectedData.some(selectedItem =>
                    processedItem.skc === selectedItem.skc &&
                    processedItem.pattern === selectedItem.pattern &&
                    processedItem.size === selectedItem.size &&
                    processedItem.quantity === selectedItem.quantity
                );
            });
        }

        showToast(message) {
            const $toastContainer = $('#toastContainer');
            const $toast = $('<div>', {
                'class': 'toast',
                'text': message
            });

            $toastContainer.append($toast);

            // 5秒后自动移除
            setTimeout(() => {
                $toast.remove();
            }, 5000);
        }

        displaySummary(summary) {
            const skcSummaryContainer = document.getElementById('skcSummary');
            const patternSummaryContainer = document.getElementById('patternSummary');
            const now = new Date();
            const timestamp = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // 空版检货汇总
            let skcHtml = `
                <div class="summary-container">
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th>款式图片</th>
                                    <th>款号skc</th>
                                    <th>检货尺码(件)</th>
                                    <th>件数合计</th>
                                </tr>
                            </thead>
                            <tbody>`;
            // 获取所有SKC和对应的图片
            const skcImages = {};
            this.processedData.forEach(item => {
                if (item.imageUrl && !skcImages[item.skc]) {
                    skcImages[item.skc] = item.imageUrl;
                }
            });

            Object.entries(summary.skcSummary)
                .sort(([, a], [, b]) => b - a)
                .forEach(([skc, quantity]) => {
                    const imageUrl = skcImages[skc] || '';
                    skcHtml += `<tr>
                    <td>${imageUrl ? `<img src="${this.escapeHtml(imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}</td>
                    <td>${this.escapeHtml(skc)}</td>
                    <td>${this.getSizesForSkc(skc)}</td>
                    <td>${quantity}</td>
                </tr>`;
                });

            skcHtml += `</tbody></table></div>
        </div>`;

            // 烫画数量汇总
            let patternHtml = `
                <div class="summary-container">
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th>印花对应款式图片</th>
                                    <th>印花编码</th>
                                    <th>所需烫画数量</th>
                                </tr>
                            </thead>
                            <tbody>`;

            // 获取印花编码对应的SKC图片映射
            const patternImages = {};
            this.processedData.forEach(item => {
                if (item.imageUrl && !patternImages[item.pattern]) {
                    patternImages[item.pattern] = item.imageUrl;
                }
            });

            Object.entries(summary.patternSummary)
                .sort(([, a], [, b]) => b - a)
                .forEach(([pattern, quantity]) => {
                    const imageUrl = patternImages[pattern] || '';
                    patternHtml += `<tr>
                    <td>${imageUrl ? `<img src="${this.escapeHtml(imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}</td>
                    <td>${this.escapeHtml(pattern)}</td>
                    <td>${quantity}</td>
                </tr>`;
                });

            patternHtml += `</tbody></table></div>
        </div>`;

            skcSummaryContainer.innerHTML = skcHtml;
            patternSummaryContainer.innerHTML = patternHtml;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
}
// Tab切换功能
function setupTabs() {
    const $tabButtons = $('.tab-btn');
    const $tabContents = $('.tab-content');

    $tabButtons.on('click', function() {
        const tabId = $(this).attr('data-tab');

        // 移除所有active类
        $tabButtons.removeClass('active');
        $tabContents.removeClass('active');

        // 添加active类到当前tab
        $(this).addClass('active');
        $(`.tab-content[data-tab="${tabId}"]`).addClass('active');
    });
}



// 下载当前选中的表格
function setupDownloadButton() {
    const $downloadBtn = $('#downloadBtn');

    $downloadBtn.on('click', () => {
        // 获取当前激活的tab内容
        const $activeTab = $('.tab-content.active');

        if ($activeTab.length) {
            // 获取当前tab的标题
            const tabTitle = $('.tab-btn.active').text();
            const timestamp = new Date().toLocaleString('zh-CN');

            // 创建Excel工作簿
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([]);

            // 处理表格数据
            const $table = $activeTab.find('table');
            if ($table.length) {
                // 添加表头
                const headers = [];
                $table.find('thead th').each(function() {
                    headers.push($(this).text().trim());
                });
                XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

                // 添加数据行
                let rowIndex = 2;
                $table.find('tbody tr').each(function() {
                    const row = [];
                    
                    $(this).find('td').each(function() {
                        // 处理复选框单元格
                        if ($(this).find('input[type="checkbox"]').length) {
                            row.push(''); // 忽略复选框
                        }
                        // 处理图片单元格
                        else if ($(this).find('img').length) {
                            const imgSrc = $(this).find('img').attr('src');
                            if (imgSrc) {
                                row.push(imgSrc);
                            } else {
                                row.push('');
                            }
                        } else {
                            row.push($(this).text().trim());
                        }
                    });

                    XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: `A${rowIndex}` });
                    rowIndex++;
                });
            }

            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(workbook, worksheet, tabTitle);

            // 生成Excel文件
            XLSX.writeFile(workbook, `${tabTitle}_${timestamp.replace(/[:\/]/g, '-')}.xlsx`);
        }
    });
}

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.JITOrderSystem !== 'undefined') {
        new window.JITOrderSystem();
        setupTabs();
        setupDownloadButton();

        // 初始状态下禁用下载和打印按钮
        $('#downloadBtn, #printTabBtn').prop('disabled', true);
    }
});