// 上传功能模块
const UploadModule = (function() {
    'use strict';

    let uploadedFiles = {
        clearance: null,
        regular: null
    };
    let uploadedData = [];

    // 初始化上传功能
    function init() {
        bindUploadEvents();
    }

    // 绑定上传事件
    function bindUploadEvents() {
        // 欢迎页面导入数据按钮
        $('#start-upload').on('click', function() {
            showUploadModal();
        });

        // 尾货货盘按钮点击事件
        $('#file-btn-clearance').on('click', function() {
            $('#file-input-clearance').click();
        });

        // 尾货货盘文件选择变化事件
        $('#file-input-clearance').on('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFiles.clearance = e.target.files[0];
                showFileInfo('clearance', uploadedFiles.clearance);
                checkParseButton();
            }
        });

        // 正价货盘按钮点击事件
        $('#file-btn-regular').on('click', function() {
            $('#file-input-regular').click();
        });

        // 正价货盘文件选择变化事件
        $('#file-input-regular').on('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFiles.regular = e.target.files[0];
                showFileInfo('regular', uploadedFiles.regular);
                checkParseButton();
            }
        });

        // 解析数据按钮
        $('#parse-data').on('click', function() {
            parseFileData();
        });

        // 重置选择按钮
        $('#reset-upload').on('click', function() {
            resetUploadState();
        });

        // 关闭弹窗按钮
        $('#close-modal').on('click', function() {
            closeUploadModal();
        });

        // 点击弹窗背景关闭
        $('#upload-modal').on('click', function(e) {
            if (e.target === this) {
                closeUploadModal();
            }
        });
    }

    // 显示上传弹窗
    function showUploadModal() {
        // 直接显示上传弹窗，不显示确认提示
        $('#upload-modal').show();
        resetUploadState();
    }

    // 关闭上传弹窗
    function closeUploadModal() {
        $('#upload-modal').hide();
        resetUploadState();
    }

    // 重置上传状态
    function resetUploadState() {
        uploadedFiles = {
            clearance: null,
            regular: null
        };
        $('#parse-data').prop('disabled', true);
        $('#file-info-clearance').text('未选择尾货文件');
        $('#file-info-regular').text('未选择正价文件');
        $('#file-input-clearance').val('');
        $('#file-input-regular').val('');
    }

    // 显示文件信息
    function showFileInfo(type, file) {
        const fileInfoId = `#file-info-${type}`;
        const typeName = type === 'clearance' ? '尾货文件' : '正价文件';
        $(fileInfoId).html(`
            <strong>${typeName}:</strong> ${file.name}
        `);
    }

    // 检查是否启用解析按钮
    function checkParseButton() {
        // 只要至少选择了一个文件，就启用解析按钮
        const hasFile = uploadedFiles.clearance || uploadedFiles.regular;
        $('#parse-data').prop('disabled', !hasFile);
    }

    // 解析文件数据
    function parseFileData() {
        // 检查是否选择了文件
        if (!uploadedFiles.clearance && !uploadedFiles.regular) {
            Utils.showMessage('请至少选择一个Excel文件', 'error');
            return;
        }

        Utils.showMessage('正在解析数据...', 'info');
        
        // 存储所有解析的数据
        let allData = [];
        let filesToProcess = [];
        
        // 收集需要处理的文件
        if (uploadedFiles.clearance) {
            filesToProcess.push({ file: uploadedFiles.clearance, type: 'clearance', name: '尾货表' });
        }
        if (uploadedFiles.regular) {
            filesToProcess.push({ file: uploadedFiles.regular, type: 'regular', name: '正价表' });
        }
        
        let processedCount = 0;
        const totalFiles = filesToProcess.length;
        
        // 逐个处理文件
        filesToProcess.forEach((fileInfo, index) => {
            Utils.readFileByType(fileInfo.file, function(error, data) {
                if (error) {
                    Utils.showMessage(`${fileInfo.name}文件解析失败: ${error.message}`, 'error');
                    processedCount++;
                    checkAllFilesProcessed();
                    return;
                }

                // 验证数据字段
                if (!Utils.validateDataFields(data)) {
                    Utils.showMessage(`${fileInfo.name}文件格式不正确，请检查字段是否完整`, 'error');
                    processedCount++;
                    checkAllFilesProcessed();
                    return;
                }

                // 处理数据
                const processedData = processUploadedData(data, fileInfo.type, fileInfo.name);
                
                if (processedData.length === 0) {
                    Utils.showMessage(`${fileInfo.name}未找到有效数据，请检查文件内容`, 'warning');
                } else {
                    allData = allData.concat(processedData);
                    Utils.showMessage(`${fileInfo.name}解析成功，共 ${processedData.length} 条有效记录`, 'success');
                }
                
                processedCount++;
                checkAllFilesProcessed();
            });
        });
        
        function checkAllFilesProcessed() {
            if (processedCount === totalFiles) {
                if (allData.length > 0) {
                    // 所有文件处理完成，显示商品列表
                    uploadedData = allData;
                    closeUploadModal();
                    showProductList();
                    
                    // 显示总数据条数
                    Utils.showMessage(`数据解析完成，共导入 ${allData.length} 条有效记录`, 'success');
                    
                    // 更新筛选区域的文件信息
                    updateFilterInfoWithCounts();
                } else {
                    Utils.showMessage('所有文件均未找到有效数据，请检查文件内容', 'warning');
                }
            }
        }
    }

    // 更新筛选区域的文件信息
    function updateFilterInfoWithCounts() {
        const clearanceCount = uploadedData.filter(item => item.type === '尾货表').length;
        const regularCount = uploadedData.filter(item => item.type === '正价表').length;
        
        let infoHtml = '';
        if (clearanceCount > 0) {
            infoHtml += `<strong>尾货数据:</strong> ${clearanceCount} 条<br>`;
        }
        if (regularCount > 0) {
            infoHtml += `<strong>正价数据:</strong> ${regularCount} 条`;
        }
        
        if (infoHtml) {
            $('#filter .file-info').html(infoHtml);
        }
    }

    // 处理上传的数据
    function processUploadedData(data, importType, typeName) {
        return data.map((item, index) => {
            // 为每条数据添加唯一标识和类型
            return {
                ...item,
                id: `${typeName}_${index}_${Date.now()}`,
                type: typeName,
                // 确保数值字段为数字类型
                '库存数量': parseInt(item['库存数量']) || 0,
                '成本价格': parseFloat(item['成本价格']) || 0,
                '预计售价(人民币)': parseFloat(item['预计售价(人民币)']) || 0,
                '预计售价(美元)': parseFloat(item['预计售价(美元)']) || 0
            };
        }).filter(item => item['款号skc']); // 过滤掉没有款号的数据
    }

    // 显示商品列表
    function showProductList() {
        // 按款号分组数据
        const groupedData = groupProductsBySKC(uploadedData);
        
        // 存储优化后的分组数据
        Utils.setDataStore('productData', groupedData);
        
        // 隐藏欢迎页面
        $('#welcome').hide();
        
        // 初始化筛选器
        initializeFilters(uploadedData);
        
        // 显示商品浏览区域
        $('#filter, #products').show();
        
        // 清空心愿清单（每次新导入数据后清零）
        
        // 显示所有商品（使用优化后的分组数据）
        ProductsModule.displayProducts(groupedData);
        
        // 输出到控制台
        console.log('数据解析完成，按款号分组的数据：', groupedData);
        console.log('款号总数：', groupedData.length);
        console.log('原始数据总数：', uploadedData.length);
        
        // 输出第一个款号的详细结构示例
        if (groupedData.length > 0) {
            const firstGroup = groupedData[0];
            console.log('款号数据结构示例：', {
                skc: firstGroup.skc,
                '商品分类': firstGroup['商品分类'],
                '童装/成人装': firstGroup['童装/成人装'],
                '性别': firstGroup['性别'],
                '季节': firstGroup['季节'],
                '图片链接': firstGroup['图片链接'],
                '成本价格': firstGroup['成本价格'],
                '预计售价(人民币)': firstGroup['预计售价(人民币)'],
                '预计售价(美元)': firstGroup['预计售价(美元)'],
                '所属货盘': firstGroup['所属货盘'],
                '是否纯棉': firstGroup['是否纯棉'],
                sizes: firstGroup.sizes.map(s => ({
                    productCode: s.productCode,
                    size: s.size,
                    '库存数量': s['库存数量'],
                    '所在仓库': s['所在仓库'],
                    '所在仓位': s['所在仓位']
                }))
            });
        }
    }
    
    // 按款号SKC和货盘类型分组商品数据
    function groupProductsBySKC(products) {
        const groups = {};
        
        products.forEach(product => {
            const skc = product['款号skc'];
            if (!skc) return;
            
            // 确保SKC字段统一为字符串格式，避免类型不一致问题
            const skcString = String(skc);
            
            // 确定货盘类型
            const palletType = product.type === '尾货表' ? '尾货' : '正价';
            const groupKey = `${skcString}_${palletType}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    skc: skcString,
                    // 基本信息与skc同级
                    '商品分类': product['商品分类'],
                    '童装/成人装': product['童装/成人装'],
                    '性别': product['性别'],
                    '季节': product['季节'],
                    '图片链接': product['图片链接'] || product['商品图片'], // 修复图片链接读取
                    '成本价格': parseFloat(product['成本价格']) || 0,
                    '预计售价(人民币)': parseFloat(product['预计售价(人民币)']) || 0,
                    '预计售价(美元)': parseFloat(product['预计售价(美元)']) || 0,
                    // 新增字段
                    '所属货盘': palletType, // 根据type字段判断货盘类型
                    '是否纯棉': product['是否纯棉'] || '否', // 是否纯棉字段
                    // 尺寸信息数组
                    sizes: []
                };
            }
            
            // 添加尺寸信息
            const sizes = getAvailableSizes(product);
            const stock = parseInt(product['库存数量']) || 0;
            const productCode = product['商品编码'];
            
            sizes.forEach(size => {
                groups[groupKey].sizes.push({
                    productCode: productCode,
                    size: size,
                    '库存数量': stock,
                    '所在仓库': product['所在仓库'] || '', // 添加所在仓库
                    '所在仓位': product['所在仓位'] || ''  // 添加所在仓位
                });
            });
        });
        
        return Object.values(groups);
    }
    
    // 从分组数据中获取尺码信息（简化版本，用于控制台输出）
    function getSizeInfoFromGroup(group) {
        const sizeMap = {};
        
        // 遍历所有尺寸信息
        group.sizes.forEach(sizeInfo => {
            const size = sizeInfo.size;
            if (!sizeMap[size]) {
                sizeMap[size] = {
                    size: size,
                    totalStock: sizeInfo['库存数量'],
                    productCodes: [sizeInfo.productCode]
                };
            } else {
                sizeMap[size].totalStock += sizeInfo['库存数量'];
                if (!sizeMap[size].productCodes.includes(sizeInfo.productCode)) {
                    sizeMap[size].productCodes.push(sizeInfo.productCode);
                }
            }
        });
        
        return Object.values(sizeMap);
    }
    
    // 获取可用尺码
    function getAvailableSizes(product) {
        const sizeField = product['尺寸'];
        if (!sizeField) return [];
        
        // 假设尺码字段可能是逗号分隔的字符串
        if (typeof sizeField === 'string' && sizeField.includes(',')) {
            return sizeField.split(',').map(s => s.trim()).filter(s => s);
        }
        
        // 如果是单个尺码
        return [sizeField.toString()];
    }

    // 初始化筛选器选项
    function initializeFilters(data) {
        // 使用优化后的分组数据来初始化筛选器
        const groupedData = groupProductsBySKC(data);
        
        // 商品分类筛选
        const categories = [...new Set(groupedData.map(item => item['商品分类']))].filter(Boolean);
        updateSelectOptions('#filter-category', categories);
        
        // 童装/成人装筛选
        const ageGroups = [...new Set(groupedData.map(item => item['童装/成人装']))].filter(Boolean);
        updateSelectOptions('#filter-age', ageGroups);
        
        // 性别筛选
        const genders = [...new Set(groupedData.map(item => item['性别']))].filter(Boolean);
        updateSelectOptions('#filter-gender', genders);
        
        // 季节筛选
        const seasons = [...new Set(groupedData.map(item => item['季节']))].filter(Boolean);
        updateSelectOptions('#filter-season', seasons);
    }

    // 更新下拉选项
    function updateSelectOptions(selector, options) {
        const select = $(selector);
        select.empty().append('<option value="">全部</option>');
        
        options.forEach(option => {
            if (option) {
                select.append(`<option value="${option}">${option}</option>`);
            }
        });
    }

    // 重置上传
    function resetUpload() {
        uploadedData = [];
        currentFile = null;
        importType = '';
        
        // 显示欢迎页面
        $('#welcome').show();
        $('#filter, #products').hide();
        
        // 重置数据存储
        Utils.setDataStore('productData', []);
    }

    // 获取合并的产品数据（优化后的分组数据）
    function getMergedProductData() {
        // 从数据存储中获取优化后的分组数据
        const groupedData = Utils.getDataStore('productData') || [];
        
        // 如果没有分组数据，但原始数据存在，则重新分组
        if (groupedData.length === 0 && uploadedData.length > 0) {
            return groupProductsBySKC(uploadedData);
        }
        
        return groupedData;
    }

    return {
        init,
        resetUpload,
        showUploadModal,
        getMergedProductData
    };
})();