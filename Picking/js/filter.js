// 筛选功能模块
const FilterModule = (function() {
    'use strict';

    let currentFilter = {
        sizes: [],
        age: [],
        gender: [],
        season: [],
        category: [],
        stockMin: null,
        stockMax: null,
        searchKeyword: ''
    };
    let allProducts = [];

    // 初始化筛选功能
    function init() {
        bindFilterEvents();
        initMobileFilter();
        loadFilterOptions();
    }

    // 初始化移动端筛选功能
    function initMobileFilter() {
        // 移动端搜索按钮点击事件 - 显示筛选弹窗
        $('#nav-search').on('click', function() {
            // 检查是否为移动端
            if ($(window).width() <= 768) {
                // 移动端：显示筛选弹窗
                loadMobileFilterOptions();
                $('#mobile-filter-modal').show();
            } else {
                // 桌面端：保持原来的搜索功能
                if (typeof ModalModule !== 'undefined' && typeof ModalModule.showSearchModal === 'function') {
                    ModalModule.showSearchModal();
                }
            }
        });

        // 移动端筛选弹窗关闭
        $('.mobile-filter-close').on('click', function() {
            $('#mobile-filter-modal').hide();
        });

        // 移动端筛选应用
        $('.mobile-filter-apply').on('click', function() {
            updateCurrentFilter();
            applyFilters();
            $('#mobile-filter-modal').hide();
        });

        // 移动端筛选重置
        $('.mobile-filter-reset').on('click', function() {
            resetMobileFilters();
            updateCurrentFilter();
            applyFilters();
            $('#mobile-filter-modal').hide();
        });

        // 移动端复选框筛选事件
        $('#mobile-filter-modal .checkbox-group input[type="checkbox"]').on('change', function() {
            updateCurrentFilter();
            applyFilters();
        });

        // 移动端库存范围筛选事件
        $('#mobile-filter-stock-min, #mobile-filter-stock-max').on('input', function() {
            updateCurrentFilter();
            applyFilters();
        });



        // 点击弹窗外部关闭
        $('#mobile-filter-modal').on('click', function(e) {
            if (e.target === this) {
                $(this).hide();
            }
        });
    }

    // 加载筛选选项
    function loadFilterOptions() {
        // 即使allProducts为空，也加载固定选项（童装/成人装、性别、季节）
        
        // 加载童装/成人装选项（固定选项）
        loadAgeOptions();
        
        // 加载性别选项（固定选项）
        loadGenderOptions();
        
        // 加载季节选项（固定选项）
        loadSeasonOptions();
        
        // 只有allProducts不为空时才加载动态选项
        if (allProducts.length === 0) return;

        // 加载尺码选项
        loadSizeOptions();
        
        // 加载商品分类选项
        loadCategoryOptions();
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

    // 按款号SKC分组商品数据
    function groupProductsBySKC(products) {
        const groups = {};
        
        products.forEach(product => {
            const skc = product['款号skc'];
            if (!skc) return;
            
            // 确保SKC字段统一为字符串格式，避免类型不一致问题
            const skcString = String(skc);
            
            if (!groups[skcString]) {
                groups[skcString] = {
                    skc: skcString,
                    // 基本信息与skc同级
                    '商品分类': product['商品分类'],
                    '童装/成人装': product['童装/成人装'],
                    '性别': product['性别'],
                    '季节': product['季节'],
                    '图片链接': product['图片链接'],
                    '成本价格': parseFloat(product['成本价格']) || 0,
                    '预计售价(人民币)': parseFloat(product['预计售价(人民币)']) || 0,
                    '预计售价(美元)': parseFloat(product['预计售价(美元)']) || 0,
                    '所属货盘': product.type === '尾货表' ? '尾货' : '正价',
                    '是否纯棉': product['是否纯棉'] || '否',
                    // 尺寸信息数组
                    sizes: []
                };
            }
            
            // 添加尺寸信息
            const sizes = getAvailableSizes(product);
            const stock = parseInt(product['库存数量']) || 0;
            const productCode = product['商品编码'];
            
            sizes.forEach(size => {
                groups[skc].sizes.push({
                    productCode: productCode,
                    size: size,
                    '库存数量': stock,
                    '所在仓库': product['所在仓库'] || '',
                    '所在仓位': product['所在仓位'] || ''
                });
            });
        });
        
        return Object.values(groups);
    }

    // 加载尺码选项
    function loadSizeOptions() {
        const sizeSet = new Set();
        
        allProducts.forEach(product => {
            // 检查是否有sizes数组（新数据结构）
            if (product.sizes && Array.isArray(product.sizes)) {
                // 新数据结构：从sizes数组中提取size字段
                product.sizes.forEach(sizeInfo => {
                    if (sizeInfo.size && sizeInfo.size.trim()) {
                        sizeSet.add(sizeInfo.size.trim());
                    }
                });
            } else if (product.sizes && typeof product.sizes === 'object') {
                // 旧数据结构：从sizes对象中提取键
                Object.keys(product.sizes).forEach(size => {
                    if (size && size.trim()) {
                        sizeSet.add(size.trim());
                    }
                });
            } else {
                // 单个商品：使用尺寸字段
                const sizes = getAvailableSizes(product);
                sizes.forEach(size => {
                    if (size && size.trim()) {
                        sizeSet.add(size.trim());
                    }
                });
            }
        });
        
        const sizes = Array.from(sizeSet).sort();
        const sizeContainer = $('#filter-sizes');
        sizeContainer.empty();
        
        sizes.forEach(size => {
            const checkboxId = `filter-size-${size.replace(/[^a-zA-Z0-9]/g, '-')}`;
            sizeContainer.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${size}">
                    <label for="${checkboxId}">${size}</label>
                </div>
            `);
        });
    }

    // 加载商品分类选项
    function loadCategoryOptions() {
        const categories = [...new Set(allProducts.map(p => p['商品分类']))].filter(Boolean);
        const container = $('#filter-category');
        container.empty();
        
        categories.forEach(category => {
            const checkboxId = `filter-category-${category.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${category}">
                    <label for="${checkboxId}">${category}</label>
                </div>
            `);
        });
    }

    // 加载童装/成人装选项
    function loadAgeOptions() {
        const container = $('#filter-age');
        container.empty();
        
        // 固定选项：童装和成人装
        const ageOptions = ['童装', '成人装'];
        
        ageOptions.forEach(age => {
            const checkboxId = `filter-age-${age.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${age}">
                    <label for="${checkboxId}">${age}</label>
                </div>
            `);
        });
    }

    // 加载性别选项
    function loadGenderOptions() {
        const container = $('#filter-gender');
        container.empty();
        
        // 固定选项：男和女
        const genderOptions = ['男', '女'];
        
        genderOptions.forEach(gender => {
            const checkboxId = `filter-gender-${gender.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${gender}">
                    <label for="${checkboxId}">${gender}</label>
                </div>
            `);
        });
    }

    // 加载季节选项
    function loadSeasonOptions() {
        const container = $('#filter-season');
        container.empty();
        
        // 固定选项：春夏和秋冬
        const seasonOptions = ['春夏', '秋冬'];
        
        seasonOptions.forEach(season => {
            const checkboxId = `filter-season-${season.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${season}">
                    <label for="${checkboxId}">${season}</label>
                </div>
            `);
        });
    }

    // 加载移动端筛选选项
    function loadMobileFilterOptions() {
        // 即使allProducts为空，也加载固定选项（童装/成人装、性别、季节）
        
        // 加载移动端童装/成人装选项（固定选项）
        loadMobileAgeOptions();
        
        // 加载移动端性别选项（固定选项）
        loadMobileGenderOptions();
        
        // 加载移动端季节选项（固定选项）
        loadMobileSeasonOptions();
        
        // 只有allProducts不为空时才加载动态选项
        if (allProducts.length === 0) return;

        // 加载移动端尺码选项
        loadMobileSizeOptions();
        
        // 加载移动端商品分类选项
        loadMobileCategoryOptions();
    }

    // 加载移动端尺码选项
    function loadMobileSizeOptions() {
        const sizeSet = new Set();
        
        allProducts.forEach(product => {
            if (product.sizes) {
                Object.keys(product.sizes).forEach(size => {
                    if (size && size.trim()) {
                        sizeSet.add(size.trim());
                    }
                });
            }
        });
        
        const sizes = Array.from(sizeSet).sort();
        const sizeContainer = $('#mobile-filter-sizes');
        sizeContainer.empty();
        
        sizes.forEach(size => {
            const checkboxId = `mobile-filter-size-${size.replace(/[^a-zA-Z0-9]/g, '-')}`;
            sizeContainer.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${size}">
                    <label for="${checkboxId}">${size}</label>
                </div>
            `);
        });
    }

    // 加载移动端商品分类选项
    function loadMobileCategoryOptions() {
        const categories = [...new Set(allProducts.map(p => p['商品分类']))].filter(Boolean);
        const container = $('#mobile-filter-category');
        container.empty();
        
        categories.forEach(category => {
            const checkboxId = `mobile-filter-category-${category.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${category}">
                    <label for="${checkboxId}">${category}</label>
                </div>
            `);
        });
    }

    // 加载移动端童装/成人装选项
    function loadMobileAgeOptions() {
        const container = $('#mobile-filter-age');
        container.empty();
        
        // 固定选项：童装和成人装
        const ageOptions = ['童装', '成人装'];
        
        ageOptions.forEach(age => {
            const checkboxId = `mobile-filter-age-${age.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${age}">
                    <label for="${checkboxId}">${age}</label>
                </div>
            `);
        });
    }

    // 加载移动端性别选项
    function loadMobileGenderOptions() {
        const container = $('#mobile-filter-gender');
        container.empty();
        
        // 固定选项：男和女
        const genderOptions = ['男', '女'];
        
        genderOptions.forEach(gender => {
            const checkboxId = `mobile-filter-gender-${gender.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${gender}">
                    <label for="${checkboxId}">${gender}</label>
                </div>
            `);
        });
    }

    // 加载移动端季节选项
    function loadMobileSeasonOptions() {
        const container = $('#mobile-filter-season');
        container.empty();
        
        // 固定选项：春夏和秋冬
        const seasonOptions = ['春夏', '秋冬'];
        
        seasonOptions.forEach(season => {
            const checkboxId = `mobile-filter-season-${season.replace(/[^a-zA-Z0-9]/g, '-')}`;
            container.append(`
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${season}">
                    <label for="${checkboxId}">${season}</label>
                </div>
            `);
        });
    }

    // 绑定筛选事件
    function bindFilterEvents() {
        // 实时筛选（防抖处理）
        const debouncedFilter = Utils.debounce(applyFilters, 300);
        
        // 复选框筛选事件
        $('.checkbox-group input[type="checkbox"]').on('change', function() {
            updateCurrentFilter();
            debouncedFilter();
        });

        // 库存范围筛选事件
        $('#filter-stock-min, #filter-stock-max').on('input', function() {
            updateCurrentFilter();
            debouncedFilter();
        });

        // 移动端筛选输入事件（已移动到initMobileFilter中）

        // 重置筛选
        $('#reset-filters').on('click', function() {
            resetFilters();
        });
    }

    // 更新当前筛选条件
    function updateCurrentFilter() {
        // 获取选中的尺码（桌面端和移动端合并）
        const selectedSizes = [];
        $('#filter-sizes input[type="checkbox"]:checked, #mobile-filter-sizes input[type="checkbox"]:checked').each(function() {
            selectedSizes.push($(this).val());
        });

        // 获取选中的商品分类（桌面端和移动端合并）
        const selectedCategories = [];
        $('#filter-category input[type="checkbox"]:checked, #mobile-filter-category input[type="checkbox"]:checked').each(function() {
            selectedCategories.push($(this).val());
        });

        // 获取选中的童装/成人装（桌面端和移动端合并）
        const selectedAges = [];
        $('#filter-age input[type="checkbox"]:checked, #mobile-filter-age input[type="checkbox"]:checked').each(function() {
            selectedAges.push($(this).val());
        });

        // 获取选中的性别（桌面端和移动端合并）
        const selectedGenders = [];
        $('#filter-gender input[type="checkbox"]:checked, #mobile-filter-gender input[type="checkbox"]:checked').each(function() {
            selectedGenders.push($(this).val());
        });

        // 获取选中的季节（桌面端和移动端合并）
        const selectedSeasons = [];
        $('#filter-season input[type="checkbox"]:checked, #mobile-filter-season input[type="checkbox"]:checked').each(function() {
            selectedSeasons.push($(this).val());
        });

        // 获取库存范围（桌面端和移动端合并，优先使用移动端）
        let stockMin = $('#mobile-filter-stock-min').val() ? parseInt($('#mobile-filter-stock-min').val()) : null;
        let stockMax = $('#mobile-filter-stock-max').val() ? parseInt($('#mobile-filter-stock-max').val()) : null;
        
        // 如果移动端没有设置，使用桌面端
        if (stockMin === null) {
            stockMin = $('#filter-stock-min').val() ? parseInt($('#filter-stock-min').val()) : null;
        }
        if (stockMax === null) {
            stockMax = $('#filter-stock-max').val() ? parseInt($('#filter-stock-max').val()) : null;
        }

        currentFilter = {
            sizes: [...new Set(selectedSizes)],
            category: [...new Set(selectedCategories)],
            age: [...new Set(selectedAges)],
            gender: [...new Set(selectedGenders)],
            season: [...new Set(selectedSeasons)],
            stockMin: stockMin,
            stockMax: stockMax
        };
        
        // 存储到数据存储
        Utils.setDataStore('currentFilter', currentFilter);
    }

    // 应用筛选
    function applyFilters() {
        const filteredProducts = filterProducts(allProducts, currentFilter);
        ProductsModule.displayProducts(filteredProducts);
        
        // 显示筛选结果统计
        showFilterStats(filteredProducts.length, allProducts.length);
    }

    // 筛选产品
    function filterProducts(products, filter) {
        return products.filter(product => {
            
            // 尺码筛选 - 适配新的数据结构
            if (filter.sizes.length > 0) {
                let hasMatchingSize = false;
                
                // 检查是否有sizes数组（新数据结构）
                if (product.sizes && Array.isArray(product.sizes)) {
                    // 新数据结构：sizes数组包含size字段
                    const productSizes = product.sizes.map(sizeInfo => sizeInfo.size);
                    hasMatchingSize = filter.sizes.some(size => productSizes.includes(size));
                } else if (product.sizes && typeof product.sizes === 'object') {
                    // 旧数据结构：sizes对象
                    const productSizes = Object.keys(product.sizes);
                    hasMatchingSize = filter.sizes.some(size => productSizes.includes(size));
                } else {
                    // 单个商品：使用尺寸字段
                    const sizes = getAvailableSizes(product);
                    hasMatchingSize = filter.sizes.some(size => sizes.includes(size));
                }
                
                if (!hasMatchingSize) {
                    return false;
                }
            }
            
            // 商品分类筛选
            if (filter.category.length > 0 && !filter.category.includes(product['商品分类'])) {
                return false;
            }
            
            // 童装/成人装筛选
            if (filter.age.length > 0 && !filter.age.includes(product['童装/成人装'])) {
                return false;
            }
            
            // 性别筛选
            if (filter.gender.length > 0 && !filter.gender.includes(product['性别'])) {
                return false;
            }
            
            // 季节筛选
            if (filter.season.length > 0 && !filter.season.includes(product['季节'])) {
                return false;
            }
            
            // 库存范围筛选 - 适配新的数据结构
            if (filter.stockMin !== null || filter.stockMax !== null) {
                let totalStock = 0;
                
                // 检查是否有sizes数组（新数据结构）
                if (product.sizes && Array.isArray(product.sizes)) {
                    // 新数据结构：累加sizes数组中所有尺寸的库存
                    totalStock = product.sizes.reduce((sum, sizeInfo) => sum + (parseInt(sizeInfo['库存数量']) || 0), 0);
                } else if (product.sizes && typeof product.sizes === 'object') {
                    // 旧数据结构：累加sizes对象中所有尺寸的库存
                    totalStock = Object.values(product.sizes).reduce((sum, size) => sum + (parseInt(size['库存数量']) || 0), 0);
                } else {
                    // 单个商品：使用库存数量字段
                    totalStock = parseInt(product['库存数量']) || 0;
                }
                
                if (filter.stockMin !== null && totalStock < filter.stockMin) {
                    return false;
                }
                
                if (filter.stockMax !== null && totalStock > filter.stockMax) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // 显示筛选统计
    function showFilterStats(filteredCount, totalCount) {
        // 移除现有的统计信息
        $('.filter-stats').remove();
        
        if (filteredCount !== totalCount) {
            const statsHtml = `
                <div class="filter-stats" style="
                    background: #ecf0f1;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    margin-top: 1rem;
                    font-size: 0.9rem;
                    color: #2c3e50;
                ">
                    筛选结果: <strong>${filteredCount}</strong> / ${totalCount} 件商品
                </div>
            `;
            $('.filter-section').append(statsHtml);
        }
    }

    // 重置筛选
    function resetFilters() {
        // 重置复选框
        $('.checkbox-group input[type="checkbox"]').prop('checked', false);
        
        // 重置输入框
        $('#filter-stock-min, #filter-stock-max').val('');
        
        // 重置移动端筛选
        resetMobileFilters();
        
        // 重置当前筛选条件
        currentFilter = {
            sizes: [],
            category: [],
            age: [],
            gender: [],
            season: [],
            stockMin: null,
            stockMax: null
        };
        
        // 重新显示所有产品
        ProductsModule.displayProducts(allProducts);
        
        // 移除筛选统计
        $('.filter-stats').remove();
        
        // 清除数据存储
        Utils.setDataStore('currentFilter', null);
    }

    // 重置移动端筛选
    function resetMobileFilters() {
        // 重置移动端复选框
        $('#mobile-filter-modal .checkbox-group input[type="checkbox"]').prop('checked', false);
        
        // 重置移动端输入框
        $('#mobile-filter-stock-min, #mobile-filter-stock-max').val('');
        

    }

    // 设置产品数据（支持原始数据和优化后的分组数据）
    function setProducts(products) {
        // 检查是否是优化后的分组数据（包含sizes数组）
        const isGroupedData = products.length > 0 && products[0].sizes && Array.isArray(products[0].sizes);
        
        if (isGroupedData) {
            // 使用优化后的分组数据
            allProducts = products;
        } else {
            // 如果是原始数据，需要转换为优化后的分组数据
            allProducts = groupProductsBySKC(products);
        }
        
        loadFilterOptions();
        
        // 如果有保存的筛选条件，应用它们
        const savedFilter = Utils.getDataStore('currentFilter');
        if (savedFilter) {
            applySavedFilter(savedFilter);
        }
    }

    // 应用保存的筛选条件
    function applySavedFilter(savedFilter) {
        // 设置复选框状态
        savedFilter.sizes.forEach(size => {
            $(`#filter-sizes input[value="${size}"]`).prop('checked', true);
        });
        
        savedFilter.category.forEach(category => {
            $(`#filter-category input[value="${category}"]`).prop('checked', true);
        });
        
        savedFilter.age.forEach(age => {
            $(`#filter-age input[value="${age}"]`).prop('checked', true);
        });
        
        savedFilter.gender.forEach(gender => {
            $(`#filter-gender input[value="${gender}"]`).prop('checked', true);
        });
        
        savedFilter.season.forEach(season => {
            $(`#filter-season input[value="${season}"]`).prop('checked', true);
        });
        
        // 设置输入框值
        if (savedFilter.stockMin) {
            $('#filter-stock-min').val(savedFilter.stockMin);
        }
        
        if (savedFilter.stockMax) {
            $('#filter-stock-max').val(savedFilter.stockMax);
        }
        
        // 应用筛选
        currentFilter = savedFilter;
        applyFilters();
    }

    // 获取当前筛选条件
    function getCurrentFilter() {
        return currentFilter;
    }

    // 获取所有产品
    function getAllProducts() {
        return allProducts;
    }

    // 公开方法
    return {
        init: init,
        setProducts: setProducts,
        getCurrentFilter: getCurrentFilter,
        getAllProducts: getAllProducts
    };
})();