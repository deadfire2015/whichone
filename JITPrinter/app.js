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
            this.skcMappingData = null; // 新增：SKC印花映射表数据
            this.salesData = null;
            this.processedData = null;
            this.batchNumber = '';
            this.patternImageData = null; // 新增：印花图片映射表数据

            // 全局字段配置
            this.fieldNames = {
                mapping: {
                    sku: 'SKU',
                    skc: 'SKC'
                },
                skcMapping: {
                    skc: 'SKC',
                    size: 'SIZE'
                },
                patternImage: {
                    patternCode: 'PatternCode',
                    url: 'URL'
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
            // 初始化MappingUploader
            if (window.MappingUploader) {
                this.mappingUploader = new window.MappingUploader(this);
                this.mappingUploader.init();
            }

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

            // 下载空版组单表按钮
            $('#downloadEmptySheetBtn').on('click', () => {
                this.downloadEmptySheet();
            });

            // 批次输入框变化时启用预览按钮
            $('#batchInput').on('input', () => {
                const hasBatch = !!$('#batchInput').val().trim();
                $('#previewBtn').prop('disabled', !hasBatch);
                // downloadEmptySheetBtn按钮现在只在表单生成后才可用
            });
        }

        async handleSkcMappingFile(file) {
            if (!file) return;

            const $status = $('#skcMappingStatus');
            const $error = $('#skcMappingError');

            $status.text('正在解析SKC印花映射表...');
            $error.text('');

            try {
                const data = await this.readExcelFile(file);
                this.validateSkcMappingData(data);
                this.skcMappingData = this.processSkcMappingData(data);

                $status.text(`解析 ${this.skcMappingData.size} 条数据成功！`).addClass('status-success');
                // 保持成功状态显示，不再自动移除

            } catch (err) {
                $error.text(`SKC印花映射表解析错误: ${err.message}`);
                $status.text('SKC印花映射表解析失败');
            }
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

                $status.text(`解析 ${this.mappingData.size} 条数据成功！`).addClass('status-success');
                // 保持成功状态显示，不再自动移除

                // 启用销售表上传
                $('#salesFile, #salesBtn').prop('disabled', false);
                $('#salesStatus').text('等待上传销售表...');
            } catch (err) {
                $error.text(`映射表解析错误: ${err.message}`);
                $status.text('映射表解析失败');
            }
        }

        // 处理印花图片映射表
        async handlePatternImageFile(file) {
            if (!file) return;

            const $status = $('#patternImageStatus');
            const $error = $('#patternImageError');

            $status.text('正在解析印花图片映射表...');
            $error.text('');

            try {
                const data = await this.readExcelFile(file);
                this.validatePatternImageData(data);
                this.patternImageData = this.processPatternImageData(data);

                $status.text(`解析 ${this.patternImageData.size} 条数据成功！`).addClass('status-success');
                // 如果已有处理数据，重新生成烫画数量汇总表格以应用新的图片映射
                if (this.processedData) {
                    this.displayPatternSummary();
                }
                // 保持成功状态显示，不再自动移除

            } catch (err) {
                $error.text(`印花图片映射表解析错误: ${err.message}`);
                $status.text('印花图片映射表解析失败');
                this.patternImageData = null;
            }
        }

        async handleSalesFile(file) {
            if (!file) return;

            const $status = $('#salesStatus');
            const $error = $('#salesError');

            $status.text('正在解析销售表...');
            $error.text('');

            try {
                let data;
                
                // 首先尝试读取指定的工作表
                try {
                    data = await this.readExcelFile(file, '销售表');
                } catch (err) {
                    // 如果指定工作表不存在，尝试获取第一个工作表
                    const workbookData = await this.readExcelFile(file);
                    
                    // 检查是否返回的是包含所有工作表的对象
                    if (typeof workbookData === 'object' && !Array.isArray(workbookData)) {
                        const sheetNames = Object.keys(workbookData);
                        if (sheetNames.length > 0) {
                            // 使用第一个工作表的数据
                            data = workbookData[sheetNames[0]];
                        } else {
                            throw new Error('Excel文件中没有找到任何工作表');
                        }
                    } else {
                        // 如果返回的已经是数组，则直接使用
                        data = workbookData;
                    }
                }
                
                this.validateSalesData(data);
                this.salesData = data;

                $status.text(`解析 ${data.length} 条数据成功！`).addClass('status-success');
                // 保持成功状态显示，不再自动移除

                // 启用预览按钮
                $('#previewBtn').prop('disabled', false);

            } catch (err) {
                $error.text(`销售表解析错误: ${err?.message || '未知错误'}`);
                $status.text('销售表解析失败');
            }
        }

        async readExcelFile(file, sheetName = null) {
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

                            if (sheetName) {
                                // 读取指定的工作表
                                if (!workbook.SheetNames.includes(sheetName)) {
                                    reject(new Error(`Excel文件中不存在名为'${sheetName}'的工作表`));
                                    return;
                                }
                                const worksheet = workbook.Sheets[sheetName];
                                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                                resolve(jsonData);
                            } else {
                                // 读取所有工作表
                                const allSheets = {};
                                workbook.SheetNames.forEach(name => {
                                    allSheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
                                });
                                resolve(allSheets);
                            }
                        }
                    } catch (err) {
                        reject(new Error('文件解析失败: ' + err.message));
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

        validateSkcMappingData(data) {
            if (!data || data.length === 0) {
                throw new Error('SKC印花映射表为空');
            }

            const firstRow = data[0];
            if (!firstRow.hasOwnProperty(this.fieldNames.skcMapping.skc) ||
                !firstRow.hasOwnProperty(this.fieldNames.skcMapping.size)) {
                throw new Error(`SKC印花映射表必须包含${this.fieldNames.skcMapping.skc}和${this.fieldNames.skcMapping.size}字段`);
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

        // 验证印花图片映射表数据
        validatePatternImageData(data) {
            if (!data || data.length === 0) {
                throw new Error('印花图片映射表为空');
            }

            const firstRow = data[0];
            if (!firstRow.hasOwnProperty(this.fieldNames.patternImage.patternCode) ||
                !firstRow.hasOwnProperty(this.fieldNames.patternImage.url)) {
                throw new Error(`印花图片映射表必须包含${this.fieldNames.patternImage.patternCode}和${this.fieldNames.patternImage.url}字段`);
            }
        }

        // 处理印花图片映射表数据
        processPatternImageData(data) {
            const mapping = new Map();

            data.forEach(row => {
                const patternCode = row[this.fieldNames.patternImage.patternCode];
                const url = row[this.fieldNames.patternImage.url];
                if (patternCode && url) {
                    mapping.set(patternCode.toString().trim(), url.toString().trim());
                }
            });

            return mapping;
        }

        processSkcMappingData(data) {
            const mapping = new Map();

            data.forEach(row => {
                const skc = row[this.fieldNames.skcMapping.skc];
                const size = row[this.fieldNames.skcMapping.size];
                if (skc && size) {
                    mapping.set(skc.toString().trim(), size.toString().trim());
                }
            });

            return mapping;
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

                // 从SKC印花映射表获取印花大小
                let printSize = this.skcMappingData ? this.skcMappingData.get(skc) : '未知';

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
                        imageUrl: imageUrl,
                        printSize: printSize // 新增：印花大小
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

        /**
         * 获取指定SKC的尺码信息
         * @param {string} skc - SKC编码
         * @returns {Array} 尺码信息数组，每个元素包含size和quantity
         */
        getSizesForSkc(skc) {
            const sizeQuantities = {};
            this.processedData.forEach(item => {
                if (item.skc === skc && item.size) {
                    sizeQuantities[item.size] = (sizeQuantities[item.size] || 0) + (item.quantity || 0);
                }
            });

            // 返回尺码数组而不是HTML字符串
            return Object.entries(sizeQuantities).map(([size, quantity]) => ({
                size: size,
                quantity: quantity
            }));
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
                $('#downloadBtn, #printTabBtn, #downloadDeleteBtn, #copyBtn, #downloadEmptySheetBtn').prop('disabled', false);

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

            if (data.length > 0) {
                // 创建组数组，确保只有SKC和印花编码都相同的行才会在同一组
                const groups = [];
                let currentGroup = [data[0]];
                
                for (let i = 1; i < data.length; i++) {
                    const currentItem = data[i];
                    const lastInGroup = currentGroup[currentGroup.length - 1];
                    
                    // 只有当SKC和印花编码都相同时，才将当前行添加到同一组
                    if (currentItem.skc === lastInGroup.skc && currentItem.pattern === lastInGroup.pattern) {
                        currentGroup.push(currentItem);
                    } else {
                        // 否则，创建新组
                        groups.push(currentGroup);
                        currentGroup = [currentItem];
                    }
                }
                // 添加最后一组
                groups.push(currentGroup);

                // 遍历每个组生成HTML
                groups.forEach(group => {
                    const groupLength = group.length;
                    
                    group.forEach((item, index) => {
                        const isFirstInGroup = index === 0;
                        
                        html += `
                        <tr>
                        `;

                        // Checkbox列 - 只在组的第一行显示，其他行隐藏
                        if (isFirstInGroup) {
                            // 获取该组所有行的数据属性，用于批量操作
                            const groupDataAttributes = group.map(g => 
                                `data-skc="${this.escapeHtml(g.skc)}" data-pattern="${this.escapeHtml(g.pattern)}" data-size="${this.escapeHtml(g.size)}"`
                            ).join(' ');
                            
                            html += `
                                <td class="select" rowspan="${groupLength}"><input type="checkbox" class="row-checkbox group-checkbox" ${groupDataAttributes}></td>
                                <td rowspan="${groupLength}" class="merged-cell">${item.imageUrl ? `<img src="${this.escapeHtml(item.imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}</td>
                                <td rowspan="${groupLength}" class="merged-cell">${this.escapeHtml(item.skc)}</td>
                                <td rowspan="${groupLength}" class="merged-cell">${this.escapeHtml(item.pattern)}</td>
                                <td>${this.escapeHtml(item.size)}</td>
                                <td>${item.quantity}</td>
                                <td>${this.escapeHtml(item.originalSku)}</td>
                            `;
                        } else {
                            // 隐藏重复的列
                            html += `
                                <td class="hidden-cell"></td>
                                <td class="hidden-cell"></td>
                                <td class="hidden-cell"></td>
                                <td class="hidden-cell"></td>
                                <td>${this.escapeHtml(item.size)}</td>
                                <td>${item.quantity}</td>
                                <td>${this.escapeHtml(item.originalSku)}</td>
                            `;
                        }

                        html += `</tr>`;
                    });
                });
            }

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

            // 为组复选框添加特殊处理
            $('.group-checkbox').each((index, checkbox) => {
                const $checkbox = $(checkbox);
                // 获取该组所有行的数据属性
                const groupData = [];
                const dataset = $checkbox[0].dataset;
                
                // 提取所有data-*属性并构建组数据
                Object.keys(dataset).forEach(key => {
                    if (key.startsWith('skc')) {
                        const idx = key.replace('skc', '');
                        if (idx === '' || !isNaN(idx)) {
                            const realIdx = idx === '' ? 0 : parseInt(idx) - 1;
                            if (!groupData[realIdx]) groupData[realIdx] = {};
                            groupData[realIdx].skc = dataset[key];
                        }
                    } else if (key.startsWith('pattern')) {
                        const idx = key.replace('pattern', '');
                        if (idx === '' || !isNaN(idx)) {
                            const realIdx = idx === '' ? 0 : parseInt(idx) - 1;
                            if (!groupData[realIdx]) groupData[realIdx] = {};
                            groupData[realIdx].pattern = dataset[key];
                        }
                    } else if (key.startsWith('size')) {
                        const idx = key.replace('size', '');
                        if (idx === '' || !isNaN(idx)) {
                            const realIdx = idx === '' ? 0 : parseInt(idx) - 1;
                            if (!groupData[realIdx]) groupData[realIdx] = {};
                            groupData[realIdx].size = dataset[key];
                        }
                    }
                });
                
                // 存储组数据到checkbox元素
                $checkbox.data('groupData', groupData);
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
            // 创建一个集合，存储需要收集的SKC和印花编码组合
            const skcPatternToCollect = new Set();
            
            checkboxes.forEach(checkbox => {
                const $checkbox = $(checkbox);
                
                // 检查是否为组复选框且有组数据
                if (checkbox.classList.contains('group-checkbox') && $checkbox.data('groupData')) {
                    const groupData = $checkbox.data('groupData');
                    // 将组内所有SKC和印花编码组合加入集合
                    groupData.forEach(itemData => {
                        skcPatternToCollect.add(`${itemData.skc}|${itemData.pattern}`);
                    });
                } else {
                    // 处理普通行
                    const row = checkbox.closest('tr');
                    if (row) {
                        // 找到可见的单元格
                        let visibleCells = Array.from(row.querySelectorAll('td')).filter(cell => 
                            !cell.classList.contains('hidden-cell')
                        );
                        
                        // 如果当前行是合并组中的非首行，找到对应的首行
                        if (visibleCells.length < 7) {
                            const rowIndex = Array.from(row.parentNode.children).indexOf(row);
                            let firstRow = row;
                            
                            // 向上查找直到找到首行
                            for (let i = rowIndex - 1; i >= 0; i--) {
                                const prevRow = row.parentNode.children[i];
                                const prevVisibleCells = Array.from(prevRow.querySelectorAll('td')).filter(cell => 
                                    !cell.classList.contains('hidden-cell')
                                );
                                if (prevVisibleCells.length === 7) {
                                    firstRow = prevRow;
                                    break;
                                }
                            }
                            
                            // 从首行获取SKC和印花编码
                            const firstVisibleCells = Array.from(firstRow.querySelectorAll('td')).filter(cell => 
                                !cell.classList.contains('hidden-cell')
                            );
                            const skc = firstVisibleCells[2].textContent.trim();
                            const pattern = firstVisibleCells[3].textContent.trim();
                            skcPatternToCollect.add(`${skc}|${pattern}`);
                        } else {
                            // 普通行处理
                            const skc = visibleCells[2].textContent.trim();
                            const pattern = visibleCells[3].textContent.trim();
                            skcPatternToCollect.add(`${skc}|${pattern}`);
                        }
                    }
                }
            });
            
            // 根据收集的SKC和印花编码组合，从processedData中获取所有匹配的数据
            this.processedData.forEach(item => {
                if (skcPatternToCollect.has(`${item.skc}|${item.pattern}`)) {
                    selectedData.push({
                        imageUrl: item.imageUrl || '',
                        skc: item.skc,
                        pattern: item.pattern,
                        size: item.size,
                        quantity: item.quantity || 0,
                        originalSku: item.originalSku
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
            // 重命名为下载条码表功能
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');

            if (checkboxes.length === 0) {
                this.showToast('请先选择要下载的数据行！');
                return;
            }

            // 首先收集所有选中的SKC和印花编码组合
            const skcPatternToCollect = new Set();
            checkboxes.forEach(checkbox => {
                const $checkbox = $(checkbox);
                
                // 检查是否为组复选框且有组数据
                if (checkbox.classList.contains('group-checkbox') && $checkbox.data('groupData')) {
                    const groupData = $checkbox.data('groupData');
                    // 将组内所有SKC和印花编码组合加入集合
                    groupData.forEach(itemData => {
                        skcPatternToCollect.add(`${itemData.skc}|${itemData.pattern}`);
                    });
                } else {
                    // 处理普通行
                    const row = checkbox.closest('tr');
                    if (row) {
                        // 找到可见的单元格
                        let visibleCells = Array.from(row.querySelectorAll('td')).filter(cell => 
                            !cell.classList.contains('hidden-cell')
                        );
                        
                        // 如果当前行是合并组中的非首行，找到对应的首行
                        if (visibleCells.length < 7) {
                            const rowIndex = Array.from(row.parentNode.children).indexOf(row);
                            let firstRow = row;
                            
                            // 向上查找直到找到首行
                            for (let i = rowIndex - 1; i >= 0; i--) {
                                const prevRow = row.parentNode.children[i];
                                const prevVisibleCells = Array.from(prevRow.querySelectorAll('td')).filter(cell => 
                                    !cell.classList.contains('hidden-cell')
                                );
                                if (prevVisibleCells.length === 7) {
                                    firstRow = prevRow;
                                    break;
                                }
                            }
                            
                            // 从首行获取SKC和印花编码
                            const firstVisibleCells = Array.from(firstRow.querySelectorAll('td')).filter(cell => 
                                !cell.classList.contains('hidden-cell')
                            );
                            const skc = firstVisibleCells[2].textContent.trim();
                            const pattern = firstVisibleCells[3].textContent.trim();
                            skcPatternToCollect.add(`${skc}|${pattern}`);
                        } else {
                            // 普通行处理
                            const skc = visibleCells[2].textContent.trim();
                            const pattern = visibleCells[3].textContent.trim();
                            skcPatternToCollect.add(`${skc}|${pattern}`);
                        }
                    }
                }
            });

            // 根据SKC和印花编码组合分组收集条码数据
            const skcPatternGroups = new Map();
            this.processedData.forEach(item => {
                const skcPatternKey = `${item.skc}|${item.pattern}`;
                if (skcPatternToCollect.has(skcPatternKey)) {
                    if (!skcPatternGroups.has(skcPatternKey)) {
                        skcPatternGroups.set(skcPatternKey, []);
                    }
                    skcPatternGroups.get(skcPatternKey).push({
                        '商品编码': item.originalSku,
                        '数量': item.quantity || 0
                    });
                }
            });

            // 创建最终数据数组，每8个SKC后添加sticker行
            const finalData = [];
            let skcCount = 0;
            
            // 遍历每个SKC组
            skcPatternGroups.forEach((skuItems, skcPatternKey) => {
                // 添加当前SKC组的所有条码数据
                skuItems.forEach(skuItem => {
                    finalData.push(skuItem);
                });
                
                // 增加SKC计数
                skcCount++;
                
                // 每8个SKC后添加sticker行，但不在最后一个SKC后添加
                if (skcCount % 8 === 0 && skcCount < skcPatternGroups.size) {
                    finalData.push({
                        '商品编码': 'sticker',
                        '数量': '2'
                    });
                }
            });

            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 转换数据为工作表格式
            const ws = XLSX.utils.json_to_sheet(finalData);
            
            // 设置列宽
            const colWidths = [
                { wch: 20 }, // 商品编码列宽
                { wch: 10 }  // 数量列宽
            ];
            ws['!cols'] = colWidths;
            
            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '条码数据');
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${this.batchNumber}_条码表_${timestamp}.xlsx`;
            
            // 下载文件
            XLSX.writeFile(wb, filename);
            
            // 显示成功提示
            this.showToast(`已下载 ${finalData.length} 条数据（含sticker记录）到Excel文件！`);
        }
        
        // 下载空版组单表
        downloadEmptySheet() {
            if (!this.processedData || this.processedData.length === 0) {
                this.showToast('没有数据可供下载，请先生成表单！');
                return;
            }
            
            // 提取SKU并统计数量
            const skuQuantityMap = new Map();
            
            this.processedData.forEach(item => {
                // 获取SKU并去掉最后一个"-"及后面的内容
                const sku = item.originalSku;
                if (sku) {
                    // 查找最后一个"-"的位置
                    const lastDashIndex = sku.lastIndexOf('-');
                    const processedSku = lastDashIndex > 0 ? sku.substring(0, lastDashIndex) : sku;
                    
                    // 统计数量
                    const currentQuantity = skuQuantityMap.get(processedSku) || 0;
                    skuQuantityMap.set(processedSku, currentQuantity + item.quantity);
                }
            });
            
            // 创建导出数据
            const exportData = [];
            skuQuantityMap.forEach((quantity, sku) => {
                exportData.push({
                    '商品编码': sku,
                    '数量': quantity
                });
            });
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 转换数据为工作表格式
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // 设置列宽
            const colWidths = [
                { wch: 20 }, // 商品编码列宽
                { wch: 10 }  // 数量列宽
            ];
            ws['!cols'] = colWidths;
            
            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '空版组单表');
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${this.batchNumber}_空版组单表_${timestamp}.xlsx`;
            
            // 下载文件
            XLSX.writeFile(wb, filename);
            
            // 显示成功提示
            this.showToast(`已下载空版组单表，共 ${exportData.length} 条SKU数据！`);
        }

        removeSelectedDataFromProcessed(selectedData) {
            // 从processedData中删除选中数据
            // 首先创建一个集合，存储所有需要删除的SKC和印花编码的组合
            const skcPatternToRemove = new Set();
            selectedData.forEach(selectedItem => {
                skcPatternToRemove.add(`${selectedItem.skc}|${selectedItem.pattern}`);
            });
            
            // 过滤掉所有在需要删除集合中的SKC和印花编码组合的数据
            this.processedData = this.processedData.filter(processedItem => {
                return !skcPatternToRemove.has(`${processedItem.skc}|${processedItem.pattern}`);
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
                                    <th>尺码</th>
                                    <th>数量</th>
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

            // 按SKC分组处理
            const skcGroups = {};
            Object.entries(summary.skcSummary)
                .sort(([, a], [, b]) => b - a)
                .forEach(([skc, totalQuantity]) => {
                    skcGroups[skc] = {
                        imageUrl: skcImages[skc] || '',
                        sizes: this.getSizesForSkc(skc),
                        totalQuantity: totalQuantity
                    };
                });

            // 生成表格内容，实现SKC相同单元格合并
            Object.entries(skcGroups).forEach(([skc, group]) => {
                const sizeCount = group.sizes.length;
                
                // 第一行显示图片、SKC和合计数量，这些单元格需要合并
                skcHtml += `<tr>
                    <td rowspan="${sizeCount}" ${sizeCount > 1 ? 'class="merged-cell"' : ''}>
                        ${group.imageUrl ? `<img src="${this.escapeHtml(group.imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}
                    </td>
                    <td rowspan="${sizeCount}" ${sizeCount > 1 ? 'class="merged-cell"' : ''}>${this.escapeHtml(skc)}</td>`;
                
                // 第一行的尺码和数量
                const firstSize = group.sizes[0];
                skcHtml += `
                    <td>${this.escapeHtml(firstSize.size)}</td>
                    <td>${firstSize.quantity}</td>
                    <td rowspan="${sizeCount}" ${sizeCount > 1 ? 'class="merged-cell"' : ''}>${group.totalQuantity}</td>
                </tr>`;
                
                // 后续行只显示尺码和数量
                for (let i = 1; i < sizeCount; i++) {
                    const size = group.sizes[i];
                    skcHtml += `<tr>
                        <td>${this.escapeHtml(size.size)}</td>
                        <td>${size.quantity}</td>
                    </tr>`;
                }
            });

            skcHtml += `</tbody></table></div>
        </div>`;

            // 烫画数量汇总 - 按印花大小显示数量，每个size:数量占一行
            let patternHtml = `
                <div class="summary-container">
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th>印花图片</th>
                                    <th>印花编码</th>
                                    <th>印花大小及数量</th>
                                    <th>所需烫画数量</th>
                                </tr>
                            </thead>
                            <tbody>`;

            // 按印花编码和SKC印花大小分组汇总
            const patternPrintSizeGroups = {};
            
            this.processedData.forEach(item => {
                // 按印花编码分组，记录每个印花大小及其数量
                if (!patternPrintSizeGroups[item.pattern]) {
                    patternPrintSizeGroups[item.pattern] = {};
                }
                
                // 按印花编码分组，记录每个印花大小及其数量
                if (!patternPrintSizeGroups[item.pattern]) {
                    patternPrintSizeGroups[item.pattern] = {};
                }
                
                // 使用SKC印花映射表中的印花大小
                const printSize = item.printSize || '未知';
                if (!patternPrintSizeGroups[item.pattern][printSize]) {
                    patternPrintSizeGroups[item.pattern][printSize] = 0;
                }
                patternPrintSizeGroups[item.pattern][printSize] += item.quantity || 0;
            });

            // 处理数据，生成按印花大小分组的结果
            const finalPatternGroups = [];
            Object.entries(patternPrintSizeGroups).forEach(([pattern, sizeQuantities]) => {
                Object.entries(sizeQuantities).forEach(([printSize, quantity]) => {
                    finalPatternGroups.push({
                        pattern: pattern,
                        printSize: printSize,
                        quantity: quantity
                    });
                });
            });

            // 按印花编码和印花大小排序
            finalPatternGroups.sort((a, b) => {
                if (a.pattern !== b.pattern) {
                    return a.pattern.localeCompare(b.pattern);
                }
                return a.printSize.localeCompare(b.printSize);
            });

            // 生成显示文本，按要求的格式：每个size:数量占一行
            const patternDisplayMap = {};
            finalPatternGroups.forEach(group => {
                if (!patternDisplayMap[group.pattern]) {
                    patternDisplayMap[group.pattern] = [];
                }
                patternDisplayMap[group.pattern].push({
                    printSize: group.printSize,
                    quantity: group.quantity
                });
            });

            // 生成最终的表格内容
            Object.entries(patternDisplayMap).forEach(([pattern, displayItems]) => {
                const totalQuantity = finalPatternGroups
                    .filter(item => item.pattern === pattern)
                    .reduce((sum, item) => sum + item.quantity, 0);
                
                // 构建每个size:数量占一行的HTML，使用.size-container和size-chip样式
                let sizeQuantityHtml = '<div class="size-container">';
                displayItems.forEach(item => {
                    sizeQuantityHtml += `<div class="size-chip"><span class="size-text">${this.escapeHtml(item.printSize)}</span>:<span class="quantity-text">${item.quantity}</span></div>`;
                });
                sizeQuantityHtml += '</div>';
                
                // 处理多个印花编码的情况，支持使用+连接的多个值
                let imagesHtml = '';
                const patternCodes = pattern.split('+');
                let hasImages = false;
                
                patternCodes.forEach(code => {
                    code = code.trim();
                    if (this.patternImageData && this.patternImageData.has(code)) {
                        const url = this.patternImageData.get(code);
                        if (url) {
                            imagesHtml += `<img src="${this.escapeHtml(url)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">`;
                            hasImages = true;
                        }
                    }
                });
                
                // 如果没有图片，则显示"无"
                if (!hasImages) {
                    imagesHtml = '无';
                }
                
                patternHtml += `<tr>
                    <td style="display: flex; gap: 8px; align-items: center;border:1px solid #747474;">${imagesHtml}</td>
                    <td>${this.escapeHtml(pattern)}</td>
                    <td>${sizeQuantityHtml}</td>
                    <td>${totalQuantity}</td>
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
            
            // 为了避免CORS跨域问题，直接使用原有方式下载表格
            downloadWithoutImages($activeTab, tabTitle, timestamp);
        }
    });
}

// 修改后的XLSX下载方式，专门针对空版检货汇总表的特殊表格结构
function downloadWithoutImages($activeTab, tabTitle, timestamp) {
    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new();
    
    // 处理表格数据
    const $table = $activeTab.find('table');
    if ($table.length) {
        // 获取表头
        const headers = [];
        $table.find('thead th').each(function() {
            headers.push($(this).text().trim());
        });
        
        // 创建完整的数据矩阵，包含所有行和列
        const dataMatrix = [headers];
        
        // 获取所有行
        const $rows = $table.find('tbody tr');
        const numCols = headers.length;
        
        // 存储前一行的数据，用于填充后续行的数据
        let previousRowData = new Array(numCols).fill('');
        
        // 存储合并单元格信息
        const merges = [];
        
        // 记录当前SKC和其起始行号，用于合并相同SKC的行
        let currentSKC = '';
        let skcStartRow = -1;
        let skcCount = 0;
        
        // 处理每行数据
        $rows.each((rowIdx) => {
            const currentRow = new Array(numCols).fill('');
            const $cells = $($rows[rowIdx]).find('td');
            
            // 检查当前行是否只有尺码和数量两列（这是空版检货汇总表的后续行特征）
            if ($cells.length === 2 && headers.length === 5 && headers[2] === '尺码' && headers[3] === '数量') {
                // 这是一个只有尺码和数量的行，需要从前一行复制其他列的数据
                for (let i = 0; i < numCols; i++) {
                    if (i === 2 || i === 3) {
                        // 尺码和数量列使用当前行的数据
                        currentRow[i] = $cells[i === 2 ? 0 : 1].textContent.trim();
                    } else {
                        // 其他列使用前一行的数据
                        currentRow[i] = previousRowData[i];
                    }
                }
                
                // 增加SKC计数
                skcCount++;
            } else {
                // 如果之前有相同SKC的行，现在要处理新的SKC了，添加合并信息
                if (skcStartRow !== -1 && skcCount > 0) {
                    // 合并款式图片列（第0列）
                    merges.push({
                        s: { r: skcStartRow + 1, c: 0 }, // +1 因为第一行是表头
                        e: { r: skcStartRow + skcCount + 1, c: 0 }
                    });
                    // 合并款号skc列（第1列）
                    merges.push({
                        s: { r: skcStartRow + 1, c: 1 },
                        e: { r: skcStartRow + skcCount + 1, c: 1 }
                    });
                    // 合并件数合计列（第4列）
                    merges.push({
                        s: { r: skcStartRow + 1, c: 4 },
                        e: { r: skcStartRow + skcCount + 1, c: 4 }
                    });
                }
                
                // 正常行处理
                let colIdx = 0;
                let currentRowSKC = '';
                
                $cells.each((cellIdx, cellElement) => {
                    const $cell = $(cellElement);
                    let cellContent = '';
                    
                    // 处理不同类型的单元格
                    if ($cell.find('input[type="checkbox"]').length) {
                        cellContent = '';
                    } else if ($cell.find('img').length) {
                        const imgSrc = $cell.find('img').attr('src');
                        cellContent = imgSrc || '';
                    } else {
                        cellContent = $cell.text().trim();
                        // 检查是否是SKC列
                        if (colIdx === 1) {
                            currentRowSKC = cellContent;
                        }
                    }
                    
                    // 获取合并信息
                    const colspan = parseInt($cell.attr('colspan') || 1);
                    const rowspan = parseInt($cell.attr('rowspan') || 1);
                    
                    // 填充当前单元格
                    for (let i = 0; i < colspan; i++) {
                        if (colIdx + i < numCols) {
                            currentRow[colIdx + i] = cellContent;
                        }
                    }
                    
                    colIdx += colspan;
                });
                
                // 检查是否是新的SKC
                if (currentRowSKC !== currentSKC) {
                    currentSKC = currentRowSKC;
                    skcStartRow = rowIdx;
                    skcCount = 0;
                }
                
                // 保存当前行数据，用于可能的后续行
                previousRowData = [...currentRow];
            }
            
            // 只添加非空行（避免空行问题）
            if (!currentRow.every(cell => cell === '')) {
                dataMatrix.push(currentRow);
            }
        });
        
        // 处理最后一组相同SKC的行
        if (skcStartRow !== -1 && skcCount > 0) {
            // 合并款式图片列（第0列）
            merges.push({
                s: { r: skcStartRow + 1, c: 0 }, // +1 因为第一行是表头
                e: { r: skcStartRow + skcCount + 1, c: 0 }
            });
            // 合并款号skc列（第1列）
            merges.push({
                s: { r: skcStartRow + 1, c: 1 },
                e: { r: skcStartRow + skcCount + 1, c: 1 }
            });
            // 合并件数合计列（第4列）
            merges.push({
                s: { r: skcStartRow + 1, c: 4 },
                e: { r: skcStartRow + skcCount + 1, c: 4 }
            });
        }
        
        // 创建工作表
        const worksheet = XLSX.utils.aoa_to_sheet(dataMatrix);
        
        // 应用合并单元格，使相同SKC的行合并SKC和图片列
        if (merges.length > 0) {
            worksheet['!merges'] = merges;
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, tabTitle);
    }

    // 生成Excel文件
    const filename = `${tabTitle}_${timestamp.replace(/[:\/]/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, filename);
}

// 获取单元格边框样式
function getBorder() {
    return {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };
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