// 工具函数模块
const Utils = (function() {
    'use strict';

    // 数据存储管理
    const dataStore = {
        clearanceData: [],
        regularData: [],
        productData: [],
    
        currentFilter: {}
    };

    // 货币状态管理
    let currentCurrency = 'CNY'; // 默认人民币

    // 获取数据存储
    function getDataStore() {
        return dataStore;
    }

    // 设置数据存储
    function setDataStore(key, data) {
        // 允许动态添加新字段到数据存储
        dataStore[key] = data;
        return true;
    }

    // 读取Excel文件
    function readExcelFile(file, callback) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 获取第一个工作表
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // 处理表头和数据
                const headers = jsonData[0];
                const rows = jsonData.slice(1);
                
                const processedData = rows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
                
                callback(null, processedData);
            } catch (error) {
                callback(error, null);
            }
        };
        
        reader.onerror = function(error) {
            callback(error, null);
        };
        
        reader.readAsArrayBuffer(file);
    }

    // 读取CSV文件
    function readCSVFile(file, callback) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const csvText = e.target.result;
                const lines = csvText.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                const processedData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index] || '';
                    });
                    return obj;
                }).filter(item => Object.keys(item).length > 0);
                
                callback(null, processedData);
            } catch (error) {
                callback(error, null);
            }
        };
        
        reader.onerror = function(error) {
            callback(error, null);
        };
        
        reader.readAsText(file);
    }

    // 根据文件类型读取文件
    function readFileByType(file, callback) {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            readExcelFile(file, callback);
        } else if (fileName.endsWith('.csv')) {
            readCSVFile(file, callback);
        } else {
            callback(new Error('不支持的文件格式'), null);
        }
    }

    // 获取唯一筛选选项
    function getUniqueOptions(data, field) {
        const values = data.map(item => item[field]).filter(value => value);
        return [...new Set(values)];
    }

    // 格式化价格
    function formatPrice(price) {
        if (!price) return '0.00';
        return parseFloat(price).toFixed(2);
    }

    // 获取当前货币
    function getCurrentCurrency() {
        return currentCurrency;
    }

    // 切换货币
    function toggleCurrency() {
        currentCurrency = currentCurrency === 'CNY' ? 'USD' : 'CNY';
        return currentCurrency;
    }

    // 获取货币符号
    function getCurrencySymbol() {
        return currentCurrency === 'CNY' ? '¥' : '$';
    }

    // 获取当前货币对应的价格字段
    function getPriceField() {
        return currentCurrency === 'CNY' ? '预计售价(人民币)' : '预计售价(美元)';
    }



    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 显示消息
    function showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            max-width: 300px;
        `;
        
        document.body.appendChild(messageEl);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 验证数据字段
    function validateDataFields(data) {
        const requiredFields = [
            '图片链接', '款号skc', '商品编码', '尺寸', '所在仓库', 
            '所在仓位', '库存数量', '成本价格', '预计售价(人民币)', 
            '预计售价(美元)', '童装/成人装', '性别', '是否纯棉', '季节', '商品分类'
        ];
        
        if (!data || data.length === 0) {
            return false;
        }
        
        const firstItem = data[0];
        return requiredFields.every(field => firstItem.hasOwnProperty(field));
    }

    // 初始化函数（空函数，保持接口一致性）
    function init() {
        // 工具模块不需要特殊的初始化逻辑
    }

    return {
        init,
        getDataStore,
        setDataStore,
        readFileByType,
        getUniqueOptions,
        formatPrice,
        debounce,
        showMessage,
        validateDataFields,
        getCurrentCurrency,
        toggleCurrency,
        getCurrencySymbol,
        getPriceField
    };
})();