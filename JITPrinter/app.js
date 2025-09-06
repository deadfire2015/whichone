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
            this.sizeToPrintSpecification = null; // 新增：尺码对应印花规格映射表数据

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

            // 初始化条码表下载器
            if (window.BarcodeDownloader) {
                this.barcodeDownloader = new window.BarcodeDownloader(this);
            }

            // 加载尺码对应印花规格映射表
            this.loadSizeToPrintSpecification();

            this.initializeEventListeners();
        }

        /**
         * 加载尺码对应印花规格映射表
         */
        async loadSizeToPrintSpecification() {
            try {
                // 从当前目录加载sizeToPrintSpecification.json文件
                const response = await fetch('sizeToPrintSpecification.json');
                if (!response.ok) {
                    throw new Error('Failed to load sizeToPrintSpecification.json');
                }
                this.sizeToPrintSpecification = await response.json();
                console.log('尺码对应印花规格映射表加载成功');
            } catch (error) {
                console.error('加载尺码对应印花规格映射表失败:', error);
                // 如果加载失败，初始化一个空对象
                this.sizeToPrintSpecification = {
                    version: '1.0',
                    description: '尺码对应印花规格映射表',
                    printSpecifications: []
                };
            }
        }

        /**
         * 根据尺码匹配对应的sizeGroup
         * @param {string} size - 尺码
         * @returns {string} 匹配的sizeGroup
         */
        getSizeGroupBySize(size) {
            if (!this.sizeToPrintSpecification || !this.sizeToPrintSpecification.printSpecifications) {
                return '未知';
            }

            // 尝试精确匹配尺码
            for (const spec of this.sizeToPrintSpecification.printSpecifications) {
                if (spec.sizeArray && spec.sizeArray.includes(size)) {
                    return spec.sizeGroup;
                }
            }

            return '未知';
        }

        /**
         * 处理含有"+"的印花编号，前一个根据尺码判断大小，后一个归为"Small"组
         * @param {string} pattern - 印花编号
         * @param {string} size - 尺码
         * @returns {Array} 包含印花编号和对应sizeGroup的对象数组
         */
        processPatternWithPlus(pattern, size) {
            const result = [];
            const patterns = pattern.split('+');
            
            if (patterns.length > 0) {
                // 第一个印花根据尺码判断大小
                result.push({
                    pattern: patterns[0].trim(),
                    printSize: this.getSizeGroupBySize(size) || '未知'
                });
                
                // 后续的印花都归为"Small"组
                for (let i = 1; i < patterns.length; i++) {
                    result.push({
                        pattern: patterns[i].trim(),
                        printSize: 'Small'
                    });
                }
            }
            
            return result;
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
                
                // 检查数量为0的数据
                const zeroQuantitySkus = [];
                data.forEach(row => {
                    const sku = row[this.fieldNames.sales.sku]?.toString().trim();
                    const quantity = parseInt(row[this.fieldNames.sales.quantity]) || 0;
                    if (quantity === 0 && sku) {
                        zeroQuantitySkus.push(sku);
                    }
                });
                
                // 如果存在数量为0的数据，显示提示
                if (zeroQuantitySkus.length > 0) {
                    // 使用红色样式显示警告信息
                    $status.text(`解析 ${data.length} 条数据成功！\n但存在销量为0的数据`).css('color', '#dc3545').css('font-weight', '500').css('white-space', 'pre-line');
                    
                    // 构建错误信息，每个SKU单独占一行显示
                    const displaySkus = zeroQuantitySkus.slice(0, 10);
                    const moreSkusCount = zeroQuantitySkus.length - displaySkus.length;
                    let errorMessage =  displaySkus.join('\n');
                    if (moreSkusCount > 0) {
                        errorMessage += `\n...等${moreSkusCount}个SKU`;
                    }
                    
                    // 显示错误信息
                    $error.text(errorMessage);
                    
                    this.salesData = data;
                    
                    // 存在销量为0的SKU，不启用预览按钮
                    $('#previewBtn').prop('disabled', true);
                    
                    // 创建或显示复制按钮
                    let $copyZeroSkuBtn = $('#copyZeroSkuBtn');
                    if ($copyZeroSkuBtn.length === 0) {
                        $copyZeroSkuBtn = $('<button>').attr('id', 'copyZeroSkuBtn')
                            .text('复制销量为0的SKU')
                            .addClass('preview-btn')
                            
                        // 将按钮放在salesError的前面，避免被遮挡
                        $('#salesError').after($copyZeroSkuBtn);
                    } else {
                        $copyZeroSkuBtn.show();
                    }
                    
                    // 添加点击事件复制所有销量为0的SKU
                    $copyZeroSkuBtn.off('click').on('click', () => {
                        const allZeroSkus = zeroQuantitySkus.join('\n');
                        navigator.clipboard.writeText(allZeroSkus).then(() => {
                            // 显示复制成功提示
                            const $toast = $('<div>').addClass('toast')
                                .text('复制成功');
                            $('#toastContainer').append($toast);
                            setTimeout(() => {
                                $toast.remove();
                            }, 2000);
                        });
                    });
                } else {
                    $status.text(`解析 ${data.length} 条数据成功！`).addClass('status-success');
                    
                    this.salesData = data;

                    // 保持成功状态显示，不再自动移除

                    // 启用预览按钮
                    $('#previewBtn').prop('disabled', false);
                    
                    // 隐藏复制按钮
                    $('#copyZeroSkuBtn').hide();
                }

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
            // SKU格式解析逻辑：从原始SKU中减去匹配的SKC部分，剩余部分用"-"分隔，左边为尺码，右边为印花号
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
                    pattern: pattern,    // 最后一部分为印花号
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

                // 第二优先级: 印花号
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
                patternCount: 0, // 将在下面计算，统计不同印花大小的规格数量
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

            // 计算不同印花大小的规格数量（印花编码+印花大小的组合数量）
            const patternSizeCombinations = new Set();
            data.forEach(item => {
                let patternItems = [];
                
                // 检查印花编号是否含有"+"
                if (item.pattern.includes('+')) {
                    // 处理含有"+"的印花编号
                    patternItems = this.processPatternWithPlus(item.pattern, item.size);
                } else {
                    // 普通印花编号
                    patternItems.push({
                        pattern: item.pattern,
                        printSize: this.getSizeGroupBySize(item.size) || '未知'
                    });
                }
                
                // 为每个印花编码+印花大小组合添加到集合中
                patternItems.forEach(patternItem => {
                    patternSizeCombinations.add(`${patternItem.pattern}|${patternItem.printSize}`);
                });
            });
            
            // 更新印花种类数量为不同印花大小的规格数量
            summary.patternCount = patternSizeCombinations.size;

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
                        <th>款式图片</th>
                        <th>款号skc</th>
                        <th>印花号</th>
                        <th>尺码</th>
                        <th>数量</th>
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
                '数量': item.quantity,
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
            // 调用外部的条码表下载器处理功能
            if (this.barcodeDownloader && typeof this.barcodeDownloader.downloadBarcodeTable === 'function') {
                // 现在downloadBarcodeTable方法总是使用打印页面逻辑插入sticker
                this.barcodeDownloader.downloadBarcodeTable();
            } else {
                // 降级处理：如果没有外部下载器，则显示错误信息
                this.showToast('条码表下载功能不可用，请刷新页面重试！');
                console.error('BarcodeDownloader模块未正确加载');
            }
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
            
            // 使用统一的Excel下载辅助函数
            const workbook = createExcelWorkbook('空版组单表', exportData, {
                colWidths: [
                    { wch: 20 }, // 商品编码列宽
                    { wch: 10 }  // 数量列宽
                ]
            });
            
            // 下载文件
            const timestamp = new Date().toISOString();
            const fileName = `${this.batchNumber}_空版组单表`;
            downloadExcelFile(workbook, fileName, timestamp);
            
            // 显示成功提示
            this.showToast(`已下载空版组单表，共 ${exportData.length} 条SKU数据！`);
        }

        // 下载选中数据
        downloadSelectedData(selectedData) {
            // 转换数据为工作表格式
            const wsData = selectedData.map(item => ({
                '图片URL': item.imageUrl,
                'SKC': item.skc,
                '印花编码': item.pattern,
                '尺码': item.size,
                '数量': item.quantity,
                '原始SKU': item.originalSku
            }));
            
            // 使用统一的Excel下载辅助函数
            const workbook = createExcelWorkbook('选中数据', wsData);
            
            // 下载文件
            const fileName = `${this.batchNumber}_选中数据`;
            downloadExcelFile(workbook, fileName);
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
                    <td rowspan="${sizeCount}" class="merged-cell">
                        ${group.imageUrl ? `<img src="${this.escapeHtml(group.imageUrl)}" height="${this.displayConfig.imageMaxHeight}" onerror="this.style.display='none'">` : '无'}
                    </td>
                    <td rowspan="${sizeCount}" class="merged-cell">${this.escapeHtml(skc)}</td>`;
                
                // 第一行的尺码和数量
                const firstSize = group.sizes[0];
                skcHtml += `
                    <td>${this.escapeHtml(firstSize.size)}</td>
                    <td>${firstSize.quantity}</td>
                    <td rowspan="${sizeCount}" class="merged-cell">${group.totalQuantity}</td>
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

            // 烫画数量汇总 - 按印花大小和数量分列显示
            let patternHtml = `
                <div class="summary-container">
                    <div>
                        <table>
                            <thead>
                                <tr>
                                        <th>印花图片</th>
                                        <th>印花编码</th>
                                        <th>印花大小</th>
                                        <th>数量</th>
                                    </tr>
                            </thead>
                            <tbody>`;

            // 按印花编码和sizeGroup分组汇总
            const patternPrintSizeGroups = {};
            
            this.processedData.forEach(item => {
                let patternItems = [];
                
                // 检查印花编号是否含有"+"
                if (item.pattern.includes('+')) {
                    // 处理含有"+"的印花编号
                    patternItems = this.processPatternWithPlus(item.pattern, item.size);
                } else {
                    // 普通印花编号
                    patternItems.push({
                        pattern: item.pattern,
                        printSize: this.getSizeGroupBySize(item.size) || '未知'
                    });
                }
                
                // 按处理后的印花编号和sizeGroup分组统计数量
                patternItems.forEach(patternItem => {
                    if (!patternPrintSizeGroups[patternItem.pattern]) {
                        patternPrintSizeGroups[patternItem.pattern] = {};
                    }
                    
                    if (!patternPrintSizeGroups[patternItem.pattern][patternItem.printSize]) {
                        patternPrintSizeGroups[patternItem.pattern][patternItem.printSize] = 0;
                    }
                    patternPrintSizeGroups[patternItem.pattern][patternItem.printSize] += item.quantity || 0;
                });
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

            // 生成显示文本，按要求的格式：每个size:quantity占一行
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
                
                // 第一行显示印花信息、编码、大小和数量
                patternHtml += `<tr>
                    <td rowspan="${displayItems.length}" class="merged-cell">${imagesHtml}</td>
                    <td rowspan="${displayItems.length}" class="merged-cell">${this.escapeHtml(pattern)}</td> 
                    <td>${this.escapeHtml(displayItems[0].printSize)}</td> 
                    <td>${displayItems[0].quantity}</td>
                </tr>`;
                
                // 后续行只显示印花大小和数量
                for (let i = 1; i < displayItems.length; i++) {
                    patternHtml += `<tr>
                        <td>${this.escapeHtml(displayItems[i].printSize)}</td>
                        <td>${displayItems[i].quantity}</td>
                    </tr>`;
                }
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
// 增强版XLSX下载方式，完整保留HTML表格中的所有合并单元格结构
// 统一的表格下载函数，整合所有下载逻辑，确保正确处理合并单元格和所有数据
function downloadWithoutImages($activeTab, tabTitle, timestamp) {
    // 处理表格数据
    const $table = $activeTab.find('table');
    if ($table.length) {
        // 获取表头
        const headers = [];
        $table.find('thead th').each(function() {
            headers.push($(this).text().trim());
        });
        
        // 获取所有行
        const $rows = $table.find('tbody tr');
        const numRows = $rows.length;
        const numCols = headers.length;
        
        // 创建完整的数据矩阵，包含所有行和列
        const dataMatrix = [headers];
        
        // 存储合并单元格信息
        const merges = [];
        
        // 检查是否为空版检货汇总表
        const isSkcSummaryTable = tabTitle === '空版检货汇总' || headers.some(header => header.includes('尺码'));
        
        // 存储每个单元格的实际内容，避免被合并单元格覆盖
        const cellContentMap = new Map();
        
        // 处理每行数据
        $rows.each((rowIdx) => {
            const currentRow = new Array(numCols).fill('');
            const $cells = $($rows[rowIdx]).find('td');
            
            // 记录当前处理到的列索引
            let currentCol = 0;
            
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
                }
                
                // 获取合并信息
                const colspan = parseInt($cell.attr('colspan') || 1);
                const rowspan = parseInt($cell.attr('rowspan') || 1);
                
                // 确保currentCol不超出范围
                if (currentCol >= numCols) {
                    return false;
                }
                
                // 存储单元格内容到映射表中
                cellContentMap.set(`${rowIdx},${currentCol}`, cellContent);
                
                // 填充当前单元格
                currentRow[currentCol] = cellContent;
                
                // 记录合并单元格信息
                if (colspan > 1 || rowspan > 1) {
                    // 计算合并的结束位置，确保不超过表格边界
                    const endRow = Math.min(rowIdx + rowspan, numRows);
                    const endCol = Math.min(currentCol + colspan - 1, numCols - 1);
                    
                    // 添加合并信息
                    merges.push({
                        s: { r: rowIdx + 1, c: currentCol }, // +1 因为第一行是表头
                        e: { r: endRow, c: endCol }
                    });
                }
                
                // 移动到下一个单元格（考虑colspan）
                currentCol += colspan;
            });
            
            // 添加当前行到数据矩阵
            dataMatrix.push(currentRow);
        });
        
        // 特别处理空版检货汇总表，确保所有尺码数据都正确显示
        if (isSkcSummaryTable) {
            // 查找尺码列和数量列的索引
            let sizeColumnIndex = -1;
            let quantityColumnIndex = -1;
            let skcColumnIndex = -1;
            
            headers.forEach((header, index) => {
                if (header.includes('尺码')) {
                    sizeColumnIndex = index;
                } else if (header.includes('数量')) {
                    quantityColumnIndex = index;
                } else if (header.includes('SKC') || header.includes('款号')) {
                    skcColumnIndex = index;
                }
            });
            
            // 如果找到了相关列，确保所有尺码数据都正确显示
            if (sizeColumnIndex !== -1 && quantityColumnIndex !== -1) {
                // 存储最近的非空SKC信息，用于继承
                const recentSkcInfo = new Array(numCols).fill('');
                
                // 遍历所有行，确保尺码列数据完整
                for (let i = 1; i < dataMatrix.length; i++) {
                    // 检查当前行是否有尺码或数量数据
                    const hasSizeOrQuantity = dataMatrix[i][sizeColumnIndex] || dataMatrix[i][quantityColumnIndex];
                    
                    // 如果当前行有SKC信息，更新最近的SKC信息
                    if (skcColumnIndex !== -1 && dataMatrix[i][skcColumnIndex]) {
                        for (let j = 0; j < numCols; j++) {
                            if (dataMatrix[i][j]) {
                                recentSkcInfo[j] = dataMatrix[i][j];
                            }
                        }
                    }
                    
                    // 如果当前行有尺码或数量数据，确保它继承了所有必要的SKC信息
                    if (hasSizeOrQuantity) {
                        for (let j = 0; j < numCols; j++) {
                            // 只填充空的非尺码和非数量列
                            if (!dataMatrix[i][j] && j !== sizeColumnIndex && j !== quantityColumnIndex && recentSkcInfo[j]) {
                                dataMatrix[i][j] = recentSkcInfo[j];
                            }
                        }
                    }
                }
            }
        }
        
        // 使用统一的Excel下载辅助函数
        const workbook = createExcelWorkbook(tabTitle, dataMatrix, {
            merges: merges
        });
        
        // 下载文件
        downloadExcelFile(workbook, tabTitle, timestamp);
    }
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

// 统一的Excel下载辅助函数
function createExcelWorkbook(sheetName, data, options = {}) {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建工作表
    let worksheet;
    if (Array.isArray(data) && Array.isArray(data[0])) {
        // 二维数组数据格式
        worksheet = XLSX.utils.aoa_to_sheet(data);
    } else if (Array.isArray(data)) {
        // 对象数组数据格式
        worksheet = XLSX.utils.json_to_sheet(data);
    } else {
        console.error('数据格式不支持');
        return null;
    }
    
    // 应用合并单元格
    if (options.merges && options.merges.length > 0) {
        worksheet['!merges'] = options.merges;
    }
    
    // 设置列宽
    if (options.colWidths && options.colWidths.length > 0) {
        worksheet['!cols'] = options.colWidths;
    }
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    return workbook;
}

// 统一的文件下载函数
function downloadExcelFile(workbook, fileName, timestamp) {
    // 生成文件名
    const formattedTimestamp = timestamp ? timestamp.replace(/[:.\/]/g, '-') : new Date().toISOString().replace(/[:.\/]/g, '-');
    const fullFileName = `${fileName}_${formattedTimestamp}.xlsx`;
    
    // 下载文件
    XLSX.writeFile(workbook, fullFileName);
    
    return fullFileName;
}