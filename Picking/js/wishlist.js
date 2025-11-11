// 购物车模块
const WishlistModule = (function() {
    let wishlist = [];
    let totalItems = 0;
    let totalPrice = 0;

    // 初始化购物车
    function init() {
        wishlist = [];
        totalItems = 0;
        totalPrice = 0;
        updateBadge();
        
        // 绑定购物车按钮点击事件
        $(document).on('click', '.wishlist-btn', function () {
            showWishlistModal();
        });
        
        // 绑定货币切换事件 - 监听货币切换并更新购物车价格
        $(document).on('currencyChanged', function() {
            console.log('检测到货币切换事件，更新购物车价格显示');
            // 无论弹窗是否打开，都更新购物车数据中的价格字段
            updateWishlistPrices();
            // 如果弹窗打开，更新弹窗内容
            if ($('#wishlist-modal').is(':visible')) {
                updateWishlistModalContent();
            }
        });
    }

    // 添加商品到购物车
    function addToWishlist(productInfo) {
        if (!productInfo || !productInfo.skc || !productInfo.size) return false;
        
        // 检查库存
        const stock = parseInt(productInfo.stock) || 0;
        if (stock <= 0) {
            Utils.showMessage('该商品库存不足', 'error');
            return false;
        }

        // 检查是否已存在相同商品和尺码
        const existingItem = wishlist.find(wish => 
            wish.item.skc === productInfo.skc && wish.size === productInfo.size
        );

        if (existingItem) {
            // 检查库存是否足够
            if (existingItem.quantity >= stock) {
                Utils.showMessage('已达到最大库存数量', 'error');
                return false;
            }
            existingItem.quantity += 1;
        } else {
            wishlist.push({
                item: productInfo,
                size: productInfo.size,
                quantity: 1
            });
        }

        totalItems += 1;
        // 不在这里计算总价，在显示时动态计算
        updateBadge();
        Utils.showMessage('商品已添加到购物车', 'success');
        return true;
    }

    // 从购物车减少商品数量
    function decreaseFromWishlist(skc, size) {
        if (!skc || !size) return false;

        // 查找对应的商品
        const existingItemIndex = wishlist.findIndex(wish => 
            wish.item.skc === skc && wish.size === size
        );

        if (existingItemIndex === -1) {
            return false; // 商品不存在
        }

        const existingItem = wishlist[existingItemIndex];
        
        if (existingItem.quantity > 1) {
            // 如果数量大于1，减少1件
            existingItem.quantity -= 1;
            totalItems -= 1;
        } else {
            // 如果数量为1，从购物车中移除该商品
            wishlist.splice(existingItemIndex, 1);
            totalItems -= 1;
        }

        updateBadge();
        
        // 如果弹窗存在，更新弹窗内容
        if ($('#wishlist-modal').length > 0) {
            updateWishlistModalContent();
        }
        
        return true;
    }

    // 更新购物车徽章
    function updateBadge() {
        const badge = document.querySelector('.wishlist-badge');
        if (badge) {
            badge.textContent = totalItems > 99 ? '99+' : totalItems.toString();
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // 更新购物车中的价格字段（基于当前货币）
    function updateWishlistPrices() {
        console.log('更新购物车价格字段，当前货币:', Utils.getCurrentCurrency());
        
        // 购物车数据本身不存储价格，而是在显示时动态计算
        // 这里主要确保购物车数据中的价格相关字段是最新的
        // 实际的价格显示在updateWishlistModalContent中处理
        
        // 如果弹窗存在，更新弹窗内容
        if ($('#wishlist-modal').length > 0) {
            updateWishlistModalContent();
        }
        
        console.log('购物车价格更新完成');
    }

    // 获取购物车数据
    function getWishlist() {
        return {
            items: [...wishlist],
            totalItems: totalItems,
            totalPrice: totalPrice
        };
    }

    // 清空购物车
    function clearWishlist() {
        wishlist = [];
        totalItems = 0;
        totalPrice = 0;
        updateBadge();
        
        // 如果弹窗存在，更新弹窗内容
        if ($('#wishlist-modal').length > 0) {
            updateWishlistModalContent();
        }
    }

    // 导出购物车数据为Excel
    function exportToExcel() {
        if (wishlist.length === 0) {
            Utils.showMessage('购物车为空，无法导出', 'error');
            return;
        }

        // 使用当前货币计算价格
        const currentCurrency = Utils.getCurrentCurrency();
        const priceField = currentCurrency === 'CNY' ? '预计售价(人民币)' : '预计售价(美元)';

        const data = wishlist.map(wish => {
            const itemPrice = parseFloat(wish.item[priceField] || wish.item.price || 0);
            return {
                '图片链接': wish.item.image || '',
                '款号skc': wish.item.skc,
                '商品编码': wish.item.productCode || '',
                '尺码': wish.size,
                '数量': wish.quantity,
                '所在仓库': wish.item.warehouse || '',
                '所在仓位': wish.item.location || '',
                '单价': itemPrice.toFixed(2),
                '总价': (itemPrice * wish.quantity).toFixed(2)
            };
        });

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // 添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '购物车清单');
        
        // 生成文件名
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `购物车清单_${timestamp}.xlsx`;
        
        // 导出文件
        XLSX.writeFile(wb, filename);
        Utils.showMessage('购物车清单导出成功', 'success');
    }

    // 显示购物车弹窗
    function showWishlistModal() {
        if (wishlist.length === 0) {
            Utils.showMessage('购物车为空', 'info');
            return;
        }

        // 创建弹窗容器（如果不存在）
        if ($('#wishlist-modal').length === 0) {
            // 创建基础弹窗结构，价格内容通过updateWishlistModalContent动态更新
            $('body').append(`
                <div id="wishlist-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-container wishlist-modal-container">
                        <div class="modal-header">
                            <h3>购物车清单</h3>
                            <span class="modal-close">&times;</span>
                        </div>
                        <div class="modal-body wishlist-content">
                            <div class="wishlist-summary">
                                <div class="summary-item">
                                    <span>总件数：</span>
                                    <strong>${totalItems}</strong>
                                </div>
                                <div class="summary-item">
                                    <span>总金额：</span>
                                    <strong id="wishlist-total-price">${Utils.getCurrencySymbol()}0.00</strong>
                                </div>
                            </div>
                            <div class="wishlist-items">
                                <!-- 商品列表将通过updateWishlistModalContent动态生成 -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary clear-wishlist">清空购物车</button>
                            <button class="btn btn-primary export-wishlist">导出Excel</button>
                        </div>
                    </div>
                </div>
            `);

            // 绑定关闭事件
            $('#wishlist-modal .modal-close, #wishlist-modal').on('click', function (e) {
                if (e.target === this || $(e.target).hasClass('modal-close')) {
                    hideWishlistModal();
                }
            });

            // 绑定ESC键关闭
            $(document).on('keydown.wishlist', function (e) {
                if (e.key === 'Escape' && $('#wishlist-modal').is(':visible')) {
                    hideWishlistModal();
                }
            });

            // 绑定清空购物车按钮
            $(document).on('click', '.clear-wishlist', function () {
                if (confirm('确定要清空购物车吗？')) {
                    clearWishlist();
                    hideWishlistModal();
                    Utils.showMessage('购物车已清空', 'success');
                    
                    // 清空购物车后重新加载数据列表
                    if (typeof ProductsModule !== 'undefined' && ProductsModule.displayProducts) {
                        // 获取当前显示的产品数据并重新加载
                        const currentProducts = ProductsModule.getCurrentProducts ? ProductsModule.getCurrentProducts() : [];
                        if (currentProducts.length > 0) {
                            ProductsModule.displayProducts(currentProducts);
                        } else {
                            // 如果没有当前产品数据，尝试从数据存储中获取
                            const productData = Utils.getDataStore('productData') || [];
                            if (productData.length > 0) {
                                ProductsModule.displayProducts(productData);
                            }
                        }
                    }
                }
            });

            // 绑定导出按钮
            $(document).on('click', '.export-wishlist', function () {
                exportToExcel();
                hideWishlistModal();
            });
        }

        // 更新弹窗内容（确保使用当前货币显示价格）
        updateWishlistModalContent();

        // 显示弹窗
        $('#wishlist-modal').fadeIn(300);
        $('#wishlist-modal .modal-container').show();
        $('body').css('overflow', 'hidden');
    }

    // 隐藏购物车弹窗
    function hideWishlistModal() {
        $('#wishlist-modal').fadeOut(300);
        $('body').css('overflow', '');
        $(document).off('keydown.wishlist');
    }

    // 更新购物车弹窗内容
    function updateWishlistModalContent() {
        const $modal = $('#wishlist-modal');
        
        if ($modal.length === 0) {
            console.log('购物车弹窗不存在，跳过更新');
            return;
        }
        
        console.log('更新购物车弹窗内容，当前货币:', Utils.getCurrentCurrency());
        
        // 重新计算总价（基于当前货币）
        const currentCurrency = Utils.getCurrentCurrency();
        const priceField = currentCurrency === 'CNY' ? '预计售价(人民币)' : '预计售价(美元)';
        const currentTotalPrice = wishlist.reduce((sum, wish) => {
            const itemPrice = parseFloat(wish.item[priceField] || wish.item.price || 0);
            return sum + (itemPrice * wish.quantity);
        }, 0);
        
        console.log('购物车总价计算:', {
            currency: currentCurrency,
            priceField: priceField,
            totalPrice: currentTotalPrice,
            itemCount: wishlist.length
        });
        
        // 更新总件数
        $modal.find('.summary-item strong').eq(0).text(totalItems);
        
        // 更新总金额（使用ID选择器确保准确）
        $('#wishlist-total-price').text(Utils.getCurrencySymbol() + currentTotalPrice.toFixed(2));
        
        // 更新商品列表
        const itemsHtml = wishlist.map(wish => {
            const itemPrice = parseFloat(wish.item[priceField] || wish.item.price || 0);
            console.log('商品价格计算:', {
                skc: wish.item.skc,
                priceField: priceField,
                itemPrice: itemPrice
            });
            return `
            <div class="wishlist-item">
                <div class="item-image">
                    <img src="${wish.item.image || 'imgs/shop.png'}" alt="${wish.item.skc}" onerror="this.src='imgs/shop.png'">
                </div>
                <div class="item-info">
                    <div class="item-name">${wish.item.name || wish.item.skc}</div>
                    <div class="item-category">${wish.item.category || ''}</div>
                    <div class="item-size">尺码：${wish.size}</div>
                    <div class="item-quantity">数量：${wish.quantity}</div>
                    <div class="item-price">${Utils.getCurrencySymbol()}${itemPrice.toFixed(2)}</div>
                </div>
            </div>
        `}).join('');
        
        $modal.find('.wishlist-items').html(itemsHtml);
        
        console.log('购物车弹窗内容更新完成');
    }

    return {
        init,
        addToWishlist,
        getWishlist,
        clearWishlist,
        exportToExcel,
        showWishlistModal,
        decreaseFromWishlist
    };
})();