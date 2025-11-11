// 商品展示模块
const ProductsModule = (function() {
    'use strict';

    let currentProducts = [];

    // 初始化商品展示
    function init() {
        bindProductEvents();
        
        // 页面加载时应用显示偏好设置
        $(document).ready(function() {
            // 延迟应用，确保DOM完全加载
            setTimeout(() => {
                applyDisplayPreferences();
            }, 100);
        });
    }

    // 绑定商品事件
    function bindProductEvents() {
        // 使用事件委托处理动态生成的元素
        $(document).on('click', '.size-decrease', function(event) {
            // 阻止浏览器扩展的默认行为
            event.stopPropagation();
            event.preventDefault();
            
            const $this = $(this);
            const size = $this.data('size');
            const $card = $this.closest('.product-card');
            const $input = $card.find(`.size-quantity-input[data-size="${size}"]`);
            const $sizeItem = $this.closest('.size-item');
            const maxStock = parseInt($sizeItem.find('.stock-count').text().replace('库存: ', '').replace('件', '')) || 999;
            
            let currentValue = parseInt($input.val()) || 0;
            if (currentValue > 0) {
                currentValue--;
                $input.val(currentValue);
                
                // 同步减少购物车中对应商品的数量
                const skc = $card.data('skc');
                if (skc && size && typeof WishlistModule !== 'undefined' && WishlistModule.decreaseFromWishlist) {
                    WishlistModule.decreaseFromWishlist(skc, size);
                }
            }
        });

        $(document).on('click', '.size-increase', function() {
            const $this = $(this);
            const size = $this.data('size');
            const $card = $this.closest('.product-card');
            const $input = $card.find(`.size-quantity-input[data-size="${size}"]`);
            const $sizeItem = $this.closest('.size-item');
            
            // 库存检测逻辑
            let maxStock = parseInt($input.attr('max')) || 0;
            
            // 如果max属性获取失败，尝试从文本中解析
            if (maxStock === 0) {
                const stockText = $sizeItem.find('.stock-count').text();
                const maxStockMatch = stockText.match(/库存[：:]?\s*(\d+)\s*件?/);
                maxStock = maxStockMatch ? parseInt(maxStockMatch[1]) : 0;
            }
            
            // 如果文本解析也失败，尝试从商品数据中获取库存
            if (maxStock === 0) {
                const skc = $card.data('skc');
                const product = currentProducts.find(p => {
                    // 将SKC转换为字符串进行比较，确保类型一致
                    const productSKC = String(p['款号skc'] || '');
                    const cardSKC = String(skc || '');
                    return productSKC === cardSKC;
                });
                if (product) {
                    maxStock = parseInt(product['库存数量']) || 0;
                }
            }
            
            // 如果所有方法都失败，使用默认库存值，但库存为0时不允许添加
            if (maxStock === 0) {
                maxStock = 0; // 保持为0，不允许添加
            }
            
            let currentValue = parseInt($input.val()) || 0;
            
            // 检查库存是否大于0
            if (maxStock <= 0) {
                Utils.showMessage('当前尺码库存为0，请选择其他尺码', 'warning');
                return;
            }
            
            if (currentValue < maxStock) {
                currentValue++;
                $input.val(currentValue);
                
                // 调用购物车模块添加商品
                const skc = $card.data('skc');
                
                // 获取完整的商品信息，包括完整的价格字段
                const productInfo = {
                    skc: skc,
                    size: size,
                    quantity: 1,
                    price: getProductPrice($card),
                    image: $card.find('.product-image').attr('src'),
                    category: $card.find('.product-info p').text().trim(),
                    productName: $card.find('h4').text().trim(),
                    stock: maxStock, // 添加库存信息
                    // 添加商品编码、仓库、仓位信息
                    productCode: $sizeItem.data('product-code') || '',
                    warehouse: $sizeItem.data('warehouse') || '',
                    location: $sizeItem.data('location') || '',
                    // 添加完整的价格字段，确保货币切换时能正确获取价格
                    '预计售价(人民币)': getProductPriceFromData(skc, '预计售价(人民币)'),
                    '预计售价(美元)': getProductPriceFromData(skc, '预计售价(美元)')
                };
                
                // 调用购物车模块添加商品
                if (typeof WishlistModule !== 'undefined') {
                    WishlistModule.addToWishlist(productInfo);
                }
            } else {
                Utils.showMessage(`已达到最大库存限制 ${maxStock} 件`, 'warning');
            }
        });

        $(document).on('change', '.size-quantity-input', function() {
            const $this = $(this);
            const size = $this.data('size');
            const $card = $this.closest('.product-card');
            const $sizeItem = $this.closest('.size-item');
            
            // 库存检测
            let maxStock = parseInt($this.attr('max')) || 0;
            
            // 如果max属性获取失败，尝试从文本中解析
            if (maxStock === 0) {
                const stockText = $sizeItem.find('.stock-count').text();
                const maxStockMatch = stockText.match(/库存:\s*(\d+)\s*件/);
                maxStock = maxStockMatch ? parseInt(maxStockMatch[1]) : 0;
            }
            
            let currentValue = parseInt($this.val()) || 0;
            if (currentValue < 0) currentValue = 0;
            if (currentValue > maxStock) currentValue = maxStock;
            
            $this.val(currentValue);
        });


        
        // 尺码点击事件 - 用于选择尺码
        $(document).on('click', '.size-item', function(event) {
            // 防止点击数量选择器时触发尺码点击事件
            if ($(event.target).closest('.size-quantity-selector').length > 0) {
                return;
            }
            
            const $sizeItem = $(this);
            const size = $sizeItem.data('size');
            const maxStock = parseInt($sizeItem.data('max-stock')) || 0;
            
            // 检查库存是否大于0
            if (maxStock <= 0) {
                Utils.showMessage('当前尺码库存为0，请选择其他尺码', 'warning');
                return;
            }
            
            // 获取当前数量
            const $input = $sizeItem.find('.size-quantity-input');
            let currentQuantity = parseInt($input.val()) || 0;
            
            // 如果当前数量小于最大库存，增加1件
            if (currentQuantity < maxStock) {
                currentQuantity++;
                $input.val(currentQuantity);
            } else {
                Utils.showMessage(`已达到最大库存限制 ${maxStock} 件`, 'warning');
            }
        });
    }
    
    // 获取商品价格
    function getProductPrice($card) {
        const priceText = $card.find('.product-price').text();
        // 移除货币符号并提取数字
        const priceMatch = priceText.match(/[\d.,]+/);
        return priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : 0;
    }

    // 从商品数据中获取指定价格字段的值
    function getProductPriceFromData(skc, priceField) {
        if (!currentProducts || currentProducts.length === 0) {
            console.warn('商品数据为空，无法获取价格');
            return 0;
        }
        
        // 查找对应的商品数据
        const product = currentProducts.find(p => {
            const productSKC = String(p.skc || '');
            const targetSKC = String(skc || '');
            return productSKC === targetSKC;
        });
        
        if (product && product[priceField]) {
            const price = parseFloat(product[priceField]);
            console.log('从商品数据获取价格:', { skc, priceField, price });
            return price;
        }
        
        console.warn('未找到商品价格数据:', { skc, priceField });
        return 0;
    }

    // 数量选择器功能 - 用于数量选择
    function handleQuantityChange($card, size, quantity) {
        // 处理数量变化
        console.log('数量变化：', { skc: $card.data('skc'), size, quantity });
    }

    // 显示商品
    function displayProducts(products) {
        // 检查是否是优化后的分组数据（包含sizes数组）
        const isGroupedData = products.length > 0 && products[0].sizes && Array.isArray(products[0].sizes);
        
        let groupedProducts;
        if (isGroupedData) {
            // 已经是优化后的分组数据，直接使用
            groupedProducts = products;
        } else {
            // 如果是原始数据，需要转换为优化后的分组数据
            groupedProducts = groupProductsBySKC(products);
        }
        
        // 确保currentProducts始终使用分组数据，保持数据一致性
        currentProducts = groupedProducts;
        
        const $productGrid = $('#product-grid');
        
        if (groupedProducts.length === 0) {
            $productGrid.html(`
                <div class="text-center">
                    <p style="padding: 2rem; color: #7f8c8d;">没有找到符合条件的商品</p>
                </div>
            `);
            return;
        }
        
        const productsHtml = groupedProducts.map(group => createProductCard(group)).join('');
        $productGrid.html(productsHtml);
        
        // 应用显示偏好设置
        applyDisplayPreferences();
        
        // 调试信息：确认数据一致性
        console.log('displayProducts - 数据一致性检查：', {
            inputProductsLength: products.length,
            isGroupedData: isGroupedData,
            groupedProductsLength: groupedProducts.length,
            currentProductsLength: currentProducts.length,
            firstProductKeys: groupedProducts[0] ? Object.keys(groupedProducts[0]) : []
        });
    }

    // 按款号SKC和货盘类型分组商品数据 - 使用统一的数据结构
    function groupProductsBySKC(products) {
        const groups = {};
        
        products.forEach(product => {
            const skc = product['款号skc'];
            if (!skc) return;
            
            // 根据货盘类型确定分组键（款号+货盘类型）
            const palletType = product.type === '尾货表' ? '尾货' : '正价';
            const groupKey = `${skc}_${palletType}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    skc: skc,
                    // 基本信息与skc同级
                    '商品分类': product['商品分类'],
                    '童装/成人装': product['童装/成人装'],
                    '性别': product['性别'],
                    '季节': product['季节'],
                    '图片链接': product['图片链接'] || product['商品图片'],
                    '成本价格': parseFloat(product['成本价格']) || 0,
                    '预计售价(人民币)': parseFloat(product['预计售价(人民币)']) || 0,
                    '预计售价(美元)': parseFloat(product['预计售价(美元)']) || 0,
                    '所属货盘': palletType,
                    '是否纯棉': product['是否纯棉'] || '否',
                    // 添加库存数量字段，用于备用逻辑
                    '库存数量': parseInt(product['库存数量']) || 0,
                    // 尺寸信息数组
                    sizes: []
                };
            }
            
            // 添加尺寸信息
            const sizes = getAvailableSizes(product);
            // 统一使用库存数量字段
            const stock = parseInt(product['库存数量']) || 0;
            const productCode = product['商品编码'];
            
            sizes.forEach(size => {
                groups[groupKey].sizes.push({
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

    // 创建商品卡片
    function createProductCard(group) {
        // 使用统一的数据结构
        const imageUrl = group['图片链接'] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPue7v+WuouWbvuWDjzwvdGV4dD4KPC9zdmc+';
        
        // 根据当前货币选择对应的价格字段
        const priceField = Utils.getPriceField();
        const price = Utils.formatPrice(group[priceField]);
        const currencySymbol = Utils.getCurrencySymbol();
        
        // 生成商品标签
        const tags = generateProductTags(group);
        
        // 获取所有尺码和库存信息
        const sizeItems = getSizeItemsFromGroup(group);
        
        return `
            <div class="product-card" data-skc="${group.skc}" data-group-id="${group.skc}">
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${group.skc}" class="product-image" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPuWbvuWDj+WKoOi9veWksei0pTwvdGV4dD4KPC9zdmc+'">
                    <div class="product-tags">
                        ${tags}
                    </div>
                </div>
                
                <div class="product-info">
                    <h4 title="${group.skc}">${group.skc}</h4>
                    <p style="color: #7f8c8d; font-size: 0.9rem; margin: 0.25rem 0;">
                        ${group['商品分类']}
                    </p>
                    <div class="product-price">${currencySymbol}${price}</div>
                    
                    <div class="size-stock-info">
                        <h5 style="margin: 1rem 0 0.5rem 0; color: #2c3e50;">尺码选购</h5>
                        <div class="size-grid">
                            ${sizeItems}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 从分组数据中获取尺码项
    function getSizeItemsFromGroup(group) {
        // 使用统一的数据结构，处理sizes数组
        if (group.sizes && group.sizes.length > 0) {
            const sizeMap = {};
            
            // 收集所有尺码和对应的库存信息
            group.sizes.forEach(sizeInfo => {
                const size = sizeInfo.size;
                const stock = parseInt(sizeInfo['库存数量']) || 0;
                
                if (!sizeMap[size]) {
                    sizeMap[size] = {
                        size: size,
                        stock: stock,
                        productCode: sizeInfo.productCode,
                        warehouse: sizeInfo['所在仓库'],
                        location: sizeInfo['所在仓位']
                    };
                } else {
                    // 如果同一个尺码有多个商品编码，累加库存
                    sizeMap[size].stock += stock;
                }
            });
            
            // 生成尺码项HTML
            return group.sizes.map(sizeInfo => `
                <div class="size-item" data-size="${sizeInfo.size}" data-skc="${group.skc}" data-product-id="${group.skc}" data-product-code="${sizeInfo.productCode || ''}" data-warehouse="${sizeInfo['所在仓库'] || ''}" data-location="${sizeInfo['所在仓位'] || ''}">
                    <div class="size-stock-info">
                        <div class="size-label">${sizeInfo.size}</div>
                        <div class="stock-count">库存: ${sizeInfo['库存数量']}件</div>
                    </div>
                    <div class="size-quantity-selector">
                        <button class="size-quantity-btn size-decrease" data-size="${sizeInfo.size}">-</button>
                        <input type="number" class="size-quantity-input" value="0" min="0" max="${sizeInfo['库存数量']}" data-size="${sizeInfo.size}">
                        <button class="size-quantity-btn size-increase" data-size="${sizeInfo.size}">+</button>
                    </div>
                </div>
            `).join('');
        } else {
            // 如果没有sizes数组，使用备用逻辑
            const sizes = getAvailableSizes(group);
            const maxStock = parseInt(group['库存数量']) || 0;
            
            return sizes.map(size => `
                <div class="size-item" data-size="${size}" data-skc="${group.skc}" data-product-id="${group.skc}" data-max-stock="${maxStock}">
                    <div class="size-stock-info">
                        <div class="size-label">${size}</div>
                        <div class="stock-count">库存: ${maxStock}件</div>
                    </div>
                    <div class="size-quantity-selector">
                        <button class="size-quantity-btn size-decrease" data-size="${size}">-</button>
                        <input type="number" class="size-quantity-input" value="0" min="0" max="${maxStock}" data-size="${size}">
                        <button class="size-quantity-btn size-increase" data-size="${size}">+</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 生成商品标签
    function generateProductTags(product) {
        const tags = [];
        
        // 1. 所属货盘标签
        if (product['所属货盘']) {
            const palletClass = product['所属货盘'] === '尾货' ? 'tag-pallet-outlet' : 'tag-pallet-regular';
            tags.push(`<span class="product-tag ${palletClass}">${product['所属货盘']}</span>`);
        }
        
        // 2. 童装/成人装标签
        if (product['童装/成人装'] === '成人装') {
            tags.push('<span class="product-tag tag-adult">成人装</span>');
        } else if (product['童装/成人装'] === '童装') {
            tags.push('<span class="product-tag tag-kids">童装</span>');
        }
        
        // 3. 季节标签
        if (product['季节']) {
            tags.push(`<span class="product-tag tag-season">${product['季节']}</span>`);
        }
        
        // 4. 是否纯棉标签
        if (product['是否纯棉'] === '是') {
            tags.push('<span class="product-tag tag-cotton">纯棉</span>');
        }
        
        // 5. 性别标签
        if (product['性别']) {
            tags.push(`<span class="product-tag tag-gender">${product['性别']}</span>`);
        }
        
        return tags.join('');
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





    // 本地存储管理函数
    const DisplayPreferences = {
        // 默认显示设置
        defaultPreferences: {
            showTags: true,       // 默认显示标签
            showSKC: true,        // 默认显示款号
            showCategory: true    // 默认显示商品分类
        },

        // 获取显示偏好设置
        getPreferences() {
            try {
                const stored = localStorage.getItem('productDisplayPreferences');
                if (stored) {
                    return { ...this.defaultPreferences, ...JSON.parse(stored) };
                }
            } catch (error) {
                console.warn('读取显示偏好设置失败:', error);
            }
            return this.defaultPreferences;
        },

        // 保存显示偏好设置
        savePreferences(preferences) {
            try {
                localStorage.setItem('productDisplayPreferences', JSON.stringify(preferences));
                return true;
            } catch (error) {
                console.warn('保存显示偏好设置失败:', error);
                return false;
            }
        },

        // 更新单个偏好设置
        updatePreference(key, value) {
            const preferences = this.getPreferences();
            preferences[key] = value;
            return this.savePreferences(preferences);
        }
    };

    // 切换按钮点击事件处理
    function handleToggleClick(event) {
        const switchControl = event.currentTarget.closest('.switch-control');
        const checkbox = switchControl.querySelector('.switch-input');
        const toggleType = switchControl.dataset.toggleType;
        
        // 切换checkbox状态
        checkbox.checked = !checkbox.checked;
        const newState = checkbox.checked;
        
        // 更新状态显示
        updateSwitchStatus(switchControl, newState);
        
        // 更新本地存储
        DisplayPreferences.updatePreference(toggleType, newState);
        
        // 应用显示/隐藏效果
        applyDisplayPreferences();
    }

    // 应用显示偏好设置
    function applyDisplayPreferences() {
        const preferences = DisplayPreferences.getPreferences();
        
        // 控制所有商品卡片的标签显示
        $('.product-tags').toggle(preferences.showTags);
        
        // 控制所有商品卡片的款号显示
        $('.product-card h4').toggle(preferences.showSKC);
        
        // 控制所有商品卡片的商品分类显示
        $('.product-card .product-info p').toggle(preferences.showCategory);
        
        // 更新切换按钮状态
        updateToggleButtons(preferences);
    }

    // 更新Switch控件状态
    function updateSwitchStatus(switchControl, isActive) {
        const checkbox = switchControl.querySelector('.switch-input');
        const statusText = switchControl.querySelector('.switch-status');
        
        checkbox.checked = isActive;
        statusText.textContent = isActive ? '已显示' : '已隐藏';
    }

    // 更新切换按钮状态
    function updateToggleButtons(preferences) {
        $('.switch-control').each(function() {
            const $switch = $(this);
            const toggleType = $switch.data('toggle-type');
            const isActive = preferences[toggleType];
            
            updateSwitchStatus(this, isActive);
        });
    }

    // 获取当前显示的商品
    function getCurrentProducts() {
        return currentProducts;
    }

    // 重置所有商品卡片的尺码数量输入框为0
    function resetAllProductQuantityInputs() {
        $('.size-quantity-input').each(function() {
            $(this).val(0);
        });
    }

    return {
        init,
        displayProducts,
        getCurrentProducts,
        applyDisplayPreferences,
        handleToggleClick,
        updateToggleButtons,
        DisplayPreferences,
        resetAllProductQuantityInputs
    };
})();